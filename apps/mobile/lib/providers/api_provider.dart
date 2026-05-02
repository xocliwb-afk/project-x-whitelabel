import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../models/brand_config.dart';
import '../services/api_client.dart';
import '../services/auth_interceptor.dart';
import '../services/auth_service.dart';

/// Riverpod provider for the auth service used by API transport.
final authServiceProvider = Provider<AuthService>((ref) => AuthService());

/// Riverpod provider for the API client with tenant and auth handling.
final apiClientProvider = Provider<ApiClient>((ref) {
  final authSvc = ref.watch(authServiceProvider);
  final apiClient = ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
  );
  apiClient.addInterceptor(AuthInterceptor(authSvc, apiClient.dio));
  return apiClient;
});

/// Riverpod provider that fetches brand config on app startup.
final brandConfigProvider = FutureProvider<BrandConfig>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  return apiClient.getBrandConfig();
});
