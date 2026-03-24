// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'listing_search_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ListingSearchResponse _$ListingSearchResponseFromJson(
        Map<String, dynamic> json) =>
    ListingSearchResponse(
      results: (json['results'] as List<dynamic>)
          .map((e) => Listing.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination:
          SearchPagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ListingSearchResponseToJson(
        ListingSearchResponse instance) =>
    <String, dynamic>{
      'results': instance.results,
      'pagination': instance.pagination,
    };

SearchPagination _$SearchPaginationFromJson(Map<String, dynamic> json) =>
    SearchPagination(
      page: (json['page'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      pageCount: (json['pageCount'] as num).toInt(),
      hasMore: json['hasMore'] as bool,
    );

Map<String, dynamic> _$SearchPaginationToJson(SearchPagination instance) =>
    <String, dynamic>{
      'page': instance.page,
      'limit': instance.limit,
      'pageCount': instance.pageCount,
      'hasMore': instance.hasMore,
    };
