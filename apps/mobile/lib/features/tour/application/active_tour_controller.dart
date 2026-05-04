import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/narration.dart';
import '../../../models/tour.dart';
import '../../../services/narration_service.dart';
import '../../../services/proximity_event_source.dart';
import '../data/tour_repository.dart';
import 'active_tour_state.dart';

class ActiveTourNarrationTrigger {
  static const approaching = 'approaching';
  static const arrived = 'arrived';
  static const departed = 'departed';
  static const manual = 'manual';

  static const allowed = {
    approaching,
    arrived,
    departed,
    manual,
  };
}

class _NarrationLoadResult {
  final Map<String, NarrationPayload> payloadsByKey;
  final String? errorMessage;

  const _NarrationLoadResult({
    required this.payloadsByKey,
    this.errorMessage,
  });
}

class ActiveTourController extends StateNotifier<ActiveTourState> {
  final TourRepository _repository;
  final NarrationService _narrationService;
  final TtsEngine ttsEngine;
  StreamSubscription<ProximityEvent>? _proximitySubscription;
  String? _activeSpeechKey;
  int _speechGeneration = 0;
  bool _disposed = false;

  ActiveTourController(
    this._repository,
    this._narrationService,
    ProximityEventSource? proximityEventSource, {
    TtsEngine? ttsEngine,
  })  : ttsEngine = ttsEngine ?? NoOpTtsEngine(),
        super(ActiveTourState()) {
    _proximitySubscription =
        proximityEventSource?.events.listen(handleProximityEvent);
  }

  Future<void> load(String tourId) async {
    state = ActiveTourState(
      status: ActiveTourStatus.loading,
      tourId: tourId,
    );

    try {
      final tour = await _repository.getTourById(tourId);
      final orderedStops = _orderStops(tour.stops);

      if (orderedStops.isEmpty) {
        state = ActiveTourState(
          status: ActiveTourStatus.error,
          tourId: tour.id,
          tour: tour,
          errorMessage: 'Tour has no stops to drive.',
        );
        return;
      }

      final narrationResult = await _loadNarrationPayloads(tour, orderedStops);

      state = ActiveTourState(
        status: ActiveTourStatus.ready,
        tourId: tour.id,
        tour: tour,
        orderedStops: orderedStops,
        currentStopIndex: 0,
        narrationPayloadsByStopAndTrigger: narrationResult.payloadsByKey,
        narrationLoadAttempted: true,
        narrationErrorMessage: narrationResult.errorMessage,
      );
    } catch (error) {
      state = ActiveTourState(
        status: ActiveTourStatus.error,
        tourId: tourId,
        errorMessage: 'Unable to load tour: ${_describeError(error)}',
      );
    }
  }

  String? narrationTextForCurrentStop(String trigger) {
    final currentStop = state.currentStop;
    if (currentStop == null) {
      return null;
    }

    final payload = _payloadForCurrentStop(trigger, currentStop);
    return payload?.narrationText ??
        _fallbackNarrationText(currentStop, trigger);
  }

  void selectNarrationForCurrentStop(String trigger) {
    final currentStop = state.currentStop;
    final narrationText = narrationTextForCurrentStop(trigger);
    if (currentStop == null || narrationText == null) {
      return;
    }

    final speechKey = _speechKey(
      stop: currentStop,
      trigger: trigger,
      text: narrationText,
    );
    final isDuplicateSpeech = _activeSpeechKey == speechKey;

    state = state.copyWith(
      status: ActiveTourStatus.narrating,
      currentNarrationText: narrationText,
      playbackStatus: ActiveTourPlaybackStatus.speaking,
      playbackErrorMessage: null,
      errorMessage: null,
    );

    if (!isDuplicateSpeech) {
      _speakNarrationText(narrationText, speechKey);
    }
  }

  void clearNarration() {
    if (state.currentNarrationText == null &&
        state.playbackStatus == ActiveTourPlaybackStatus.idle &&
        _activeSpeechKey == null) {
      return;
    }

    _stopSpeech();
    state = state.copyWith(
      status: state.status == ActiveTourStatus.narrating
          ? ActiveTourStatus.driving
          : state.status,
      currentNarrationText: null,
      playbackStatus: ActiveTourPlaybackStatus.stopped,
      playbackErrorMessage: null,
    );
  }

  void stopNarration({bool updateState = true}) {
    if (state.currentNarrationText == null &&
        state.playbackStatus == ActiveTourPlaybackStatus.idle &&
        _activeSpeechKey == null) {
      return;
    }

    _stopSpeech();
    if (!updateState) {
      return;
    }

    state = state.copyWith(
      playbackStatus: ActiveTourPlaybackStatus.stopped,
      playbackErrorMessage: null,
    );
  }

  void replayNarration() {
    final narrationText = state.currentNarrationText;
    if (narrationText == null || narrationText.trim().isEmpty) {
      return;
    }

    state = state.copyWith(
      status: state.hasTour ? ActiveTourStatus.narrating : state.status,
      playbackStatus: ActiveTourPlaybackStatus.speaking,
      playbackErrorMessage: null,
    );
    _speakNarrationText(
      narrationText,
      _manualSpeechKey(narrationText),
    );
  }

