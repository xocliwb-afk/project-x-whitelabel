import 'package:json_annotation/json_annotation.dart';

part 'narration.g.dart';

/// Mirrors NarrationPayload from packages/shared-types/src/narration.ts.
@JsonSerializable()
class NarrationPayload {
  final String tourStopId;
  final String listingId;
  final String trigger;
  final String narrationText;
  final NarrationListingSummary? listingSummary;
  final NarrationNavigationContext? navigationContext;

  const NarrationPayload({
    required this.tourStopId,
    required this.listingId,
    required this.trigger,
    required this.narrationText,
    this.listingSummary,
    this.navigationContext,
  });

  factory NarrationPayload.fromJson(Map<String, dynamic> json) =>
      _$NarrationPayloadFromJson(json);

  Map<String, dynamic> toJson() => _$NarrationPayloadToJson(this);
}

@JsonSerializable()
class NarrationListingSummary {
  final String address;
  final String price;
  final int? beds;
  final int? baths;
  final int? sqft;
  final List<String>? highlights;

  const NarrationListingSummary({
    required this.address,
    required this.price,
    this.beds,
    this.baths,
    this.sqft,
    this.highlights,
  });

  factory NarrationListingSummary.fromJson(Map<String, dynamic> json) =>
      _$NarrationListingSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$NarrationListingSummaryToJson(this);
}

@JsonSerializable()
class NarrationNavigationContext {
  final int distanceMeters;
  final int durationSeconds;
  final String relation;

  const NarrationNavigationContext({
    required this.distanceMeters,
    required this.durationSeconds,
    required this.relation,
  });

  factory NarrationNavigationContext.fromJson(Map<String, dynamic> json) =>
      _$NarrationNavigationContextFromJson(json);

  Map<String, dynamic> toJson() => _$NarrationNavigationContextToJson(this);
}

/// Mirrors ProximityEvent from packages/shared-types/src/narration.ts.
@JsonSerializable()
class ProximityEvent {
  final String tourId;
  final String tourStopId;
  final String listingId;
  final String type;
  final ProximityLocation location;
  final int distanceMeters;
  final String timestamp;

  const ProximityEvent({
    required this.tourId,
    required this.tourStopId,
    required this.listingId,
    required this.type,
    required this.location,
    required this.distanceMeters,
    required this.timestamp,
  });

  factory ProximityEvent.fromJson(Map<String, dynamic> json) =>
      _$ProximityEventFromJson(json);

  Map<String, dynamic> toJson() => _$ProximityEventToJson(this);
}

@JsonSerializable()
class ProximityLocation {
  final double lat;
  final double lng;

  const ProximityLocation({required this.lat, required this.lng});

  factory ProximityLocation.fromJson(Map<String, dynamic> json) =>
      _$ProximityLocationFromJson(json);

  Map<String, dynamic> toJson() => _$ProximityLocationToJson(this);
}
