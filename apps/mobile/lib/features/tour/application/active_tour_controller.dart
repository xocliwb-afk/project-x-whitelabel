import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/tour.dart';
import '../data/tour_repository.dart';
import 'active_tour_state.dart';

class ActiveTourController extends StateNotifier<ActiveTourState> {
  final TourRepository _repository;

  ActiveTourController(this._repository) : super(const ActiveTourState());

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

      state = ActiveTourState(
        status: ActiveTourStatus.ready,
        tourId: tour.id,
        tour: tour,
        orderedStops: orderedStops,
        currentStopIndex: 0,
      );
    } catch (error) {
      state = ActiveTourState(
        status: ActiveTourStatus.error,
        tourId: tourId,
        errorMessage: 'Unable to load tour: ${_describeError(error)}',
      );
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

    final lastIndex = state.orderedStops.length - 1;
    final currentIndex = _clampStopIndex(state.currentStopIndex);

    if (currentIndex >= lastIndex) {
      state = state.copyWith(
        status: ActiveTourStatus.finished,
        currentStopIndex: lastIndex,
        currentNarrationText: null,
        playbackStatus: ActiveTourPlaybackStatus.stopped,
      );
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.driving,
      currentStopIndex: currentIndex + 1,
      currentNarrationText: null,
      playbackStatus: ActiveTourPlaybackStatus.idle,
      errorMessage: null,
    );
  }

  void previous() {
    if (!_canMoveWithinLoadedTour) {
      return;
    }

    final currentIndex = _clampStopIndex(state.currentStopIndex);
    if (currentIndex == 0) {
      state = state.copyWith(currentStopIndex: 0);
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.driving,
      currentStopIndex: currentIndex - 1,
      currentNarrationText: null,
      playbackStatus: ActiveTourPlaybackStatus.idle,
      errorMessage: null,
    );
  }

  void end() {
    if (!state.hasTour) {
      return;
    }

    state = state.copyWith(
      status: ActiveTourStatus.finished,
      currentStopIndex: _clampStopIndex(state.currentStopIndex),
      currentNarrationText: null,
      playbackStatus: ActiveTourPlaybackStatus.stopped,
      errorMessage: null,
    );
  }

  void reset() {
    state = const ActiveTourState();
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

  String _describeError(Object error) => error.toString();
}

final activeTourControllerProvider =
    StateNotifierProvider<ActiveTourController, ActiveTourState>((ref) {
  return ActiveTourController(ref.watch(tourRepositoryProvider));
});
