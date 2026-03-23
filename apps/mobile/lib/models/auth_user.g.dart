// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => AuthUser(
      id: json['id'] as String,
      supabaseId: json['supabaseId'] as String,
      tenantId: json['tenantId'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String?,
      phone: json['phone'] as String?,
      role: json['role'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );

Map<String, dynamic> _$AuthUserToJson(AuthUser instance) => <String, dynamic>{
      'id': instance.id,
      'supabaseId': instance.supabaseId,
      'tenantId': instance.tenantId,
      'email': instance.email,
      'displayName': instance.displayName,
      'phone': instance.phone,
      'role': instance.role,
      'createdAt': instance.createdAt,
      'updatedAt': instance.updatedAt,
    };
