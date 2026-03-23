// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lead.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeadPayload _$LeadPayloadFromJson(Map<String, dynamic> json) => LeadPayload(
      listingId: json['listingId'] as String?,
      listingAddress: json['listingAddress'] as String?,
      message: json['message'] as String?,
      context: json['context'] as String?,
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      brokerId: json['brokerId'] as String,
      agentId: json['agentId'] as String?,
      source: json['source'] as String?,
      captchaToken: json['captchaToken'] as String?,
    );

Map<String, dynamic> _$LeadPayloadToJson(LeadPayload instance) =>
    <String, dynamic>{
      'listingId': instance.listingId,
      'listingAddress': instance.listingAddress,
      'message': instance.message,
      'context': instance.context,
      'name': instance.name,
      'email': instance.email,
      'phone': instance.phone,
      'brokerId': instance.brokerId,
      'agentId': instance.agentId,
      'source': instance.source,
      'captchaToken': instance.captchaToken,
    };

LeadResponse _$LeadResponseFromJson(Map<String, dynamic> json) =>
    LeadResponse(
      success: json['success'] as bool,
      provider: json['provider'] as String?,
      message: json['message'] as String?,
    );

Map<String, dynamic> _$LeadResponseToJson(LeadResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'provider': instance.provider,
      'message': instance.message,
    };
