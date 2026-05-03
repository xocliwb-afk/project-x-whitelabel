import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/models/narration.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/services/proximity_event_source.dart';

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

ProximityEvent proximityEvent(TourStop stop) {
  return ProximityEvent(
    tourId: 'tour-1',
    tourStopId: stop.id,
    listingId: stop.listingId,
    type: 'departed',
    location: ProximityLocation(lat: stop.lat, lng: stop.lng),
    distanceMeters: 50,
    timestamp: '2026-05-03T00:00:00.000Z',
  );
}

void main() {
  test('SimulatedProximityEventSource emits approaching events', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final stop = tourStop('first', 0);

    final eventFuture = source.events.first;
    source.simulateApproaching(
      tourId: 'tour-1',
      stop: stop,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    final event = await eventFuture;

    expect(event.tourId, 'tour-1');
    expect(event.tourStopId, stop.id);
    expect(event.listingId, stop.listingId);
    expect(event.type, 'approaching');
    expect(event.distanceMeters, 200);
    expect(event.location.lat, stop.lat);
    expect(event.location.lng, stop.lng);
  });

  test('SimulatedProximityEventSource emits arrived events', () async {
    final source = SimulatedProximityEventSource();
    addTearDown(source.close);
    final stop = tourStop('first', 0);

    final eventFuture = source.events.first;
    source.simulateArrived(
      tourId: 'tour-1',
      stop: stop,
      timestamp: '2026-05-03T00:00:00.000Z',
    );
    final event = await eventFuture;

    expect(event.tourId, 'tour-1');
    expect(event.tourStopId, stop.id);
    expect(event.type, 'arrived');
    expect(event.distanceMeters, 0);
  });

  test('SimulatedProximityEventSource close is safe', () async {
    final source = SimulatedProximityEventSource();
    final stop = tourStop('first', 0);

    await source.close();

    expect(() => source.emit(proximityEvent(stop)), returnsNormally);
    await source.close();
  });

  test('proximityEventSourceProvider closes source on dispose', () async {
    final container = ProviderContainer();
    final stop = tourStop('first', 0);
    final source = container.read(proximityEventSourceProvider);
    var streamClosed = false;
    source.events.listen(null, onDone: () {
      streamClosed = true;
    });

    container.dispose();
    await Future<void>.delayed(Duration.zero);

    expect(streamClosed, isTrue);
    expect(() => source.emit(proximityEvent(stop)), returnsNormally);
  });
}
