import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/tour.dart';
import '../../../providers/api_provider.dart';
import '../../../services/api_client.dart';

abstract class TourRepository {
  Future<List<Tour>> listTours();
  Future<Tour> getTourById(String id);
  Future<Tour> planTour(PlanTourRequest request);
  Future<Tour> updateTour(
    String id, {
    String? title,
    String? clientName,
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    List<TourStop>? stops,
  });
  Future<void> deleteTour(String id);
}

class ApiTourRepository implements TourRepository {
  final ApiClient _apiClient;

  const ApiTourRepository(this._apiClient);

  @override
  Future<List<Tour>> listTours() {
    return _apiClient.listTours();
  }

  @override
  Future<Tour> getTourById(String id) {
    return _apiClient.getTourById(id);
  }

  @override
  Future<Tour> planTour(PlanTourRequest request) {
    return _apiClient.planTour(request);
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
  }) {
    final payload = <String, dynamic>{
      if (title != null) 'title': title,
      if (clientName != null) 'clientName': clientName,
      if (date != null) 'date': date,
      if (startTime != null) 'startTime': startTime,
      if (defaultDurationMinutes != null)
        'defaultDurationMinutes': defaultDurationMinutes,
      if (defaultBufferMinutes != null)
        'defaultBufferMinutes': defaultBufferMinutes,
      if (stops != null) 'stops': stops.map((stop) => stop.toJson()).toList(),
    };

    return _apiClient.updateTour(id, payload);
  }

  @override
  Future<void> deleteTour(String id) {
    return _apiClient.deleteTour(id);
  }
}

final tourRepositoryProvider = Provider<TourRepository>((ref) {
  return ApiTourRepository(ref.watch(apiClientProvider));
});
