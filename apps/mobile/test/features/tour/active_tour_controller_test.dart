import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/tour/application/active_tour_controller.dart';
import 'package:project_x_mobile/features/tour/application/active_tour_state.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/narration.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/services/narration_service.dart';
import 'package:project_x_mobile/services/proximity_event_source.dart';

class FakeTourRepository implements TourRepository {
  final Map<String, Tour> tours;
  Object? failure;
  int getCalls = 0;

  FakeTourRepository({
    this.tours = const {},
    this.failure,
  });

  @override
  Future<List<Tour>> listTours() async => tours.values.toList();

  @override
  Future<Tour> getTourById(String id) async {
    getCalls += 1;
    final failure = this.failure;
    if (failure != null) {
      throw failure;
    }

    final tour = tours[id];
    if (tour == null) {
      throw Exception('tour not found');
    }
    return tour;
  }

  @override
  Future<Tour> planTour(PlanTourRequest request) async {
    throw UnimplementedError();
  }

  @override
  Future<Tour> updateTour(
    String id, {
    String? title,
    String? clientName,
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    List<TourStop>? stops,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<void> deleteTour(String id) async {
    throw UnimplementedError();
  }
}

class FakeNarrationService implements NarrationService {
  final Map<String, List<NarrationPayload>> narrationsByTourId;
  Object? failure;
  int fetchCalls = 0;

  FakeNarrationService({
    this.narrationsByTourId = const {},
    this.failure,
  });

  @override
  Future<List<NarrationPayload>> fetchTourNarrations(String tourId) async {
    fetchCalls += 1;
    final failure = this.failure;
    if (failure != null) {
      throw failure;
    }
    return narrationsByTourId[tourId] ?? const [];
  }
}

class FakeTtsEngine implements TtsEngine {
  final bool completeSpeakImmediately;
  int speakCalls = 0;
  int stopCalls = 0;
  Object? speakFailure;
  Object? stopFailure;
  final List<String> calls = [];
  bool _speaking = false;
  Completer<void>? _pendingSpeak;

  FakeTtsEngine({
    this.completeSpeakImmediately = true,
  });

  @override
  Future<void> speak(NarrationPayload payload) async {
    await speakText(payload.narrationText);
  }

  @override
  Future<void> speakText(String text) async {
    calls.add('speak:$text');
    speakCalls += 1;
    final failure = speakFailure;
    if (failure != null) {
      throw failure;
    }
    _speaking = true;
    if (!completeSpeakImmediately) {
      _pendingSpeak = Completer<void>();
      await _pendingSpeak!.future;
    }
    _speaking = false;
  }

  @override
  Future<void> stop() async {
    calls.add('stop');
    stopCalls += 1;
    final failure = stopFailure;
    if (failure != null) {
      throw failure;
    }
    _speaking = false;
  }

  @override
  bool get isSpeaking => _speaking;

  void completeSpeak() {
    final pendingSpeak = _pendingSpeak;
    if (pendingSpeak == null || pendingSpeak.isCompleted) {
      return;
    }
    pendingSpeak.complete();
  }
}

Future<void> flushTtsWork() => pumpEventQueue();

TourStop tourStop(String id, int order) {
  return TourStop(
    id: id,
    listingId: 'listing-$id',
    order: order,
    address: '$id Main Street',
    lat: 42.3314,
    lng: -83.0458,
  );
}

Tour tourWithStops(
  List<TourStop> stops, {
  String id = 'tour-1',
  List<NarrationPayload>? narrationPayloads,
}) {
  return Tour(
    id: id,
    title: 'Planned Tour',
    clientName: 'Client',
    date: '2026-05-03',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    stops: stops,
    narrationPayloads: narrationPayloads,
  );
}

NarrationPayload narrationPayload({
  required TourStop stop,
  String trigger = ActiveTourNarrationTrigger.approaching,
  String? text,
}) {
  return NarrationPayload(
    tourStopId: stop.id,
    listingId: stop.listingId,
    trigger: trigger,
    narrationText: text ?? 'Narration for ${stop.address}',
    listingSummary: NarrationListingSummary(
      address: stop.address,
      price: '',
      beds: null,
      baths: null,
      sqft: null,
    ),
  );
}

ProximityEvent proximityEvent({
  required Tour tour,
  required TourStop stop,
  String type = ActiveTourNarrationTrigger.approaching,
  int distanceMeters = 200,
}) {
  return ProximityEvent(
    tourId: tour.id,
    tourStopId: stop.id,
    listingId: stop.listingId,
    type: type,
    location: ProximityLocation(lat: stop.lat, lng: stop.lng),
    distanceMeters: distanceMeters,
    timestamp: '2026-05-03T00:00:00.000Z',
  );
}

ActiveTourController buildController(
  FakeTourRepository repository, {
  FakeNarrationService? narrationService,
  ProximityEventSource? proximityEventSource,
  TtsEngine? ttsEngine,
}) {
  return ActiveTourController(
    repository,
    narrationService ?? FakeNarrationService(),
    proximityEventSource,
    ttsEngine: ttsEngine,
  );
}

void main() {
  test('ttsEngineProvider defaults to FlutterTtsEngine', () {
    TestWidgetsFlutterBinding.ensureInitialized();
    final container = ProviderContainer();
    addTearDown(container.dispose);

    expect(container.read(ttsEngineProvider), isA<FlutterTtsEngine>());
  });

  test('initial state is idle', () {
    final controller = buildController(FakeTourRepository());

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.hasTour, isFalse);
    expect(controller.state.currentStop, isNull);
  });

  test('successful TTS completion keeps narration visible and marks idle',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(tour: tour, stop: first),
    );
    await flushTtsWork();

    expect(controller.ttsEngine, same(ttsEngine));
    expect(
      controller.state.currentNarrationText,
      'Approaching first Main Street.',
    );
    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching first Main Street.',
    ]);
    expect(ttsEngine.speakCalls, 1);
    expect(ttsEngine.stopCalls, 1);
    expect(ttsEngine.isSpeaking, isFalse);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.idle);
    expect(controller.state.playbackErrorMessage, isNull);
  });

  test('load success enters ready and orders stops by order', () async {
    final tour = tourWithStops([
      tourStop('third', 2),
      tourStop('first', 0),
      tourStop('second-a', 1),
      tourStop('second-b', 1),
    ]);
    final repository = FakeTourRepository(tours: {tour.id: tour});
    final controller = buildController(repository);

    await controller.load(tour.id);

    expect(repository.getCalls, 1);
    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.tourId, tour.id);
    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.orderedStops.map((stop) => stop.id), [
      'first',
      'second-a',
      'second-b',
      'third',
    ]);
  });

  test('load success fetches narrations and stores payloads', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final narration = narrationPayload(
      stop: first,
      text: 'Approaching the first stop.',
    );
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [narration],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(narrationService.fetchCalls, 1);
    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.narrationLoadAttempted, isTrue);
    expect(controller.state.narrationErrorMessage, isNull);
    expect(
      controller.state.narrationPayloadFor(
        tourStopId: first.id,
        trigger: ActiveTourNarrationTrigger.approaching,
      ),
      narration,
    );
  });

  test('attached tour narrations are preferred over endpoint fetch', () async {
    final first = tourStop('first', 0);
    final attachedNarration = narrationPayload(
      stop: first,
      text: 'Attached narration.',
    );
    final tour = tourWithStops(
      [first],
      narrationPayloads: [attachedNarration],
    );
    final narrationService = FakeNarrationService(
      failure: Exception('should not fetch'),
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(narrationService.fetchCalls, 0);
    expect(controller.state.status, ActiveTourStatus.ready);
    expect(
      controller.narrationTextForCurrentStop(
        ActiveTourNarrationTrigger.approaching,
      ),
      'Attached narration.',
    );
  });

  test('narration fetch failure keeps loaded tour ready', () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final narrationService = FakeNarrationService(
      failure: Exception('401 auth required'),
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(narrationService.fetchCalls, 1);
    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.narrationLoadAttempted, isTrue);
    expect(controller.state.narrationErrorMessage, contains('401'));
    expect(controller.state.errorMessage, isNull);
  });

  test('current next and previous stop getters are safe', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
      tourStop('third', 2),
    ]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(controller.state.currentStop?.id, 'first');
    expect(controller.state.nextStop?.id, 'second');
    expect(controller.state.previousStop, isNull);
    expect(controller.state.isFirstStop, isTrue);
    expect(controller.state.isLastStop, isFalse);

    controller.advance();

    expect(controller.state.currentStop?.id, 'second');
    expect(controller.state.nextStop?.id, 'third');
    expect(controller.state.previousStop?.id, 'first');
    expect(controller.state.isFirstStop, isFalse);
    expect(controller.state.isLastStop, isFalse);
  });

  test('approaching trigger selects matching current stop narration', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [
          narrationPayload(
            stop: first,
            text: 'Approaching selected text.',
          ),
        ],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);
    controller.selectNarrationForCurrentStop(
      ActiveTourNarrationTrigger.approaching,
    );

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(controller.state.currentNarrationText, 'Approaching selected text.');
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.speaking);
  });

  test('arrived trigger selects arrived payload when present', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [
          narrationPayload(
            stop: first,
            trigger: ActiveTourNarrationTrigger.arrived,
            text: 'Arrived selected text.',
          ),
        ],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(
      controller
          .narrationTextForCurrentStop(ActiveTourNarrationTrigger.arrived),
      'Arrived selected text.',
    );
  });

  test('arrived trigger falls back to address-only text when missing',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(
      controller
          .narrationTextForCurrentStop(ActiveTourNarrationTrigger.arrived),
      'Arrived at first Main Street.',
    );
  });

  test('manual replay selects best available current stop payload', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [
          narrationPayload(
            stop: first,
            trigger: ActiveTourNarrationTrigger.arrived,
            text: 'Arrived text.',
          ),
          narrationPayload(
            stop: first,
            trigger: ActiveTourNarrationTrigger.approaching,
            text: 'Approaching text.',
          ),
        ],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(
      controller.narrationTextForCurrentStop(ActiveTourNarrationTrigger.manual),
      'Approaching text.',
    );
  });

  test('missing payload falls back to current stop address', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(
      controller.narrationTextForCurrentStop(
        ActiveTourNarrationTrigger.approaching,
      ),
      'Approaching first Main Street.',
    );
  });

  test('selecting narration with no loaded tour is safe', () {
    final controller = buildController(FakeTourRepository());

    controller.selectNarrationForCurrentStop(ActiveTourNarrationTrigger.manual);

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.currentNarrationText, isNull);
    expect(
      controller.narrationTextForCurrentStop(ActiveTourNarrationTrigger.manual),
      isNull,
    );
  });

  test('proximity event with no loaded tour is ignored', () {
    final stop = tourStop('first', 0);
    final tour = tourWithStops([stop]);
    final controller = buildController(FakeTourRepository());

    controller.handleProximityEvent(proximityEvent(tour: tour, stop: stop));

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.lastProximityEvent, isNull);
    expect(controller.state.currentNarrationText, isNull);
  });

  test('proximity event with wrong tour id is ignored', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final otherTour = tourWithStops([first], id: 'other-tour');
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(tour: otherTour, stop: first),
    );

    expect(controller.state.currentStop?.id, first.id);
    expect(controller.state.lastProximityEvent, isNull);
    expect(controller.state.currentNarrationText, isNull);
  });

  test('proximity event with unknown tour stop id is ignored', () async {
    final first = tourStop('first', 0);
    final unknown = tourStop('unknown', 99);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: unknown));

    expect(controller.state.currentStop?.id, first.id);
    expect(controller.state.lastProximityEvent, isNull);
    expect(controller.state.currentNarrationText, isNull);
  });

  test('approaching proximity event selects matching narration', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              text: 'Approaching from proximity.',
            ),
          ],
        },
      ),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(controller.state.lastProximityEvent?.tourStopId, first.id);
    expect(
      controller.state.currentNarrationText,
      'Approaching from proximity.',
    );
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.speaking);
  });

  test('arrived proximity event selects arrived narration when present',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              trigger: ActiveTourNarrationTrigger.arrived,
              text: 'Arrived from proximity.',
            ),
          ],
        },
      ),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(
        tour: tour,
        stop: first,
        type: ActiveTourNarrationTrigger.arrived,
        distanceMeters: 0,
      ),
    );

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(controller.state.lastProximityEvent?.type, 'arrived');
    expect(controller.state.currentNarrationText, 'Arrived from proximity.');
  });

  test('arrived proximity event falls back when payload is missing', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(
        tour: tour,
        stop: first,
        type: ActiveTourNarrationTrigger.arrived,
        distanceMeters: 0,
      ),
    );

    expect(controller.state.lastProximityEvent?.type, 'arrived');
    expect(
        controller.state.currentNarrationText, 'Arrived at first Main Street.');
  });

  test('approaching proximity event speaks selected payload once', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              text: 'Approaching spoken payload.',
            ),
          ],
        },
      ),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching spoken payload.',
    ]);
    expect(ttsEngine.speakCalls, 1);
  });

  test('arrived proximity event speaks selected payload once', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              trigger: ActiveTourNarrationTrigger.arrived,
              text: 'Arrived spoken payload.',
            ),
          ],
        },
      ),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(
        tour: tour,
        stop: first,
        type: ActiveTourNarrationTrigger.arrived,
      ),
    );
    await flushTtsWork();

    expect(ttsEngine.calls, [
      'stop',
      'speak:Arrived spoken payload.',
    ]);
    expect(ttsEngine.speakCalls, 1);
  });

  test('new narration interrupts previous speech before speaking', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();
    controller.handleProximityEvent(
      proximityEvent(
        tour: tour,
        stop: first,
        type: ActiveTourNarrationTrigger.arrived,
      ),
    );
    await flushTtsWork();

    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching first Main Street.',
      'stop',
      'speak:Arrived at first Main Street.',
    ]);
  });

  test('duplicate same event does not stack overlapping speech', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final event = proximityEvent(tour: tour, stop: first);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(event);
    controller.handleProximityEvent(event);
    await flushTtsWork();

    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching first Main Street.',
    ]);
    expect(ttsEngine.speakCalls, 1);
  });

  test('clear before TTS completion is not overwritten by stale completion',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine(completeSpeakImmediately: false);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.speaking);

    controller.clearNarration();
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);

    ttsEngine.completeSpeak();
    await flushTtsWork();

    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('advance before TTS completion is not overwritten by stale completion',
      () async {
    final first = tourStop('first', 0);
    final second = tourStop('second', 1);
    final tour = tourWithStops([first, second]);
    final ttsEngine = FakeTtsEngine(completeSpeakImmediately: false);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.speaking);

    controller.advance();
    expect(controller.state.currentStop?.id, second.id);
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);

    ttsEngine.completeSpeak();
    await flushTtsWork();

    expect(controller.state.currentStop?.id, second.id);
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('TTS speak failure leaves narration visible and marks playback error',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine()
      ..speakFailure = const TtsEngineException('raw plugin failure');
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(
      controller.state.currentNarrationText,
      'Approaching first Main Street.',
    );
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.error);
    expect(
      controller.state.playbackErrorMessage,
      'Unable to play narration audio.',
    );
    expect(controller.state.errorMessage, isNull);
  });

  test('stop narration stops speech and keeps narration visible', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine(completeSpeakImmediately: false);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.speaking);

    controller.stopNarration();
    await flushTtsWork();

    expect(controller.state.currentNarrationText,
        'Approaching first Main Street.');
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
    expect(controller.state.playbackErrorMessage, isNull);
    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching first Main Street.',
      'stop',
    ]);

    controller.dispose();
    ttsEngine.completeSpeak();
    await flushTtsWork();
  });

  test('replay narration speaks current narration text', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    controller.replayNarration();
    await flushTtsWork();

    expect(ttsEngine.calls, [
      'stop',
      'speak:Approaching first Main Street.',
      'stop',
      'speak:Approaching first Main Street.',
    ]);
    expect(ttsEngine.speakCalls, 2);
    expect(controller.state.currentNarrationText,
        'Approaching first Main Street.');
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.idle);
  });

  test('replay narration is safe with no current narration text', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.replayNarration();
    await flushTtsWork();

    expect(ttsEngine.calls, isEmpty);
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.idle);
  });

  test('replay narration failure keeps narration visible and marks error',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final ttsEngine = FakeTtsEngine();
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      ttsEngine: ttsEngine,
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(proximityEvent(tour: tour, stop: first));
    await flushTtsWork();

    ttsEngine.speakFailure = const TtsEngineException('raw plugin failure');
    controller.replayNarration();
    await flushTtsWork();

    expect(controller.state.currentNarrationText,
        'Approaching first Main Street.');
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.error);
    expect(
      controller.state.playbackErrorMessage,
      'Unable to play narration audio.',
    );
  });

  test('proximity event for later stop updates current stop index', () async {
    final first = tourStop('first', 0);
    final second = tourStop('second', 1);
    final tour = tourWithStops([first, second]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(tour: tour, stop: second),
    );

    expect(controller.state.currentStopIndex, 1);
    expect(controller.state.currentStop?.id, second.id);
    expect(
      controller.state.currentNarrationText,
      'Approaching second Main Street.',
    );
  });

  test('proximity event for earlier stop updates current stop index', () async {
    final first = tourStop('first', 0);
    final second = tourStop('second', 1);
    final tour = tourWithStops([first, second]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(tour: tour, stop: second),
    );
    controller.handleProximityEvent(
      proximityEvent(tour: tour, stop: first),
    );

    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.currentStop?.id, first.id);
    expect(
      controller.state.currentNarrationText,
      'Approaching first Main Street.',
    );
  });

  test('duplicate proximity event is deterministic and safe', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final event = proximityEvent(tour: tour, stop: first);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(event);
    controller.handleProximityEvent(event);

    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.lastProximityEvent, event);
    expect(
      controller.state.currentNarrationText,
      'Approaching first Main Street.',
    );
  });

  test('departed proximity event is stored without selecting narration',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.handleProximityEvent(
      proximityEvent(tour: tour, stop: first),
    );
    controller.handleProximityEvent(
      proximityEvent(
        tour: tour,
        stop: first,
        type: ActiveTourNarrationTrigger.departed,
        distanceMeters: 50,
      ),
    );

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.lastProximityEvent?.type, 'departed');
    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('proximity events do not require a TTS engine', () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(
      () => controller.handleProximityEvent(
        proximityEvent(tour: tour, stop: first),
      ),
      returnsNormally,
    );
    expect(controller.state.currentNarrationText, isNotNull);
  });

  test('subscribed proximity source handles emitted approaching event',
      () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              text: 'Approaching from emitted event.',
            ),
          ],
        },
      ),
      proximityEventSource: source,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    source.simulateApproaching(
      tourId: tour.id,
      stop: first,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(controller.state.lastProximityEvent?.type, 'approaching');
    expect(
      controller.state.currentNarrationText,
      'Approaching from emitted event.',
    );
  });

  test('subscribed proximity source handles emitted arrived event', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        narrationsByTourId: {
          tour.id: [
            narrationPayload(
              stop: first,
              trigger: ActiveTourNarrationTrigger.arrived,
              text: 'Arrived from emitted event.',
            ),
          ],
        },
      ),
      proximityEventSource: source,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    source.simulateArrived(
      tourId: tour.id,
      stop: first,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);

    expect(controller.state.status, ActiveTourStatus.narrating);
    expect(controller.state.lastProximityEvent?.type, 'arrived');
    expect(
        controller.state.currentNarrationText, 'Arrived from emitted event.');
  });

  test('subscribed proximity source ignores wrong-tour events', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      proximityEventSource: source,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    source.simulateApproaching(
      tourId: 'wrong-tour',
      stop: first,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);

    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.lastProximityEvent, isNull);
    expect(controller.state.currentNarrationText, isNull);
  });

  test('subscribed proximity source ignores unknown stops', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final unknown = tourStop('unknown', 99);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      proximityEventSource: source,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    source.simulateApproaching(
      tourId: tour.id,
      stop: unknown,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);

    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.lastProximityEvent, isNull);
    expect(controller.state.currentNarrationText, isNull);
  });

  test('subscribed proximity source handles emitted departed event', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      proximityEventSource: source,
    );
    addTearDown(controller.dispose);

    await controller.load(tour.id);
    source.simulateApproaching(
      tourId: tour.id,
      stop: first,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);
    source.emit(proximityEvent(
      tour: tour,
      stop: first,
      type: ActiveTourNarrationTrigger.departed,
    ));
    await Future<void>.delayed(Duration.zero);

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.lastProximityEvent?.type, 'departed');
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('disposing controller cancels proximity source subscription safely',
      () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      proximityEventSource: source,
    );

    await controller.load(tour.id);
    controller.dispose();
    source.simulateApproaching(
      tourId: tour.id,
      stop: first,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    await Future<void>.delayed(Duration.zero);

    expect(source, isA<SimulatedProximityEventSource>());
  });

  test('advance clears selected narration text', () async {
    final first = tourStop('first', 0);
    final second = tourStop('second', 1);
    final tour = tourWithStops([first, second]);
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [
          narrationPayload(
            stop: first,
            text: 'First stop narration.',
          ),
        ],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);
    controller.selectNarrationForCurrentStop(
      ActiveTourNarrationTrigger.approaching,
    );
    controller.advance();

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.currentStop?.id, second.id);
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('clear advance previous end reset and dispose stop active speech',
      () async {
    Future<({ActiveTourController controller, FakeTtsEngine ttsEngine})>
        buildSpeakingController({bool onSecondStop = false}) async {
      final first = tourStop('first', 0);
      final second = tourStop('second', 1);
      final tour = tourWithStops([first, second]);
      final ttsEngine = FakeTtsEngine(completeSpeakImmediately: false);
      final controller = buildController(
        FakeTourRepository(tours: {tour.id: tour}),
        ttsEngine: ttsEngine,
      );

      await controller.load(tour.id);
      controller.start();
      if (onSecondStop) {
        controller.advance();
        await flushTtsWork();
      }
      controller.selectNarrationForCurrentStop(
        ActiveTourNarrationTrigger.approaching,
      );
      await flushTtsWork();
      ttsEngine.calls.clear();
      ttsEngine.speakCalls = 0;
      ttsEngine.stopCalls = 0;
      return (controller: controller, ttsEngine: ttsEngine);
    }

    final clearSetup = await buildSpeakingController();
    clearSetup.controller.clearNarration();
    await flushTtsWork();
    expect(clearSetup.ttsEngine.calls, ['stop']);
    expect(
      clearSetup.controller.state.playbackStatus,
      ActiveTourPlaybackStatus.stopped,
    );
    clearSetup.controller.dispose();
    clearSetup.ttsEngine.completeSpeak();
    await flushTtsWork();

    final advanceSetup = await buildSpeakingController();
    advanceSetup.controller.advance();
    await flushTtsWork();
    expect(advanceSetup.ttsEngine.calls, ['stop']);
    expect(
      advanceSetup.controller.state.playbackStatus,
      ActiveTourPlaybackStatus.stopped,
    );
    advanceSetup.controller.dispose();
    advanceSetup.ttsEngine.completeSpeak();
    await flushTtsWork();

    final previousSetup = await buildSpeakingController(onSecondStop: true);
    previousSetup.controller.previous();
    await flushTtsWork();
    expect(previousSetup.ttsEngine.calls, ['stop']);
    expect(
      previousSetup.controller.state.playbackStatus,
      ActiveTourPlaybackStatus.stopped,
    );
    previousSetup.controller.dispose();
    previousSetup.ttsEngine.completeSpeak();
    await flushTtsWork();

    final endSetup = await buildSpeakingController();
    endSetup.controller.end();
    await flushTtsWork();
    expect(endSetup.ttsEngine.calls, ['stop']);
    expect(
      endSetup.controller.state.playbackStatus,
      ActiveTourPlaybackStatus.stopped,
    );
    endSetup.controller.dispose();
    endSetup.ttsEngine.completeSpeak();
    await flushTtsWork();

    final resetSetup = await buildSpeakingController();
    resetSetup.controller.reset();
    await flushTtsWork();
    expect(resetSetup.ttsEngine.calls, ['stop']);
    expect(resetSetup.controller.state.status, ActiveTourStatus.idle);
    resetSetup.controller.dispose();
    resetSetup.ttsEngine.completeSpeak();
    await flushTtsWork();

    final disposeSetup = await buildSpeakingController();
    disposeSetup.controller.dispose();
    await flushTtsWork();
    expect(disposeSetup.ttsEngine.calls, ['stop']);
    disposeSetup.ttsEngine.completeSpeak();
    await flushTtsWork();
  });

  test('duplicate payloads for same stop and trigger keep the first payload',
      () async {
    final first = tourStop('first', 0);
    final tour = tourWithStops([first]);
    final narrationService = FakeNarrationService(
      narrationsByTourId: {
        tour.id: [
          narrationPayload(stop: first, text: 'First duplicate.'),
          narrationPayload(stop: first, text: 'Second duplicate.'),
        ],
      },
    );
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: narrationService,
    );

    await controller.load(tour.id);

    expect(
      controller.narrationTextForCurrentStop(
        ActiveTourNarrationTrigger.approaching,
      ),
      'First duplicate.',
    );
  });

  test('auth-like narration failure does not enter active tour error',
      () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
      narrationService: FakeNarrationService(
        failure: Exception('ApiException(401 AUTH_REQUIRED): auth required'),
      ),
    );

    await controller.load(tour.id);

    expect(controller.state.status, ActiveTourStatus.ready);
    expect(controller.state.errorMessage, isNull);
    expect(controller.state.narrationErrorMessage, contains('AUTH_REQUIRED'));
  });

  test('empty stop tour enters error', () async {
    final tour = tourWithStops(const []);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(controller.state.status, ActiveTourStatus.error);
    expect(controller.state.errorMessage, contains('no stops'));
    expect(controller.state.currentStop, isNull);
  });

  test('repository failure enters error', () async {
    final controller = buildController(
      FakeTourRepository(failure: Exception('network down')),
    );

    await controller.load('tour-1');

    expect(controller.state.status, ActiveTourStatus.error);
    expect(controller.state.tourId, 'tour-1');
    expect(controller.state.errorMessage, contains('network down'));
  });

  test('start enters driving from ready', () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.currentStop?.id, 'first');
  });

  test('start before load is a safe no-op', () {
    final controller = buildController(FakeTourRepository());

    controller.start();

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.currentStopIndex, 0);
  });

  test('advance moves to next stop', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
    ]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.advance();

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.currentStopIndex, 1);
    expect(controller.state.currentStop?.id, 'second');
  });

  test('advance at final stop enters finished and stays in bounds', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
    ]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.advance();
    controller.advance();
    controller.advance();

    expect(controller.state.status, ActiveTourStatus.finished);
    expect(controller.state.currentStopIndex, 1);
    expect(controller.state.currentStop?.id, 'second');
    expect(controller.state.nextStop, isNull);
    expect(controller.state.isLastStop, isTrue);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('previous at first stop is safe and never goes negative', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
    ]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.previous();
    controller.previous();

    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.currentStop?.id, 'first');
  });

  test('previous from later stop decrements', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
    ]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.advance();
    controller.previous();

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.currentStop?.id, 'first');
  });

  test('end enters finished and clears playback fields', () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.end();

    expect(controller.state.status, ActiveTourStatus.finished);
    expect(controller.state.currentStop?.id, 'first');
    expect(controller.state.currentNarrationText, isNull);
    expect(controller.state.playbackStatus, ActiveTourPlaybackStatus.stopped);
  });

  test('reset returns to idle', () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final controller = buildController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.reset();

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.tour, isNull);
    expect(controller.state.orderedStops, isEmpty);
    expect(controller.state.currentStopIndex, 0);
    expect(controller.state.narrationPayloadsByStopAndTrigger, isEmpty);
  });
}
