import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/narration.dart';
import '../models/tour.dart';

abstract class ProximityEventSource {
  Stream<ProximityEvent> get events;

  void emit(ProximityEvent event);

  void simulateApproaching({
    required String tourId,
    required TourStop stop,
    ProximityLocation? location,
    int distanceMeters = 200,
    String? timestamp,
  });

  void simulateArrived({
    required String tourId,
    required TourStop stop,
    ProximityLocation? location,
    int distanceMeters = 0,
    String? timestamp,
  });

  Future<void> close();
}

class SimulatedProximityEventSource implements ProximityEventSource {
  final StreamController<ProximityEvent> _controller =
      StreamController<ProximityEvent>.broadcast();

  bool _isClosed = false;

  @override
  Stream<ProximityEvent> get events => _controller.stream;

  @override
  void emit(ProximityEvent event) {
    if (_isClosed) {
      return;
    }

    _controller.add(event);
  }

  @override
  void simulateApproaching({
    required String tourId,
    required TourStop stop,
    ProximityLocation? location,
    int distanceMeters = 200,
    String? timestamp,
  }) {
    emit(_eventForStop(
      tourId: tourId,
      stop: stop,
      type: 'approaching',
      location: location,
      distanceMeters: distanceMeters,
      timestamp: timestamp,
    ));
  }

  @override
  void simulateArrived({
    required String tourId,
    required TourStop stop,
    ProximityLocation? location,
    int distanceMeters = 0,
    String? timestamp,
  }) {
    emit(_eventForStop(
      tourId: tourId,
      stop: stop,
      type: 'arrived',
      location: location,
      distanceMeters: distanceMeters,
      timestamp: timestamp,
    ));
  }

  @override
  Future<void> close() async {
    if (_isClosed) {
      return;
    }

    _isClosed = true;
    await _controller.close();
  }

  ProximityEvent _eventForStop({
    required String tourId,
    required TourStop stop,
    required String type,
    ProximityLocation? location,
    required int distanceMeters,
    String? timestamp,
  }) {
    return ProximityEvent(
      tourId: tourId,
      tourStopId: stop.id,
      listingId: stop.listingId,
      type: type,
      location: location ?? ProximityLocation(lat: stop.lat, lng: stop.lng),
      distanceMeters: distanceMeters,
      timestamp: timestamp ?? DateTime.now().toUtc().toIso8601String(),
    );
  }
}

final proximityEventSourceProvider = Provider<SimulatedProximityEventSource>((
  ref,
) {
  final source = SimulatedProximityEventSource();
  ref.onDispose(() {
    source.close();
  });
  return source;
});
