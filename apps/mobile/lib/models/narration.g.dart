// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'narration.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NarrationPayload _$NarrationPayloadFromJson(Map<String, dynamic> json) =>
    NarrationPayload(
      tourStopId: json['tourStopId'] as String,
      listingId: json['listingId'] as String,
      trigger: json['trigger'] as String,
      narrationText: json['narrationText'] as String,
      listingSummary: json['listingSummary'] == null
          ? null
          : NarrationListingSummary.fromJson(
              json['listingSummary'] as Map<String, dynamic>),
      navigationContext: json['navigationContext'] == null
          ? null
          : NarrationNavigationContext.fromJson(
              json['navigationContext'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$NarrationPayloadToJson(NarrationPayload instance) =>
    <String, dynamic>{
      'tourStopId': instance.tourStopId,
      'listingId': instance.listingId,
      'trigger': instance.trigger,
      'narrationText': instance.narrationText,
      'listingSummary': instance.listingSummary?.toJson(),
      'navigationContext': instance.navigationContext?.toJson(),
    };

NarrationListingSummary _$NarrationListingSummaryFromJson(
        Map<String, dynamic> json) =>
    NarrationListingSummary(
      address: json['address'] as String,
      price: json['price'] as String,
      beds: (json['beds'] as num?)?.toInt(),
      baths: (json['baths'] as num?)?.toInt(),
      sqft: (json['sqft'] as num?)?.toInt(),
      highlights: (json['highlights'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$NarrationListingSummaryToJson(
        NarrationListingSummary instance) =>
    <String, dynamic>{
      'address': instance.address,
      'price': instance.price,
      'beds': instance.beds,
      'baths': instance.baths,
      'sqft': instance.sqft,
      'highlights': instance.highlights,
    };

NarrationNavigationContext _$NarrationNavigationContextFromJson(
        Map<String, dynamic> json) =>
    NarrationNavigationContext(
      distanceMeters: (json['distanceMeters'] as num).toInt(),
      durationSeconds: (json['durationSeconds'] as num).toInt(),
      relation: json['relation'] as String,
    );

Map<String, dynamic> _$NarrationNavigationContextToJson(
        NarrationNavigationContext instance) =>
    <String, dynamic>{
      'distanceMeters': instance.distanceMeters,
      'durationSeconds': instance.durationSeconds,
      'relation': instance.relation,
    };

ProximityEvent _$ProximityEventFromJson(Map<String, dynamic> json) =>
    ProximityEvent(
      tourId: json['tourId'] as String,
      tourStopId: json['tourStopId'] as String,
      listingId: json['listingId'] as String,
      type: json['type'] as String,
      location: ProximityLocation.fromJson(
          json['location'] as Map<String, dynamic>),
      distanceMeters: (json['distanceMeters'] as num).toInt(),
      timestamp: json['timestamp'] as String,
    );

Map<String, dynamic> _$ProximityEventToJson(ProximityEvent instance) =>
    <String, dynamic>{
      'tourId': instance.tourId,
      'tourStopId': instance.tourStopId,
      'listingId': instance.listingId,
      'type': instance.type,
      'location': instance.location.toJson(),
      'distanceMeters': instance.distanceMeters,
      'timestamp': instance.timestamp,
    };

ProximityLocation _$ProximityLocationFromJson(Map<String, dynamic> json) =>
    ProximityLocation(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );

Map<String, dynamic> _$ProximityLocationToJson(ProximityLocation instance) =>
    <String, dynamic>{
      'lat': instance.lat,
      'lng': instance.lng,
    };
