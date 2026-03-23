import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'models/brand_config.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/auth_interceptor.dart';
import 'core/config/app_config.dart';
import 'core/theme/app_theme.dart';
import 'core/routing/app_router.dart';
import 'providers/auth_provider.dart';

/// Riverpod provider for the auth service (singleton).
final authServiceProvider = Provider<AuthService>((ref) => AuthService());

/// Riverpod provider for the API client (with auth interceptor).
final apiClientProvider = Provider<ApiClient>((ref) {
  final authSvc = ref.watch(authServiceProvider);
  return ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    interceptors: [AuthInterceptor(authSvc)],
  );
});

/// Riverpod provider that fetches brand config on app startup.
final brandConfigProvider = FutureProvider<BrandConfig>((ref) async {
  final apiClient = ref.watch(apiClientProvider);
  return apiClient.getBrandConfig();
});

/// GoRouter instance — depends on auth state for redirect guard.
final routerProvider = Provider<GoRouter>((ref) => createRouter(ref));

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  runApp(const ProviderScope(child: ProjectXApp()));
}

class ProjectXApp extends ConsumerStatefulWidget {
  const ProjectXApp({super.key});

  @override
  ConsumerState<ProjectXApp> createState() => _ProjectXAppState();
}

class _ProjectXAppState extends ConsumerState<ProjectXApp> {
  @override
  void initState() {
    super.initState();
    // Kick off auth initialization after first frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
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
