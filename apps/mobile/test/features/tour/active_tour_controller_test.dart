import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/tour/application/active_tour_controller.dart';
import 'package:project_x_mobile/features/tour/application/active_tour_state.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/tour.dart';

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
  );
}

void main() {
  test('initial state is idle', () {
    final controller = ActiveTourController(FakeTourRepository());

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.hasTour, isFalse);
    expect(controller.state.currentStop, isNull);
  });

  test('load success enters ready and orders stops by order', () async {
    final tour = tourWithStops([
      tourStop('third', 2),
      tourStop('first', 0),
      tourStop('second-a', 1),
      tourStop('second-b', 1),
    ]);
    final repository = FakeTourRepository(tours: {tour.id: tour});
    final controller = ActiveTourController(repository);

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

  test('current next and previous stop getters are safe', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
      tourStop('third', 2),
    ]);
    final controller = ActiveTourController(
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

  test('empty stop tour enters error', () async {
    final tour = tourWithStops(const []);
    final controller = ActiveTourController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);

    expect(controller.state.status, ActiveTourStatus.error);
    expect(controller.state.errorMessage, contains('no stops'));
    expect(controller.state.currentStop, isNull);
  });

  test('repository failure enters error', () async {
    final controller = ActiveTourController(
      FakeTourRepository(failure: Exception('network down')),
    );

    await controller.load('tour-1');

    expect(controller.state.status, ActiveTourStatus.error);
    expect(controller.state.tourId, 'tour-1');
    expect(controller.state.errorMessage, contains('network down'));
  });

  test('start enters driving from ready', () async {
    final tour = tourWithStops([tourStop('first', 0)]);
    final controller = ActiveTourController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();

    expect(controller.state.status, ActiveTourStatus.driving);
    expect(controller.state.currentStop?.id, 'first');
  });

  test('start before load is a safe no-op', () {
    final controller = ActiveTourController(FakeTourRepository());

    controller.start();

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.currentStopIndex, 0);
  });

  test('advance moves to next stop', () async {
    final tour = tourWithStops([
      tourStop('first', 0),
      tourStop('second', 1),
    ]);
    final controller = ActiveTourController(
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
    final controller = ActiveTourController(
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
    final controller = ActiveTourController(
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
    final controller = ActiveTourController(
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
    final controller = ActiveTourController(
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
    final controller = ActiveTourController(
      FakeTourRepository(tours: {tour.id: tour}),
    );

    await controller.load(tour.id);
    controller.start();
    controller.reset();

    expect(controller.state.status, ActiveTourStatus.idle);
    expect(controller.state.tour, isNull);
    expect(controller.state.orderedStops, isEmpty);
    expect(controller.state.currentStopIndex, 0);
  });
}
