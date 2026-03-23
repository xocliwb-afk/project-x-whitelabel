import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/search/presentation/screens/search_screen.dart';
import '../../features/listing_detail/presentation/screens/listing_detail_screen.dart';
import '../../features/tour/presentation/screens/tour_screen.dart';

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

/// App router configuration using GoRouter.
///
/// Routes:
///   /         → splash/loading (fetches brand config)
///   /search   → search screen (placeholder)
///   /listing/:id → listing detail screen (placeholder)
///   /tour     → tour screen (placeholder)
GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
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
