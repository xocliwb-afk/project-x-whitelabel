import 'package:dio/dio.dart';
import 'auth_service.dart';

/// Dio interceptor that automatically attaches the Supabase access token
/// to every outgoing request and handles 401 token refresh.
class AuthInterceptor extends Interceptor {
  final AuthService _authService;

  /// Header key used to mark a request as already retried (prevent loops).
  static const _retriedKey = 'x-auth-retried';

  AuthInterceptor(this._authService);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _authService.currentAccessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only attempt refresh on 401 and only once per request.
    if (err.response?.statusCode == 401 &&
        err.requestOptions.headers[_retriedKey] != true) {
      final newToken = await _authService.refreshSession();

      if (newToken != null) {
        // Mark the retry so we don't loop.
        err.requestOptions.headers[_retriedKey] = true;
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';

        try {
          // Retry the original request with the fresh token.
          final response = await Dio().fetch(err.requestOptions);
          return handler.resolve(response);
        } on DioException catch (retryError) {
          return handler.next(retryError);
        }
      }
    }

    handler.next(err);
  }
}
