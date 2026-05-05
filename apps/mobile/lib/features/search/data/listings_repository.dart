import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing_search_response.dart';
import '../../../providers/api_provider.dart';
import '../../../services/api_client.dart';

const _noChange = Object();

class ListingSearchQuery {
  final String? q;
  final String? bbox;
  final int page;
  final int limit;
  final int? minPrice;
  final int? maxPrice;
  final int? beds;
  final int? maxBeds;
  final int? baths;
  final int? maxBaths;
  final String? propertyType;
  final String? sort;
  final List<String>? status;
  final int? minSqft;
  final int? maxSqft;
  final int? minYearBuilt;
  final int? maxYearBuilt;
  final int? maxDaysOnMarket;
  final String? keywords;
  final List<String>? cities;
  final List<String>? postalCodes;
  final List<String>? counties;
  final List<String>? neighborhoods;
  final List<String>? features;
  final List<String>? subtype;

  const ListingSearchQuery({
    this.q,
    this.bbox,
    this.page = 1,
    this.limit = 20,
    this.minPrice,
    this.maxPrice,
    this.beds,
    this.maxBeds,
    this.baths,
    this.maxBaths,
    this.propertyType,
    this.sort,
    this.status,
    this.minSqft,
    this.maxSqft,
    this.minYearBuilt,
    this.maxYearBuilt,
    this.maxDaysOnMarket,
    this.keywords,
    this.cities,
    this.postalCodes,
    this.counties,
    this.neighborhoods,
    this.features,
    this.subtype,
  });

  int get activeFilterCount {
    var count = 0;
    if (minPrice != null) count++;
    if (maxPrice != null) count++;
    if (beds != null) count++;
    if (baths != null) count++;
    if (_hasText(propertyType)) count++;
    if (status != null && status!.isNotEmpty) count++;
    if (minSqft != null) count++;
    if (maxSqft != null) count++;
    if (minYearBuilt != null) count++;
    if (maxYearBuilt != null) count++;
    if (maxDaysOnMarket != null) count++;
    if (_hasText(keywords)) count++;
    return count;
  }

  bool get hasActiveFilters => activeFilterCount > 0;

  ListingSearchQuery copyWith({
    Object? q = _noChange,
    Object? bbox = _noChange,
    int? page,
    int? limit,
    Object? minPrice = _noChange,
    Object? maxPrice = _noChange,
    Object? beds = _noChange,
    Object? maxBeds = _noChange,
    Object? baths = _noChange,
    Object? maxBaths = _noChange,
    Object? propertyType = _noChange,
    Object? sort = _noChange,
    Object? status = _noChange,
    Object? minSqft = _noChange,
    Object? maxSqft = _noChange,
    Object? minYearBuilt = _noChange,
    Object? maxYearBuilt = _noChange,
    Object? maxDaysOnMarket = _noChange,
    Object? keywords = _noChange,
    Object? cities = _noChange,
    Object? postalCodes = _noChange,
    Object? counties = _noChange,
    Object? neighborhoods = _noChange,
    Object? features = _noChange,
    Object? subtype = _noChange,
  }) {
    return ListingSearchQuery(
      q: identical(q, _noChange) ? this.q : q as String?,
      bbox: identical(bbox, _noChange) ? this.bbox : bbox as String?,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      minPrice:
          identical(minPrice, _noChange) ? this.minPrice : minPrice as int?,
      maxPrice:
          identical(maxPrice, _noChange) ? this.maxPrice : maxPrice as int?,
      beds: identical(beds, _noChange) ? this.beds : beds as int?,
      maxBeds: identical(maxBeds, _noChange) ? this.maxBeds : maxBeds as int?,
      baths: identical(baths, _noChange) ? this.baths : baths as int?,
      maxBaths:
          identical(maxBaths, _noChange) ? this.maxBaths : maxBaths as int?,
      propertyType: identical(propertyType, _noChange)
          ? this.propertyType
          : propertyType as String?,
      sort: identical(sort, _noChange) ? this.sort : sort as String?,
      status:
          identical(status, _noChange) ? this.status : status as List<String>?,
      minSqft: identical(minSqft, _noChange) ? this.minSqft : minSqft as int?,
      maxSqft: identical(maxSqft, _noChange) ? this.maxSqft : maxSqft as int?,
      minYearBuilt: identical(minYearBuilt, _noChange)
          ? this.minYearBuilt
          : minYearBuilt as int?,
      maxYearBuilt: identical(maxYearBuilt, _noChange)
          ? this.maxYearBuilt
          : maxYearBuilt as int?,
      maxDaysOnMarket: identical(maxDaysOnMarket, _noChange)
          ? this.maxDaysOnMarket
          : maxDaysOnMarket as int?,
      keywords:
          identical(keywords, _noChange) ? this.keywords : keywords as String?,
      cities:
          identical(cities, _noChange) ? this.cities : cities as List<String>?,
      postalCodes: identical(postalCodes, _noChange)
          ? this.postalCodes
          : postalCodes as List<String>?,
      counties: identical(counties, _noChange)
          ? this.counties
          : counties as List<String>?,
      neighborhoods: identical(neighborhoods, _noChange)
          ? this.neighborhoods
          : neighborhoods as List<String>?,
      features: identical(features, _noChange)
          ? this.features
          : features as List<String>?,
      subtype: identical(subtype, _noChange)
          ? this.subtype
          : subtype as List<String>?,
    );
  }

  static bool _hasText(String? value) =>
      value != null && value.trim().isNotEmpty;
}

abstract class ListingsRepository {
  Future<ListingSearchResponse> searchListings(
    ListingSearchQuery query, {
    CancelToken? cancelToken,
  });
}

class ApiListingsRepository implements ListingsRepository {
  final ApiClient _apiClient;

  const ApiListingsRepository(this._apiClient);

  @override
  Future<ListingSearchResponse> searchListings(
    ListingSearchQuery query, {
    CancelToken? cancelToken,
  }) {
    return _apiClient.searchListings(
      q: query.q,
      bbox: query.bbox,
      page: query.page,
      limit: query.limit,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      beds: query.beds,
      maxBeds: query.maxBeds,
      baths: query.baths,
      maxBaths: query.maxBaths,
      propertyType: query.propertyType,
      sort: query.sort,
      status: query.status,
      minSqft: query.minSqft,
      maxSqft: query.maxSqft,
      minYearBuilt: query.minYearBuilt,
      maxYearBuilt: query.maxYearBuilt,
      maxDaysOnMarket: query.maxDaysOnMarket,
      keywords: query.keywords,
      cities: query.cities,
      postalCodes: query.postalCodes,
      counties: query.counties,
      neighborhoods: query.neighborhoods,
      features: query.features,
      subtype: query.subtype,
      cancelToken: cancelToken,
    );
  }
}

final listingsRepositoryProvider = Provider<ListingsRepository>((ref) {
  return ApiListingsRepository(ref.watch(apiClientProvider));
});
