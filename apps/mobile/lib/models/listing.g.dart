// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'listing.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Listing _$ListingFromJson(Map<String, dynamic> json) => Listing(
      id: json['id'] as String,
      mlsId: json['mlsId'] as String,
      listPrice: (json['listPrice'] as num).toInt(),
      listPriceFormatted: json['listPriceFormatted'] as String,
      address: ListingAddress.fromJson(json['address'] as Map<String, dynamic>),
      media: ListingMedia.fromJson(json['media'] as Map<String, dynamic>),
      attribution: json['attribution'] == null
          ? null
          : ListingAttribution.fromJson(
              json['attribution'] as Map<String, dynamic>),
      details: ListingDetails.fromJson(json['details'] as Map<String, dynamic>),
      meta: ListingMeta.fromJson(json['meta'] as Map<String, dynamic>),
      agent: json['agent'] == null
          ? null
          : ListingAgent.fromJson(json['agent'] as Map<String, dynamic>),
      coAgent: json['coAgent'] == null
          ? null
          : ListingAgent.fromJson(json['coAgent'] as Map<String, dynamic>),
      office: json['office'] == null
          ? null
          : ListingOffice.fromJson(json['office'] as Map<String, dynamic>),
      description: json['description'] as String?,
      tax: json['tax'] == null
          ? null
          : ListingTax.fromJson(json['tax'] as Map<String, dynamic>),
      school: json['school'] == null
          ? null
          : ListingSchool.fromJson(json['school'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ListingToJson(Listing instance) => <String, dynamic>{
      'id': instance.id,
      'mlsId': instance.mlsId,
      'listPrice': instance.listPrice,
      'listPriceFormatted': instance.listPriceFormatted,
      'address': instance.address,
      'media': instance.media,
      'attribution': instance.attribution,
      'details': instance.details,
      'meta': instance.meta,
      'agent': instance.agent,
      'coAgent': instance.coAgent,
      'office': instance.office,
      'description': instance.description,
      'tax': instance.tax,
      'school': instance.school,
    };

ListingAddress _$ListingAddressFromJson(Map<String, dynamic> json) =>
    ListingAddress(
      full: json['full'] as String,
      street: json['street'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      zip: json['zip'] as String,
      county: json['county'] as String?,
      neighborhood: json['neighborhood'] as String?,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );

Map<String, dynamic> _$ListingAddressToJson(ListingAddress instance) =>
    <String, dynamic>{
      'full': instance.full,
      'street': instance.street,
      'city': instance.city,
      'state': instance.state,
      'zip': instance.zip,
      'county': instance.county,
      'neighborhood': instance.neighborhood,
      'lat': instance.lat,
      'lng': instance.lng,
    };

ListingMedia _$ListingMediaFromJson(Map<String, dynamic> json) => ListingMedia(
      photos:
          (json['photos'] as List<dynamic>).map((e) => e as String).toList(),
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );

Map<String, dynamic> _$ListingMediaToJson(ListingMedia instance) =>
    <String, dynamic>{
      'photos': instance.photos,
      'thumbnailUrl': instance.thumbnailUrl,
    };

ListingAttribution _$ListingAttributionFromJson(Map<String, dynamic> json) =>
    ListingAttribution(
      mlsName: json['mlsName'] as String,
      disclaimer: json['disclaimer'] as String,
      logoUrl: json['logoUrl'] as String?,
    );

Map<String, dynamic> _$ListingAttributionToJson(ListingAttribution instance) =>
    <String, dynamic>{
      'mlsName': instance.mlsName,
      'disclaimer': instance.disclaimer,
      'logoUrl': instance.logoUrl,
    };

ListingDetails _$ListingDetailsFromJson(Map<String, dynamic> json) =>
    ListingDetails(
      beds: (json['beds'] as num?)?.toInt(),
      baths: (json['baths'] as num?)?.toInt(),
      sqft: (json['sqft'] as num?)?.toInt(),
      lotSize: (json['lotSize'] as num?)?.toDouble(),
      yearBuilt: (json['yearBuilt'] as num?)?.toInt(),
      hoaFees: (json['hoaFees'] as num?)?.toInt(),
      basement: json['basement'] as String?,
      propertyType: json['propertyType'] as String?,
      status: json['status'] as String,
    );

Map<String, dynamic> _$ListingDetailsToJson(ListingDetails instance) =>
    <String, dynamic>{
      'beds': instance.beds,
      'baths': instance.baths,
      'sqft': instance.sqft,
      'lotSize': instance.lotSize,
      'yearBuilt': instance.yearBuilt,
      'hoaFees': instance.hoaFees,
      'basement': instance.basement,
      'propertyType': instance.propertyType,
      'status': instance.status,
    };

ListingMeta _$ListingMetaFromJson(Map<String, dynamic> json) => ListingMeta(
      daysOnMarket: (json['daysOnMarket'] as num?)?.toInt(),
      mlsName: json['mlsName'] as String?,
    );

Map<String, dynamic> _$ListingMetaToJson(ListingMeta instance) =>
    <String, dynamic>{
      'daysOnMarket': instance.daysOnMarket,
      'mlsName': instance.mlsName,
    };

ListingAgent _$ListingAgentFromJson(Map<String, dynamic> json) => ListingAgent(
      id: json['id'],
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      cellPhone: json['cellPhone'] as String?,
    );

Map<String, dynamic> _$ListingAgentToJson(ListingAgent instance) =>
    <String, dynamic>{
      'id': instance.id,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'email': instance.email,
      'phone': instance.phone,
      'cellPhone': instance.cellPhone,
    };

ListingOffice _$ListingOfficeFromJson(Map<String, dynamic> json) =>
    ListingOffice(
      id: json['id'],
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
    );

Map<String, dynamic> _$ListingOfficeToJson(ListingOffice instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'phone': instance.phone,
      'email': instance.email,
    };

ListingTax _$ListingTaxFromJson(Map<String, dynamic> json) => ListingTax(
      annualAmount: (json['annualAmount'] as num?)?.toDouble(),
      year: (json['year'] as num?)?.toInt(),
      assessmentId: json['assessmentId'],
    );

Map<String, dynamic> _$ListingTaxToJson(ListingTax instance) =>
    <String, dynamic>{
      'annualAmount': instance.annualAmount,
      'year': instance.year,
      'assessmentId': instance.assessmentId,
    };

ListingSchool _$ListingSchoolFromJson(Map<String, dynamic> json) =>
    ListingSchool(
      district: json['district'] as String?,
      elementary: json['elementary'] as String?,
      middle: json['middle'] as String?,
      high: json['high'] as String?,
    );

Map<String, dynamic> _$ListingSchoolToJson(ListingSchool instance) =>
    <String, dynamic>{
      'district': instance.district,
      'elementary': instance.elementary,
      'middle': instance.middle,
      'high': instance.high,
    };
