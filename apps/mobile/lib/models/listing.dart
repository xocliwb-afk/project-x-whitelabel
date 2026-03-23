import 'package:json_annotation/json_annotation.dart';

part 'listing.g.dart';

/// Mirrors NormalizedListing from packages/shared-types/src/index.ts.
/// This is the canonical listing DTO returned by the BFF API.
@JsonSerializable()
class Listing {
  final String id;
  final String mlsId;
  final int listPrice;
  final String listPriceFormatted;
  final ListingAddress address;
  final ListingMedia media;
  final ListingAttribution? attribution;
  final ListingDetails details;
  final ListingMeta meta;
  final ListingAgent? agent;
  final ListingAgent? coAgent;
  final ListingOffice? office;
  final String? description;
  final ListingTax? tax;
  final ListingSchool? school;

  const Listing({
    required this.id,
    required this.mlsId,
    required this.listPrice,
    required this.listPriceFormatted,
    required this.address,
    required this.media,
    this.attribution,
    required this.details,
    required this.meta,
    this.agent,
    this.coAgent,
    this.office,
    this.description,
    this.tax,
    this.school,
  });

  factory Listing.fromJson(Map<String, dynamic> json) =>
      _$ListingFromJson(json);

  Map<String, dynamic> toJson() => _$ListingToJson(this);
}

@JsonSerializable()
class ListingAddress {
  final String full;
  final String street;
  final String city;
  final String state;
  final String zip;
  final String? county;
  final String? neighborhood;
  final double lat;
  final double lng;

  const ListingAddress({
    required this.full,
    required this.street,
    required this.city,
    required this.state,
    required this.zip,
    this.county,
    this.neighborhood,
    required this.lat,
    required this.lng,
  });

  factory ListingAddress.fromJson(Map<String, dynamic> json) =>
      _$ListingAddressFromJson(json);

  Map<String, dynamic> toJson() => _$ListingAddressToJson(this);
}

@JsonSerializable()
class ListingMedia {
  final List<String> photos;
  final String? thumbnailUrl;

  const ListingMedia({
    required this.photos,
    this.thumbnailUrl,
  });

  factory ListingMedia.fromJson(Map<String, dynamic> json) =>
      _$ListingMediaFromJson(json);

  Map<String, dynamic> toJson() => _$ListingMediaToJson(this);
}

@JsonSerializable()
class ListingAttribution {
  final String mlsName;
  final String disclaimer;
  final String? logoUrl;

  const ListingAttribution({
    required this.mlsName,
    required this.disclaimer,
    this.logoUrl,
  });

  factory ListingAttribution.fromJson(Map<String, dynamic> json) =>
      _$ListingAttributionFromJson(json);

  Map<String, dynamic> toJson() => _$ListingAttributionToJson(this);
}

@JsonSerializable()
class ListingDetails {
  final int? beds;
  final int? baths;
  final int? sqft;
  final double? lotSize;
  final int? yearBuilt;
  final int? hoaFees;
  final String? basement;
  final String? propertyType;
  final String status;

  const ListingDetails({
    this.beds,
    this.baths,
    this.sqft,
    this.lotSize,
    this.yearBuilt,
    this.hoaFees,
    this.basement,
    this.propertyType,
    required this.status,
  });

  factory ListingDetails.fromJson(Map<String, dynamic> json) =>
      _$ListingDetailsFromJson(json);

  Map<String, dynamic> toJson() => _$ListingDetailsToJson(this);
}

@JsonSerializable()
class ListingMeta {
  final int? daysOnMarket;
  final String? mlsName;

  const ListingMeta({
    this.daysOnMarket,
    this.mlsName,
  });

  factory ListingMeta.fromJson(Map<String, dynamic> json) =>
      _$ListingMetaFromJson(json);

  Map<String, dynamic> toJson() => _$ListingMetaToJson(this);
}

@JsonSerializable()
class ListingAgent {
  final String? id;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? phone;
  final String? cellPhone;

  const ListingAgent({
    this.id,
    this.firstName,
    this.lastName,
    this.email,
    this.phone,
    this.cellPhone,
  });

  factory ListingAgent.fromJson(Map<String, dynamic> json) =>
      _$ListingAgentFromJson(json);

  Map<String, dynamic> toJson() => _$ListingAgentToJson(this);
}

@JsonSerializable()
class ListingOffice {
  final String? id;
  final String? name;
  final String? phone;
  final String? email;

  const ListingOffice({
    this.id,
    this.name,
    this.phone,
    this.email,
  });

  factory ListingOffice.fromJson(Map<String, dynamic> json) =>
      _$ListingOfficeFromJson(json);

  Map<String, dynamic> toJson() => _$ListingOfficeToJson(this);
}

@JsonSerializable()
class ListingTax {
  final double? annualAmount;
  final int? year;
  final String? assessmentId;

  const ListingTax({
    this.annualAmount,
    this.year,
    this.assessmentId,
  });

  factory ListingTax.fromJson(Map<String, dynamic> json) =>
      _$ListingTaxFromJson(json);

  Map<String, dynamic> toJson() => _$ListingTaxToJson(this);
}

@JsonSerializable()
class ListingSchool {
  final String? district;
  final String? elementary;
  final String? middle;
  final String? high;

  const ListingSchool({
    this.district,
    this.elementary,
    this.middle,
    this.high,
  });

  factory ListingSchool.fromJson(Map<String, dynamic> json) =>
      _$ListingSchoolFromJson(json);

  Map<String, dynamic> toJson() => _$ListingSchoolToJson(this);
}
