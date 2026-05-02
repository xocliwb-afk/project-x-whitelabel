import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:project_x_mobile/features/search/data/listings_repository.dart';
import 'package:project_x_mobile/features/search/presentation/screens/search_screen.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/listing_search_response.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/providers/api_provider.dart';

import '../../test_support/listing_fixtures.dart';
import '../../test_support/tour_fixtures.dart';

class FakeListingsRepository implements ListingsRepository {
  final List<ListingSearchQuery> queries = [];
  final List<Object> results;

  FakeListingsRepository(this.results);

  @override
  Future<ListingSearchResponse> searchListings(ListingSearchQuery query) async {
    queries.add(query);
    final next = results.removeAt(0);
    if (next is Exception) {
      throw next;
    }
    if (next is Future<ListingSearchResponse>) {
      return next;
    }
    return next as ListingSearchResponse;
  }
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

ListingSearchResponse searchResponse({
  required List<String> ids,
  int page = 1,
  bool hasMore = false,
}) {
  return ListingSearchResponse(
    results: ids.map(buildListing).toList(),
    pagination: SearchPagination(
      page: page,
      limit: 20,
      pageCount: hasMore ? page + 1 : page,
      hasMore: hasMore,
    ),
  );
}

BrandConfig brandConfig({bool tourEngine = false}) {
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
    features: FeatureFlags(tourEngine: tourEngine),
  );
}

Future<GoRouter> pumpSearchScreen(
  WidgetTester tester,
  FakeListingsRepository repository, {
  bool tourEngine = false,
}) async {
  final router = GoRouter(
    initialLocation: '/search',
    routes: [
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) => Scaffold(
          body: Text('Listing detail ${state.pathParameters['id']}'),
        ),
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        listingsRepositoryProvider.overrideWithValue(repository),
        brandConfigProvider.overrideWith((ref) async {
          return brandConfig(tourEngine: tourEngine);
        }),
        tourDraftControllerProvider.overrideWith((ref) {
          return TourDraftController(FakeTourRepository());
        }),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );

  return router;
}

void main() {
  testWidgets('renders shell before initial listing data resolves',
      (tester) async {
    final completer = Completer<ListingSearchResponse>();
    final repository = FakeListingsRepository([completer.future]);

    await pumpSearchScreen(tester, repository);

    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);
    expect(find.text('Search listings'), findsWidgets);

    await tester.pump();
    expect(find.text('Loading listings...'), findsOneWidget);

    completer.complete(searchResponse(ids: ['listing-1']));
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
    expect(
        find.byKey(const ValueKey('listing-card-listing-1')), findsOneWidget);
  });

  testWidgets('submits search text and renders empty state', (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: []),
      searchResponse(ids: []),
    ]);

    await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('search-input')),
      'midtown',
    );
    await tester.tap(find.byKey(const ValueKey('search-submit')));
    await tester.pumpAndSettle();

    expect(repository.queries.last.q, 'midtown');
    expect(find.text('No listings match this search.'), findsOneWidget);
  });

  testWidgets('renders error state with retry action', (tester) async {
    final repository = FakeListingsRepository([
      Exception('network failed'),
      searchResponse(ids: ['listing-1']),
    ]);

    await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    expect(find.text('Search unavailable'), findsOneWidget);
    expect(find.textContaining('network failed'), findsOneWidget);

    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
  });

  testWidgets('navigates to listing detail when a listing is tapped',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
    ]);

    await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('listing-card-listing-1')));
    await tester.pumpAndSettle();

    expect(find.text('Listing detail listing-1'), findsOneWidget);
  });

  testWidgets('shows add-to-tour only when tour engine is enabled',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
    ]);

    await pumpSearchScreen(tester, repository, tourEngine: true);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('add-to-tour-listing-1')));
    await tester.pump();

    expect(find.text('Added to tour draft'), findsOneWidget);
  });
}
