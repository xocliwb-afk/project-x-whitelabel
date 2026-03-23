// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tour.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TourStop _$TourStopFromJson(Map<String, dynamic> json) => TourStop(
      id: json['id'] as String,
      listingId: json['listingId'] as String,
      order: (json['order'] as num).toInt(),
      address: json['address'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      thumbnailUrl: json['thumbnailUrl'] as String?,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
    );

Map<String, dynamic> _$TourStopToJson(TourStop instance) => <String, dynamic>{
      'id': instance.id,
      'listingId': instance.listingId,
      'order': instance.order,
      'address': instance.address,
      'lat': instance.lat,
      'lng': instance.lng,
      'thumbnailUrl': instance.thumbnailUrl,
      'startTime': instance.startTime,
      'endTime': instance.endTime,
    };

Tour _$TourFromJson(Map<String, dynamic> json) => Tour(
      id: json['id'] as String,
      title: json['title'] as String,
      clientName: json['clientName'] as String,
      date: json['date'] as String,
      startTime: json['startTime'] as String,
      defaultDurationMinutes:
          (json['defaultDurationMinutes'] as num).toInt(),
      defaultBufferMinutes:
          (json['defaultBufferMinutes'] as num).toInt(),
      stops: (json['stops'] as List<dynamic>)
          .map((e) => TourStop.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$TourToJson(Tour instance) => <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'clientName': instance.clientName,
      'date': instance.date,
      'startTime': instance.startTime,
      'defaultDurationMinutes': instance.defaultDurationMinutes,
      'defaultBufferMinutes': instance.defaultBufferMinutes,
      'stops': instance.stops.map((e) => e.toJson()).toList(),
    };

TourStopInput _$TourStopInputFromJson(Map<String, dynamic> json) =>
    TourStopInput(
      listingId: json['listingId'] as String,
      address: json['address'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );

Map<String, dynamic> _$TourStopInputToJson(TourStopInput instance) =>
    <String, dynamic>{
      'listingId': instance.listingId,
      'address': instance.address,
      'lat': instance.lat,
      'lng': instance.lng,
    };

PlanTourRequest _$PlanTourRequestFromJson(Map<String, dynamic> json) =>
    PlanTourRequest(
      date: json['date'] as String,
      clientName: json['clientName'] as String?,
      stops: (json['stops'] as List<dynamic>)
          .map((e) => TourStopInput.fromJson(e as Map<String, dynamic>))
          .toList(),
      startTime: json['startTime'] as String,
      defaultDurationMinutes:
          (json['defaultDurationMinutes'] as num).toInt(),
      defaultBufferMinutes:
          (json['defaultBufferMinutes'] as num).toInt(),
      timeZone: json['timeZone'] as String?,
    );

Map<String, dynamic> _$PlanTourRequestToJson(PlanTourRequest instance) =>
    <String, dynamic>{
      'date': instance.date,
      'clientName': instance.clientName,
      'stops': instance.stops.map((e) => e.toJson()).toList(),
      'startTime': instance.startTime,
      'defaultDurationMinutes': instance.defaultDurationMinutes,
      'defaultBufferMinutes': instance.defaultBufferMinutes,
      'timeZone': instance.timeZone,
    };