  void handleProximityEvent(ProximityEvent event) {
    if (!state.hasTour || state.tourId != event.tourId) {
      return;
    }

    final stopIndex = state.orderedStops.indexWhere(
      (stop) => stop.id == event.tourStopId,
    );
    if (stopIndex == -1) {
      return;
    }

    state = state.copyWith(
      currentStopIndex: stopIndex,
      lastProximityEvent: event,
      errorMessage: null,
    );

    if (event.type == ActiveTourNarrationTrigger.approaching ||
        event.type == ActiveTourNarrationTrigger.arrived) {
      selectNarrationForCurrentStop(event.type);
      return;
    }

    if (event.type == ActiveTourNarrationTrigger.departed) {
      clearNarration();
    }
  }

  void start() {
    if (state.status != ActiveTourStatus.ready || !state.hasTour) {
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.driving,
      currentStopIndex: _clampStopIndex(state.currentStopIndex),
      errorMessage: null,
    );
  }

  void advance() {
    if (!_canMoveWithinLoadedTour) {
      return;
    }

    final stoppedSpeech = _stopSpeech();
    final lastIndex = state.orderedStops.length - 1;
    final currentIndex = _clampStopIndex(state.currentStopIndex);

    if (currentIndex >= lastIndex) {
      state = state.copyWith(
        status: ActiveTourStatus.finished,
        currentStopIndex: lastIndex,
        currentNarrationText: null,
        playbackStatus: ActiveTourPlaybackStatus.stopped,
        playbackErrorMessage: null,
      );
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.driving,
      currentStopIndex: currentIndex + 1,
      currentNarrationText: null,
      playbackStatus: stoppedSpeech
          ? ActiveTourPlaybackStatus.stopped
          : ActiveTourPlaybackStatus.idle,
      playbackErrorMessage: null,
      errorMessage: null,
    );
  }

  void previous() {
    if (!_canMoveWithinLoadedTour) {
      return;
    }

    final stoppedSpeech = _stopSpeech();
    final currentIndex = _clampStopIndex(state.currentStopIndex);
    if (currentIndex == 0) {
      state = state.copyWith(
        currentStopIndex: 0,
        playbackStatus: stoppedSpeech
            ? ActiveTourPlaybackStatus.stopped
            : state.playbackStatus,
        playbackErrorMessage: null,
      );
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.driving,
      currentStopIndex: currentIndex - 1,
      currentNarrationText: null,
      playbackStatus: stoppedSpeech
          ? ActiveTourPlaybackStatus.stopped
          : ActiveTourPlaybackStatus.idle,
      playbackErrorMessage: null,
      errorMessage: null,
    );
  }

  void end() {
    if (!state.hasTour) {
      return;
    }

    _stopSpeech();
    state = state.copyWith(
      status: ActiveTourStatus.finished,
      currentStopIndex: _clampStopIndex(state.currentStopIndex),
      currentNarrationText: null,
      playbackStatus: ActiveTourPlaybackStatus.stopped,
      playbackErrorMessage: null,
      errorMessage: null,
    );
  }

  void reset() {
    _stopSpeech();
    state = ActiveTourState();
  }

  @override
  void dispose() {
    _disposed = true;
    _stopSpeech();
    _proximitySubscription?.cancel();
    _proximitySubscription = null;
    super.dispose();
  }

  bool get _canMoveWithinLoadedTour {
    return state.hasTour &&
        (state.status == ActiveTourStatus.ready ||
            state.status == ActiveTourStatus.driving ||
            state.status == ActiveTourStatus.narrating ||
            state.status == ActiveTourStatus.paused);
  }

  int _clampStopIndex(int index) {
    if (!state.hasTour) {
      return 0;
    }

    if (index < 0) {
      return 0;
    }

    final lastIndex = state.orderedStops.length - 1;
    if (index > lastIndex) {
      return lastIndex;
    }

    return index;
  }

  List<TourStop> _orderStops(List<TourStop> stops) {
    final indexedStops = <({int index, TourStop stop})>[
      for (var index = 0; index < stops.length; index++)
        (index: index, stop: stops[index]),
    ];

    indexedStops.sort((left, right) {
      final orderComparison = left.stop.order.compareTo(right.stop.order);
      if (orderComparison != 0) {
        return orderComparison;
      }
      return left.index.compareTo(right.index);
    });

    return [for (final item in indexedStops) item.stop];
  }

  Future<_NarrationLoadResult> _loadNarrationPayloads(
    Tour tour,
    List<TourStop> orderedStops,
  ) async {
    final validTourStopIds = orderedStops.map((stop) => stop.id).toSet();
    final attachedPayloadsByKey = _payloadsByKey(
      tour.narrationPayloads ?? const [],
      validTourStopIds,
    );

    if (attachedPayloadsByKey.isNotEmpty) {
      return _NarrationLoadResult(payloadsByKey: attachedPayloadsByKey);
    }

    try {
      final fetchedPayloads =
          await _narrationService.fetchTourNarrations(tour.id);
      return _NarrationLoadResult(
        payloadsByKey: _payloadsByKey(fetchedPayloads, validTourStopIds),
      );
    } catch (error) {
      return _NarrationLoadResult(
        payloadsByKey: const {},
        errorMessage: 'Unable to load narrations: ${_describeError(error)}',
      );
    }
  }

