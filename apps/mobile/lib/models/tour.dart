import 'package:json_annotation/json_annotation.dart';

part 'tour.g.dart';

/// Mirrors TourStop from packages/shared-types/src/tour.ts.
@JsonSerializable()
class TourStop {
  final String id;
  final String listingId;
  final int order;
  final String address;
  final double lat;
  final double lng;
  final String? thumbnailUrl;
  final String? startTime;
  final String? endTime;

  const TourStop({
    required this.id,
    required this.listingId,
    required this.order,
    required this.address,
    required this.lat,
    required this.lng,
    this.thumbnailUrl,
    this.startTime,
    this.endTime,
  });

  factory TourStop.fromJson(Map<String, dynamic> json) =>
      _$TourStopFromJson(json);

  Map<String, dynamic> toJson() => _$TourStopToJson(this);
}

/// Mirrors Tour from packages/shared-types/src/tour.ts.
@JsonSerializable()
class Tour {
  final String id;
  final String title;
  final String clientName;
  final String date;
  final String startTime;
  final int defaultDurationMinutes;
  final int defaultBufferMinutes;
  final List<TourStop> stops;

  const Tour({
    required this.id,
    required this.title,
    required this.clientName,
    required this.date,
    required this.startTime,
    required this.defaultDurationMinutes,
    required this.defaultBufferMinutes,
    required this.stops,
  });

  factory Tour.fromJson(Map<String, dynamic> json) => _$TourFromJson(json);

  Map<String, dynamic> toJson() => _$TourToJson(this);
}

/// Mirrors TourStopInput from packages/shared-types/src/tour.ts.
@JsonSerializable()
class TourStopInput {
  final String listingId;
  final String address;
  final double lat;
  final double lng;

  const TourStopInput({
    required this.listingId,
    required this.address,
    required this.lat,
    required this.lng,
  });

  factory TourStopInput.fromJson(Map<String, dynamic> json) =>
      _$TourStopInputFromJson(json);

  Map<String, dynamic> toJson() => _$TourStopInputToJson(this);
}

/// Mirrors PlanTourRequest from packages/shared-types/src/tour.ts.
@JsonSerializable()
class PlanTourRequest {
  final String date;
  final String? clientName;
  final List<TourStopInput> stops;
  final String startTime;
  final int defaultDurationMinutes;
  final int defaultBufferMinutes;
  final String? timeZone;

  const PlanTourRequest({
    required this.date,
    this.clientName,
    required this.stops,
    required this.startTime,
    required this.defaultDurationMinutes,
    required this.defaultBufferMinutes,
    this.timeZone,
  });

  factory PlanTourRequest.fromJson(Map<String, dynamic> json) =>
      _$PlanTourRequestFromJson(json);

  Map<String, dynamic> toJson() => _$PlanTourRequestToJson(this);
}
