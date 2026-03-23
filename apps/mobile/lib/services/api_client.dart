import 'package:dio/dio.dart';
import '../models/models.dart';
import '../models/narration.dart';

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

  ApiClient({required String baseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ));

  /// Search listings with optional query parameters.
  /// GET /api/listings
  Future<ListingSearchResponse> searchListings({
    String? bbox,
    int? page,
    int? limit,
    int? minPrice,
    int? maxPrice,
    int? beds,
    int? baths,
    String? propertyType,
    String? sort,
    List<String>? status,
    int? minSqft,
    int? maxSqft,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (bbox != null) queryParams['bbox'] = bbox;
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;
      if (minPrice != null) queryParams['minPrice'] = minPrice;
      if (maxPrice != null) queryParams['maxPrice'] = maxPrice;
      if (beds != null) queryParams['beds'] = beds;
      if (baths != null) queryParams['baths'] = baths;
      if (propertyType != null) queryParams['propertyType'] = propertyType;
      if (sort != null) queryParams['sort'] = sort;
      if (status != null) queryParams['status'] = status;
      if (minSqft != null) queryParams['minSqft'] = minSqft;
      if (maxSqft != null) queryParams['maxSqft'] = maxSqft;

      final response = await _dio.get(
        '/api/listings',
        queryParameters: queryParams,
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
