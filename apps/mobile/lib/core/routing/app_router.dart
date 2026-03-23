import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/search/presentation/screens/search_screen.dart';
import '../../features/listing_detail/presentation/screens/listing_detail_screen.dart';
import '../../features/tour/presentation/screens/tour_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../providers/auth_provider.dart';

/// Splash/loading screen shown while brand config is being fetched.
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
const _publicRoutes = {'/login', '/register', '/'};

/// App router configuration using GoRouter.
///
/// Routes:
///   /             → splash/loading (fetches brand config)
///   /login        → login screen
///   /register     → register screen
///   /search       → search screen (requires auth)
///   /listing/:id  → listing detail screen (requires auth)
///   /tour         → tour screen (requires auth)
GoRouter createRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuth = authState.isAuthenticated;
      final location = state.matchedLocation;

      // Still loading auth — don't redirect yet.
      if (authState.isLoading) return null;

      // Not authenticated and trying to access a protected route → login.
      if (!isAuth && !_publicRoutes.contains(location)) {
        return '/login';
      }

      // Authenticated and on login/register → go to search.
      if (isAuth && (location == '/login' || location == '/register')) {
        return '/search';
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
