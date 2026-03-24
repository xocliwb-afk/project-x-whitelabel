import 'dart:async';

import 'package:dio/dio.dart';

import 'auth_service.dart';

/// Dio interceptor that automatically attaches the Supabase access token
/// to every outgoing request and handles 401 token refresh.
class AuthInterceptor extends Interceptor {
  final AuthService _authService;
  final Dio _dio;

  /// Marker used to prevent retry loops on the same request.
  static const _retriedKey = 'auth_retried';

  Completer<String?>? _refreshCompleter;

  AuthInterceptor(this._authService, this._dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _authService.currentAccessToken;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<String?> _refreshAccessToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    final completer = Completer<String?>();
    _refreshCompleter = completer;

    try {
      completer.complete(await _authService.refreshSession());
    } catch (_) {
      completer.complete(null);
    } finally {
      _refreshCompleter = null;
    }

    return completer.future;
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final requestOptions = err.requestOptions;
    final alreadyRetried = requestOptions.extra[_retriedKey] == true;

    if (err.response?.statusCode != 401 || alreadyRetried) {
      handler.next(err);
      return;
    }

    final newToken = await _refreshAccessToken();
    if (newToken == null || newToken.isEmpty) {
      handler.next(err);
      return;
    }

    final headers = Map<String, dynamic>.from(requestOptions.headers)
      ..['Authorization'] = 'Bearer $newToken';
    final extra = Map<String, dynamic>.from(requestOptions.extra)
      ..[_retriedKey] = true;

    try {
      final response = await _dio.fetch<dynamic>(
        requestOptions.copyWith(
          headers: headers,
          extra: extra,
        ),
      );
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}