  Map<String, NarrationPayload> _payloadsByKey(
    List<NarrationPayload> payloads,
    Set<String> validTourStopIds,
  ) {
    final payloadsByKey = <String, NarrationPayload>{};

    for (final payload in payloads) {
      if (!_isValidNarrationPayload(payload, validTourStopIds)) {
        continue;
      }

      final key = ActiveTourState.narrationPayloadKey(
        tourStopId: payload.tourStopId,
        trigger: payload.trigger,
      );
      payloadsByKey.putIfAbsent(key, () => payload);
    }

    return payloadsByKey;
  }

  bool _isValidNarrationPayload(
    NarrationPayload payload,
    Set<String> validTourStopIds,
  ) {
    return validTourStopIds.contains(payload.tourStopId) &&
        ActiveTourNarrationTrigger.allowed.contains(payload.trigger) &&
        payload.narrationText.trim().isNotEmpty;
  }

  NarrationPayload? _payloadForCurrentStop(
    String trigger,
    TourStop currentStop,
  ) {
    if (trigger == ActiveTourNarrationTrigger.manual) {
      return state.narrationPayloadFor(
            tourStopId: currentStop.id,
            trigger: ActiveTourNarrationTrigger.approaching,
          ) ??
          state.narrationPayloadFor(
            tourStopId: currentStop.id,
            trigger: ActiveTourNarrationTrigger.arrived,
          ) ??
          state.narrationPayloadFor(
            tourStopId: currentStop.id,
            trigger: ActiveTourNarrationTrigger.manual,
          );
    }

    return state.narrationPayloadFor(
      tourStopId: currentStop.id,
      trigger: trigger,
    );
  }

  String _fallbackNarrationText(TourStop stop, String trigger) {
    if (trigger == ActiveTourNarrationTrigger.arrived) {
      return 'Arrived at ${stop.address}.';
    }

    if (trigger == ActiveTourNarrationTrigger.departed) {
      return 'Departed ${stop.address}.';
    }

    return 'Approaching ${stop.address}.';
  }

  String _speechKey({
    required TourStop stop,
    required String trigger,
    required String text,
  }) {
    return '${state.tourId ?? ''}::${stop.id}::$trigger::$text';
  }

  String _manualSpeechKey(String text) {
    final stopKey = state.currentStop?.id ?? 'no-stop';
    return '${state.tourId ?? ''}::$stopKey::${ActiveTourNarrationTrigger.manual}::${_speechGeneration + 1}::$text';
  }

  void _speakNarrationText(String text, String speechKey) {
    _activeSpeechKey = speechKey;
    final generation = ++_speechGeneration;
    unawaited(_speakNarrationTextAsync(text, speechKey, generation));
  }

  Future<void> _speakNarrationTextAsync(
    String text,
    String speechKey,
    int generation,
  ) async {
    try {
      await ttsEngine.stop();
      if (!_isCurrentSpeech(speechKey, generation)) {
        return;
      }

      await ttsEngine.speakText(text);
      if (!_isCurrentSpeech(speechKey, generation)) {
        return;
      }

      _activeSpeechKey = null;
      state = state.copyWith(
        playbackStatus: ActiveTourPlaybackStatus.idle,
        playbackErrorMessage: null,
      );
    } catch (_) {
      if (!_isCurrentSpeech(speechKey, generation)) {
        return;
      }

      _activeSpeechKey = null;
      state = state.copyWith(
        playbackStatus: ActiveTourPlaybackStatus.error,
        playbackErrorMessage: 'Unable to play narration audio.',
      );
    }
  }

  bool _stopSpeech() {
    final shouldStop = _activeSpeechKey != null ||
        ttsEngine.isSpeaking ||
        state.playbackStatus == ActiveTourPlaybackStatus.loading ||
        state.playbackStatus == ActiveTourPlaybackStatus.speaking ||
        state.playbackStatus == ActiveTourPlaybackStatus.error;

    _activeSpeechKey = null;
    if (shouldStop) {
      _speechGeneration += 1;
      unawaited(_stopSpeechBestEffort());
    }

    return shouldStop;
  }

  Future<void> _stopSpeechBestEffort() async {
    try {
      await ttsEngine.stop();
    } catch (_) {
      // Speech stop failures are recoverable and should not block tour controls.
    }
  }

  bool _isCurrentSpeech(String speechKey, int generation) {
    return !_disposed &&
        _activeSpeechKey == speechKey &&
        _speechGeneration == generation;
  }

  String _describeError(Object error) => error.toString();
}

final activeTourControllerProvider =
    StateNotifierProvider<ActiveTourController, ActiveTourState>((ref) {
  return ActiveTourController(
    ref.watch(tourRepositoryProvider),
    ref.watch(narrationServiceProvider),
    ref.watch(proximityEventSourceProvider),
    ttsEngine: ref.watch(ttsEngineProvider),
  );
});
