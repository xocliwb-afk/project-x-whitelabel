import '../../../models/narration.dart';
import '../../../models/tour.dart';

const _noChange = Object();

enum ActiveTourStatus {
  idle,
  loading,
  ready,
  driving,
  narrating,
  paused,
  finished,
  error,
}

enum ActiveTourPlaybackStatus {
  idle,
  loading,
  speaking,
  paused,
  stopped,
  error,
}

class ActiveTourState {
  final ActiveTourStatus status;
  final String? tourId;
  final Tour? tour;
  final List<TourStop> orderedStops;
  final int currentStopIndex;
  final ProximityEvent? lastProximityEvent;
  final String? currentNarrationText;
  final ActiveTourPlaybackStatus playbackStatus;
  final String? errorMessage;

  const ActiveTourState({
    this.status = ActiveTourStatus.idle,
    this.tourId,
    this.tour,
    this.orderedStops = const [],
    this.currentStopIndex = 0,
    this.lastProximityEvent,
    this.currentNarrationText,
    this.playbackStatus = ActiveTourPlaybackStatus.idle,
    this.errorMessage,
  });

  bool get hasTour => tour != null && orderedStops.isNotEmpty;

  TourStop? get currentStop {
    if (!hasTour || currentStopIndex < 0) {
      return null;
    }
    if (currentStopIndex >= orderedStops.length) {
      return null;
    }
    return orderedStops[currentStopIndex];
  }

  TourStop? get nextStop {
    if (!hasTour || currentStopIndex < 0) {
      return null;
    }

    final nextIndex = currentStopIndex + 1;
    if (nextIndex >= orderedStops.length) {
      return null;
    }
    return orderedStops[nextIndex];
  }

  TourStop? get previousStop {
    if (!hasTour || currentStopIndex <= 0) {
      return null;
    }

    final previousIndex = currentStopIndex - 1;
    if (previousIndex >= orderedStops.length) {
      return null;
    }
    return orderedStops[previousIndex];
  }

  bool get isFirstStop => hasTour && currentStopIndex == 0;

  bool get isLastStop => hasTour && currentStopIndex == orderedStops.length - 1;

  ActiveTourState copyWith({
    ActiveTourStatus? status,
    Object? tourId = _noChange,
    Object? tour = _noChange,
    List<TourStop>? orderedStops,
    int? currentStopIndex,
    Object? lastProximityEvent = _noChange,
    Object? currentNarrationText = _noChange,
    ActiveTourPlaybackStatus? playbackStatus,
    Object? errorMessage = _noChange,
  }) {
    return ActiveTourState(
      status: status ?? this.status,
      tourId: identical(tourId, _noChange) ? this.tourId : tourId as String?,
      tour: identical(tour, _noChange) ? this.tour : tour as Tour?,
      orderedStops: orderedStops ?? this.orderedStops,
      currentStopIndex: currentStopIndex ?? this.currentStopIndex,
      lastProximityEvent: identical(lastProximityEvent, _noChange)
          ? this.lastProximityEvent
          : lastProximityEvent as ProximityEvent?,
      currentNarrationText: identical(currentNarrationText, _noChange)
          ? this.currentNarrationText
          : currentNarrationText as String?,
      playbackStatus: playbackStatus ?? this.playbackStatus,
      errorMessage: identical(errorMessage, _noChange)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}
