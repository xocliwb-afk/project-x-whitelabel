import 'package:json_annotation/json_annotation.dart';

part 'lead.g.dart';

/// Mirrors LeadPayload from packages/shared-types/src/index.ts.
@JsonSerializable()
class LeadPayload {
  final String? listingId;
  final String? listingAddress;
  final String? message;
  final String? context;
  final String name;
  final String? email;
  final String? phone;
  final String brokerId;
  final String? agentId;
  final String? source;
  final String? captchaToken;

  const LeadPayload({
    this.listingId,
    this.listingAddress,
    this.message,
    this.context,
    required this.name,
    this.email,
    this.phone,
    required this.brokerId,
    this.agentId,
    this.source,
    this.captchaToken,
  });

  factory LeadPayload.fromJson(Map<String, dynamic> json) =>
      _$LeadPayloadFromJson(json);

  Map<String, dynamic> toJson() => _$LeadPayloadToJson(this);
}

/// Mirrors LeadResponse from packages/shared-types/src/index.ts.
@JsonSerializable()
class LeadResponse {
  final bool success;
  final String? provider;
  final String? message;

  const LeadResponse({
    required this.success,
    this.provider,
    this.message,
  });

  factory LeadResponse.fromJson(Map<String, dynamic> json) =>
      _$LeadResponseFromJson(json);

  Map<String, dynamic> toJson() => _$LeadResponseToJson(this);
}
