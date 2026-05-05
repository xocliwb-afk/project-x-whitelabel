import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:project_x_mobile/core/routing/app_router.dart';
import 'package:project_x_mobile/features/favorites/data/favorites_repository.dart';
import 'package:project_x_mobile/features/listing_detail/data/listing_detail_repository.dart';
import 'package:project_x_mobile/features/search/data/listings_repository.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/auth_user.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/listing.dart';
import 'package:project_x_mobile/models/listing_search_response.dart';
import 'package:project_x_mobile/models/narration.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/providers/api_provider.dart';
import 'package:project_x_mobile/providers/auth_provider.dart';
import 'package:project_x_mobile/services/narration_service.dart';

import '../../test_support/listing_fixtures.dart';
import '../../test_support/tour_fixtures.dart';

class FakeAuthNotifier extends StateNotifier<AuthState>
    implements AuthNotifier {
  FakeAuthNotifier(AuthState initialState) : super(initialState);

  @override
  Future<void> initialize() async {}

  @override
  Future<void> login(String email, String password) async {}

  @override
  Future<void> logout() async {}

  @override
  Future<void> register({
    required String email,
    required String password,
    String? displayName,
    String? phone,
  }) async {}
}

class FakeListingsRepository implements ListingsRepository {
  @override
  Future<ListingSearchResponse> searchListings(
    ListingSearchQuery query, {
    CancelToken? cancelToken,
  }) async {
    return const ListingSearchResponse(
      results: [],
      pagination: SearchPagination(
        page: 1,
        limit: 20,
        pageCount: 1,
        hasMore: false,
      ),
    );
  }
}

class FakeFavoritesRepository implements FavoritesRepository {
  @override
  Future<Set<String>> listFavoriteIds() async => {};

  @override
  Future<void> addFavorite(String listingId) async {}

  @override
  Future<void> removeFavorite(String listingId) async {}
}

class FakeListingDetailRepository implements ListingDetailRepository {
  @override
  Future<Listing> getListingById(String id) async => buildListing(id);
}

class FakeTourRepository implements TourRepository {
  @override
  Future<List<Tour>> listTours() async => [];

  @override
  Future<Tour> getTourById(String id) async => buildTour(id);

  @override
  Future<Tour> planTour(PlanTourRequest request) async => buildTour('tour-1');

  @override
  Future<Tour> updateTour(
    String id, {
    String? title,
    String? clientName,
    String? date,
    String? startTime,
    int? defaultDurationMinutes,
    int? defaultBufferMinutes,
    List<TourStop>? stops,
  }) async {
    return buildTour(id);
  }

  @override
  Future<void> deleteTour(String id) async {}
}

class FakeNarrationService implements NarrationService {
  @override
  Future<List<NarrationPayload>> fetchTourNarrations(String tourId) async {
    return const [];
  }
}

AuthUser buildUser() {
  return const AuthUser(
    id: 'user-1',
    supabaseId: 'supabase-1',
    tenantId: 'tenant-1',
    email: 'buyer@example.com',
    role: 'user',
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  );
}

BrandConfig brandConfig() {
  return BrandConfig(
    brandName: 'Project X',
    contact: const BrandContact(email: 'hello@example.com'),
    logo: const BrandLogo(
      url: 'https://example.com/logo.png',
      height: 32,
      alt: 'Project X',
    ),
    theme: const ThemeConfig(
      colors: ThemeColors(
        primary: '#111111',
        primaryForeground: '#ffffff',
        primaryAccent: '#444444',
        background: '#ffffff',
        surface: '#ffffff',
        surfaceMuted: '#f4f4f5',
        surfaceAccent: '#eeeeee',
        textMain: '#111111',
        textSecondary: '#444444',
        textMuted: '#777777',
        border: '#dddddd',
        danger: '#b00020',
        success: '#0f7b0f',
      ),
      typography: ThemeTypography(
        fontFamily: 'Inter',
        baseSizePx: 16,
        headingWeight: 700,
        bodyWeight: 400,
      ),
      radius: ThemeRadius(card: 8, button: 8, input: 8),
    ),
    features: const FeatureFlags(tourEngine: true),
  );
}

Future<GoRouter> pumpAppRouter(
  WidgetTester tester, {
  required AuthState authState,
}) async {
  late GoRouter router;
  final testRouterProvider = Provider<GoRouter>((ref) => createRouter(ref));

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authProvider.overrideWith((ref) => FakeAuthNotifier(authState)),
        brandConfigProvider.overrideWith((ref) async => brandConfig()),
        listingsRepositoryProvider.overrideWithValue(FakeListingsRepository()),
        favoritesRepositoryProvider
            .overrideWithValue(FakeFavoritesRepository()),
        listingDetailRepositoryProvider
            .overrideWithValue(FakeListingDetailRepository()),
        tourRepositoryProvider.overrideWithValue(FakeTourRepository()),
        narrationServiceProvider.overrideWithValue(FakeNarrationService()),
        tourDraftControllerProvider.overrideWith((ref) {
          return TourDraftController(FakeTourRepository());
        }),
      ],
      child: Consumer(
        builder: (context, ref, _) {
          router = ref.watch(testRouterProvider);
          return MaterialApp.router(routerConfig: router);
        },
      ),
    ),
  );

  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('signed-out users can access Epic 15 public routes',
      (tester) async {
    final router = await pumpAppRouter(
      tester,
      authState: const AuthState(isInitialized: true),
    );

    expect(find.text('Welcome Back'), findsOneWidget);

    router.go('/search');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);

    router.go('/listing/listing-1');
    await tester.pumpAndSettle();
    expect(find.text('Listing Detail'), findsOneWidget);
    expect(
        find.text('listing-1 Main Street, Detroit, MI 48201'), findsOneWidget);

    router.go('/tour');
    await tester.pumpAndSettle();
    expect(find.text('Planner'), findsOneWidget);
    expect(find.text('0 stops in local draft'), findsOneWidget);

    router.go('/tour/drive/tour-1');
    await tester.pumpAndSettle();
    expect(find.text('Active Tour'), findsOneWidget);
    expect(
        find.byKey(const ValueKey('active-tour-current-stop')), findsOneWidget);
  });

  testWidgets('signed-out users can browse listings from login screen',
      (tester) async {
    await pumpAppRouter(
      tester,
      authState: const AuthState(isInitialized: true),
    );

    expect(find.text('Welcome Back'), findsOneWidget);

    await tester.tap(find.text('Browse listings'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);
  });

  testWidgets('signed-out users can browse listings from register screen',
      (tester) async {
    final router = await pumpAppRouter(
      tester,
      authState: const AuthState(isInitialized: true),
    );

    router.go('/register');
    await tester.pumpAndSettle();
    expect(find.text('Sign up to get started'), findsOneWidget);

    await tester.tap(find.text('Browse listings'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);
  });

  testWidgets('authenticated users are redirected away from auth entry routes',
      (tester) async {
    final router = await pumpAppRouter(
      tester,
      authState: AuthState(isInitialized: true, user: buildUser()),
    );

    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);

    router.go('/login');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);

    router.go('/register');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);
  });
}
