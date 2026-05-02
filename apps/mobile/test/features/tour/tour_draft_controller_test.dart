import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/tour.dart';

import '../../test_support/tour_fixtures.dart';

class FakeTourRepository implements TourRepository {
  int planCalls = 0;
  int listCalls = 0;
  int getCalls = 0;
  int updateCalls = 0;
  int deleteCalls = 0;
  Object? planResult;
  List<Tour> tours = [];

  @override
  Future<List<Tour>> listTours() async {
    listCalls += 1;
    return tours;
  }

  @override
  Future<Tour> getTourById(String id) async {
    getCalls += 1;
    return tours.firstWhere((tour) => tour.id == id);
  }

  @override
  Future<Tour> planTour(PlanTourRequest request) async {
    planCalls += 1;
    final next = planResult ?? buildTour('tour-1');
    if (next is Exception) {
      throw next;
    }
    return next as Tour;
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
    updateCalls += 1;
    return buildTour(id);
  }

  @override
  Future<void> deleteTour(String id) async {
    deleteCalls += 1;
  }
}

TourDraftStop draftStop(String id) {
  return TourDraftStop(
    listingId: id,
    address: '$id Main Street',
    lat: 42.3314,
    lng: -83.0458,
  );
}

void main() {
  test('manages local draft add remove and reorder without persistence', () {
    final repository = FakeTourRepository();
    final controller = TourDraftController(repository);

    controller.addStop(draftStop('listing-1'));
    controller.addStop(draftStop('listing-2'));
    controller.addStop(draftStop('listing-3'));
    controller.reorderStop(2, 0);
    controller.removeStopByListingId('listing-2');

    expect(repository.planCalls, 0);
    expect(controller.state.stops.map((stop) => stop.listingId), [
      'listing-3',
      'listing-1',
    ]);
  });

  test('persistDraft is auth gated and preserves local draft', () async {
    final repository = FakeTourRepository();
    final controller = TourDraftController(repository);

    controller.addStop(draftStop('listing-1'));
    controller.setSchedule(date: '2026-05-02');

    final result = await controller.persistDraft(isAuthenticated: false);

    expect(result, isNull);
    expect(repository.planCalls, 0);
    expect(controller.state.stops.single.listingId, 'listing-1');
    expect(controller.state.error, contains('Sign in'));
  });

  test('failed persistence preserves draft stops and schedule', () async {
    final repository = FakeTourRepository()
      ..planResult = Exception('save failed');
    final controller = TourDraftController(repository);

    controller.addStop(draftStop('listing-1'));
    controller.setSchedule(date: '2026-05-02', startTime: '10:30');

    final result = await controller.persistDraft(isAuthenticated: true);

    expect(result, isNull);
    expect(repository.planCalls, 1);
    expect(controller.state.stops.single.listingId, 'listing-1');
    expect(controller.state.date, '2026-05-02');
    expect(controller.state.startTime, '10:30');
    expect(controller.state.error, contains('save failed'));
  });

  test('authenticated persistence stores the current tour', () async {
    final tour = buildTour('tour-2');
    final repository = FakeTourRepository()..planResult = tour;
    final controller = TourDraftController(repository);

    controller.addStop(draftStop('listing-1'));
    controller.setSchedule(date: '2026-05-02');

    final result = await controller.persistDraft(isAuthenticated: true);

    expect(result, tour);
    expect(controller.state.currentTour, tour);
    expect(controller.state.error, isNull);
  });
}
