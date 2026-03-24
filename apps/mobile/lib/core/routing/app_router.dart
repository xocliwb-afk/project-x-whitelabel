import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/listing_detail/presentation/screens/listing_detail_screen.dart';
import '../../features/search/presentation/screens/search_screen.dart';
import '../../features/tour/presentation/screens/tour_screen.dart';
import '../../providers/auth_provider.dart';

/// Splash/loading screen shown while auth state is being resolved.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

/// Routes that don't require authentication.
const _publicRoutes = {'/login', '/register'};

class _AuthRouterRefreshListenable extends ChangeNotifier {
  _AuthRouterRefreshListenable(Ref ref) {
    _subscription = ref.listen<AuthState>(authProvider, (_, __) {
      notifyListeners();
    });
  }

  late final ProviderSubscription<AuthState> _subscription;

  @override
  void dispose() {
    _subscription.close();
    super.dispose();
  }
}

final _authRouterRefreshProvider =
    Provider<_AuthRouterRefreshListenable>((ref) {
  final listenable = _AuthRouterRefreshListenable(ref);
  ref.onDispose(listenable.dispose);
  return listenable;
});

GoRouter createRouter(Ref ref) {
  final refreshListenable = ref.watch(_authRouterRefreshProvider);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final location = state.matchedLocation;

      if (!authState.isInitialized) {
        return location == '/' ? null : '/';
      }

      if (authState.isAuthenticated) {
        if (location == '/' || location == '/login' || location == '/register') {
          return '/search';
        }
        return null;
      }

      if (authState.pendingVerification) {
        if (location == '/' || location == '/login') {
          return '/register';
        }
        return null;
      }

      if (location == '/') {
        return '/login';
      }

      if (!_publicRoutes.contains(location)) {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ListingDetailScreen(listingId: id);
        },
      ),
      GoRoute(
        path: '/tour',
        builder: (context, state) => const TourScreen(),
      ),
    ],
  );
}
