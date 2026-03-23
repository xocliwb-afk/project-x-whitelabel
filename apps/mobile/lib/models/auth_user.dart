import 'package:json_annotation/json_annotation.dart';

part 'auth_user.g.dart';

/// Mirrors AuthUser from packages/shared-types/src/auth.ts.
@JsonSerializable()
class AuthUser {
  final String id;
  final String supabaseId;
  final String tenantId;
  final String email;
  final String? displayName;
  final String? phone;
  final String role;
  final String createdAt;
  final String updatedAt;

  const AuthUser({
    required this.id,
    required this.supabaseId,
    required this.tenantId,
    required this.email,
    this.displayName,
    this.phone,
    required this.role,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      _$AuthUserFromJson(json);

  Map<String, dynamic> toJson() => _$AuthUserToJson(this);
}
