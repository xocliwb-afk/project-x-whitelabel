import 'package:dio/dio.dart';
import '../models/models.dart';
import '../core/config/app_config.dart';

/// Error type for API failures with structured information.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? code;

  const ApiException({
    required this.message,
    this.statusCode,
    this.code,
  });

  @override
  String toString() => 'ApiException($statusCode $code): $message';
}

/// Dio-based HTTP client for the Project X BFF API.
///
/// All mobile API access goes through this client.
/// Base URL is configured at construction time (from environment or build config).
class ApiClient {
  final Dio _dio;

  ApiClient({required String baseUrl, List<Interceptor>? interceptors})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-tenant-id': AppConfig.tenantId,
          },
        )) {
    if (interceptors != null) {
      _dio.interceptors.addAll(interceptors);
    }
  }

  Dio get dio => _dio;

  void addInterceptor(Interceptor interceptor) {
    final alreadyRegistered = _dio.interceptors.any(
      (existing) =>
          identical(existing, interceptor) ||
          existing.runtimeType == interceptor.runtimeType,
    );
    if (alreadyRegistered) {
      return;
    }
    _dio.interceptors.add(interceptor);
  }

  /// Search listings with optional query parameters.
  /// GET /api/listings
  /// Search listings with optional query parameters.
  /// Mirrors ListingSearchParams from packages/shared-types.
  Future<ListingSearchResponse> searchListings({
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
    CancelToken? cancelToken,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (q != null) queryParams['q'] = q;
      if (bbox != null) queryParams['bbox'] = bbox;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;
      if (minPrice != null) queryParams['minPrice'] = minPrice;
      if (maxPrice != null) queryParams['maxPrice'] = maxPrice;
      if (beds != null) queryParams['beds'] = beds;
      if (maxBeds != null) queryParams['maxBeds'] = maxBeds;
      if (baths != null) queryParams['baths'] = baths;
      if (maxBaths != null) queryParams['maxBaths'] = maxBaths;
      if (propertyType != null) queryParams['propertyType'] = propertyType;
      if (sort != null) queryParams['sort'] = sort;
      if (status != null) queryParams['status'] = status;
      if (minSqft != null) queryParams['minSqft'] = minSqft;
      if (maxSqft != null) queryParams['maxSqft'] = maxSqft;
      if (minYearBuilt != null) queryParams['minYearBuilt'] = minYearBuilt;
      if (maxYearBuilt != null) queryParams['maxYearBuilt'] = maxYearBuilt;
      if (maxDaysOnMarket != null)
        queryParams['maxDaysOnMarket'] = maxDaysOnMarket;
      if (keywords != null) queryParams['keywords'] = keywords;
      if (cities != null) queryParams['cities'] = cities;
      if (postalCodes != null) queryParams['postalCodes'] = postalCodes;
      if (counties != null) queryParams['counties'] = counties;
      if (neighborhoods != null) queryParams['neighborhoods'] = neighborhoods;
      if (features != null) queryParams['features'] = features;
      if (subtype != null) queryParams['subtype'] = subtype;

      final response = await _dio.get(
        '/api/listings',
        queryParameters: queryParams,
        cancelToken: cancelToken,
      );
      return ListingSearchResponse.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get a single listing by ID.
  /// GET /api/listings/:id
  Future<Listing> getListingById(String id) async {
    try {
      final response = await _dio.get('/api/listings/$id');
      final data = response.data as Map<String, dynamic>;
      return Listing.fromJson(data['listing'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Fetch brand configuration.
  /// GET /api/brand
  Future<BrandConfig> getBrandConfig() async {
    try {
      final response = await _dio.get('/api/brand');
      return BrandConfig.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Fetch favorited listing IDs for the authenticated user.
  /// GET /api/favorites/ids
  Future<Set<String>> getFavoriteListingIds() async {
    try {
      final response = await _dio.get('/api/favorites/ids');
      final data = response.data as Map<String, dynamic>;
      final listingIds = data['listingIds'] as List<dynamic>? ?? const [];
      return listingIds
          .whereType<String>()
          .where((listingId) => listingId.trim().isNotEmpty)
          .toSet();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Add a listing to the authenticated user's favorites.
  /// POST /api/favorites
  Future<void> addFavorite(String listingId) async {
    try {
      await _dio.post(
        '/api/favorites',
        data: {'listingId': listingId},
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Remove a listing from the authenticated user's favorites.
  /// DELETE /api/favorites/:listingId
  Future<void> removeFavorite(String listingId) async {
    try {
      await _dio.delete('/api/favorites/${Uri.encodeComponent(listingId)}');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Submit a lead/contact form.
  /// POST /api/leads
  Future<LeadResponse> submitLead(LeadPayload payload) async {
    try {
      final response = await _dio.post(
        '/api/leads',
        data: payload.toJson(),
      );
      return LeadResponse.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Plan a tour.
  /// POST /api/tours
  Future<Tour> planTour(PlanTourRequest request) async {
    try {
      final response = await _dio.post(
        '/api/tours',
        data: request.toJson(),
      );
      return Tour.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// List persisted tours for the authenticated user.
  /// GET /api/tours
  Future<List<Tour>> listTours() async {
    try {
      final response = await _dio.get('/api/tours');
      final data = response.data as Map<String, dynamic>;
      final tours = data['tours'] as List<dynamic>;
      return tours
          .map((tour) => Tour.fromJson(tour as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Get a persisted tour by ID.
  /// GET /api/tours/:id
  Future<Tour> getTourById(String id) async {
    try {
      final response = await _dio.get('/api/tours/$id');
      return Tour.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Update a persisted tour by ID.
  /// PUT /api/tours/:id
  Future<Tour> updateTour(String id, Map<String, dynamic> updates) async {
    try {
      final response = await _dio.put(
        '/api/tours/$id',
        data: updates,
      );
      return Tour.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Delete a persisted tour by ID.
  /// DELETE /api/tours/:id
  Future<void> deleteTour(String id) async {
    try {
      await _dio.delete('/api/tours/$id');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Fetch narration payloads for a tour.
  /// GET /api/tours/:id/narrations
  Future<List<NarrationPayload>> getTourNarrations(String tourId) async {
    try {
      final response = await _dio.get('/api/tours/$tourId/narrations');
      final data = response.data as Map<String, dynamic>;
      final narrations = (data['narrations'] as List<dynamic>)
          .map((e) => NarrationPayload.fromJson(e as Map<String, dynamic>))
          .toList();
      return narrations;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Convert DioException to ApiException with meaningful context.
  ApiException _handleDioError(DioException e) {
    if (e.response != null) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        return ApiException(
          message: data['message'] as String? ?? e.message ?? 'Request failed',
          statusCode: e.response?.statusCode,
          code: data['code'] as String?,
        );
      }
      return ApiException(
        message: e.message ?? 'Request failed',
        statusCode: e.response?.statusCode,
      );
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return const ApiException(
        message: 'Request timed out. Please check your connection.',
        code: 'TIMEOUT',
      );
    }

    return ApiException(
      message: e.message ?? 'Network error',
      code: 'NETWORK_ERROR',
    );
  }
}
