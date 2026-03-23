import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'models/brand_config.dart';
import 'services/api_client.dart';
import 'core/theme/app_theme.dart';
import 'core/routing/app_router.dart';

/// API base URL — override via environment or build config.
/// Default points to local dev server.
const String _defaultApiBaseUrl = 'http://10.0.2.2:3001';

/// Riverpod provider for the API client.
final apiClientProvider = Provider<ApiClient>((ref) {
  const baseUrl = String.fromEnvironment('API_BASE_URL',
      defaultValue: _defaultApiBaseUrl);
  return ApiClient(baseUrl: baseUrl);
});

/// Riverpod provider that fetches brand config on app startup.
final brandConfigProvider = FutureProvider<BrandConfig>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  return apiClient.getBrandConfig();
});

/// GoRouter instance.
final routerProvider = Provider<GoRouter>((ref) => createRouter());

void main() {
  runApp(const ProviderScope(child: ProjectXApp()));
}

class ProjectXApp extends ConsumerWidget {
  const ProjectXApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brandConfigAsync = ref.watch(brandConfigProvider);
    final router = ref.watch(routerProvider);

    return brandConfigAsync.when(
      loading: () => MaterialApp(
        title: 'Loading...',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        ),
        home: const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      error: (error, stack) => MaterialApp(
        title: 'Loading...',
        theme: ThemeData(useMaterial3: true),
        home: Scaffold(
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load app configuration',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(brandConfigProvider),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      data: (brandConfig) {
        final appTheme = AppTheme(brand: brandConfig);

        return MaterialApp.router(
          title: brandConfig.brandName,
          theme: appTheme.build(),
          routerConfig: router,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}
