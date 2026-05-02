import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing_search_response.dart';
import '../../../providers/api_provider.dart';
import '../../../services/api_client.dart';

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

  ListingSearchQuery copyWith({
    String? q,
    String? bbox,
    int? page,
    int? limit,
    int? minPrice,
    int? maxPrice,
    int? beds,
    int? maxBeds,
    int? baths,
    int? maxBaths,
    String? propertyType,
    String? sort,
    List<String>? status,
    int? minSqft,
    int? maxSqft,
    int? minYearBuilt,
    int? maxYearBuilt,
    int? maxDaysOnMarket,
    String? keywords,
    List<String>? cities,
    List<String>? postalCodes,
    List<String>? counties,
    List<String>? neighborhoods,
    List<String>? features,
    List<String>? subtype,
  }) {
    return ListingSearchQuery(
      q: q ?? this.q,
      bbox: bbox ?? this.bbox,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      beds: beds ?? this.beds,
      maxBeds: maxBeds ?? this.maxBeds,
      baths: baths ?? this.baths,
      maxBaths: maxBaths ?? this.maxBaths,
      propertyType: propertyType ?? this.propertyType,
      sort: sort ?? this.sort,
      status: status ?? this.status,
      minSqft: minSqft ?? this.minSqft,
      maxSqft: maxSqft ?? this.maxSqft,
      minYearBuilt: minYearBuilt ?? this.minYearBuilt,
      maxYearBuilt: maxYearBuilt ?? this.maxYearBuilt,
      maxDaysOnMarket: maxDaysOnMarket ?? this.maxDaysOnMarket,
      keywords: keywords ?? this.keywords,
      cities: cities ?? this.cities,
      postalCodes: postalCodes ?? this.postalCodes,
      counties: counties ?? this.counties,
      neighborhoods: neighborhoods ?? this.neighborhoods,
      features: features ?? this.features,
      subtype: subtype ?? this.subtype,
    );
  }
}

abstract class ListingsRepository {
  Future<ListingSearchResponse> searchListings(ListingSearchQuery query);
}

class ApiListingsRepository implements ListingsRepository {
  final ApiClient _apiClient;

  const ApiListingsRepository(this._apiClient);

  @override
  Future<ListingSearchResponse> searchListings(ListingSearchQuery query) {
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
    );
  }
}

final listingsRepositoryProvider = Provider<ListingsRepository>((ref) {
  return ApiListingsRepository(ref.watch(apiClientProvider));
});
