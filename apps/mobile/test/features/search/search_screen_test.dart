import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:project_x_mobile/features/search/application/listing_search_controller.dart';
import 'package:project_x_mobile/features/search/application/map_viewport_state.dart';
import 'package:project_x_mobile/features/search/data/listings_repository.dart';
import 'package:project_x_mobile/features/search/presentation/screens/search_screen.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/listing.dart';
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
  Future<ListingSearchResponse> searchListings(
    ListingSearchQuery query, {
    CancelToken? cancelToken,
  }) async {
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

class PumpedSearchScreen {
  final GoRouter router;
  final ListingSearchController searchController;
  final TourDraftController tourController;

  const PumpedSearchScreen({
    required this.router,
    required this.searchController,
    required this.tourController,
  });
}

Future<PumpedSearchScreen> pumpSearchScreen(
  WidgetTester tester,
  FakeListingsRepository repository, {
  bool tourEngine = false,
}) async {
  final searchController = ListingSearchController(repository);
  final tourController = TourDraftController(FakeTourRepository());
  final router = GoRouter(
    initialLocation: '/search',
    routes: [
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) {
          final extra = state.extra;
          final previewId = extra is Listing ? extra.id : 'none';
          return Scaffold(
            body: Text(
              'Listing detail ${state.pathParameters['id']} preview $previewId',
            ),
          );
        },
      ),
      GoRoute(
        path: '/tour',
        builder: (context, state) => const Scaffold(
          body: Text('Tour route'),
        ),
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        listingsRepositoryProvider.overrideWithValue(repository),
        listingSearchControllerProvider.overrideWith((ref) {
          return searchController;
        }),
        brandConfigProvider.overrideWith((ref) async {
          return brandConfig(tourEngine: tourEngine);
        }),
        tourDraftControllerProvider.overrideWith((ref) {
          return tourController;
        }),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );

  return PumpedSearchScreen(
    router: router,
    searchController: searchController,
    tourController: tourController,
  );
}

void main() {
  testWidgets('renders shell before initial listing data resolves',
      (tester) async {
    final completer = Completer<ListingSearchResponse>();
    final repository = FakeListingsRepository([completer.future]);

    await pumpSearchScreen(tester, repository);

    expect(
        find.byKey(const ValueKey('map-first-search-shell')), findsOneWidget);
    expect(find.byKey(const ValueKey('mapbox-search-shell')), findsOneWidget);
    expect(find.byKey(const ValueKey('mapbox-token-missing')), findsOneWidget);
    expect(find.byKey(const ValueKey('search-top-overlay')), findsOneWidget);
    expect(find.byKey(const ValueKey('search-results-panel')), findsOneWidget);
    expect(find.byKey(const ValueKey('search-input')), findsOneWidget);
    expect(find.byKey(const ValueKey('sort-select')), findsOneWidget);
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

  testWidgets('filter sheet applies filters within committed bbox',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
      searchResponse(ids: ['listing-2']),
      searchResponse(ids: ['listing-3']),
    ]);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    final harness = await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    harness.searchController.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
      source: MapCameraChangeSource.user,
    );
    await harness.searchController.commitDraftVisibleBbox();
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('filter-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('filter-sheet')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('filter-min-price')),
      '300000',
    );
    await tester.enterText(find.byKey(const ValueKey('filter-beds')), '3');
    await tester.enterText(
      find.byKey(const ValueKey('filter-property-type')),
      'Residential',
    );
    await tester.enterText(
      find.byKey(const ValueKey('filter-status')),
      'FOR_SALE, PENDING',
    );
    await tester.tap(find.byKey(const ValueKey('filter-apply')));
    await tester.pumpAndSettle();

    expect(repository.queries.last.bbox, bbox.toQueryParam());
    expect(repository.queries.last.minPrice, 300000);
    expect(repository.queries.last.beds, 3);
    expect(repository.queries.last.propertyType, 'Residential');
    expect(repository.queries.last.status, ['FOR_SALE', 'PENDING']);
    expect(repository.queries.last.page, 1);
    expect(find.byKey(const ValueKey('active-filter-summary')), findsOneWidget);
    expect(find.text('4 filters active'), findsOneWidget);
  });

  testWidgets('filter reset clears filters and keeps committed bbox',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
      searchResponse(ids: ['listing-2']),
      searchResponse(ids: ['listing-3']),
    ]);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    final harness = await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    harness.searchController.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
      source: MapCameraChangeSource.user,
    );
    await harness.searchController.commitDraftVisibleBbox();
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('filter-button')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('filter-min-price')),
      '300000',
    );
    await tester.tap(find.byKey(const ValueKey('filter-apply')));
    await tester.pumpAndSettle();

    expect(repository.queries.last.minPrice, 300000);
    expect(find.text('1 filter active'), findsOneWidget);

    repository.results.add(searchResponse(ids: ['listing-1']));
    await tester.tap(find.byKey(const ValueKey('filter-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('filter-reset')));
    await tester.pumpAndSettle();

    expect(repository.queries.last.bbox, bbox.toQueryParam());
    expect(repository.queries.last.minPrice, isNull);
    expect(repository.queries.last.hasActiveFilters, isFalse);
    expect(find.byKey(const ValueKey('active-filter-summary')), findsNothing);
  });

  testWidgets('sort change reruns search with current shell query',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
      searchResponse(ids: ['listing-2']),
    ]);

    await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('sort-select')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Price: high to low').last);
    await tester.pumpAndSettle();

    expect(repository.queries.last.sort, 'price-desc');
    expect(repository.queries.last.page, 1);
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

    await tester.drag(
      find.byKey(const ValueKey('search-results-scroll')),
      const Offset(0, -160),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
  });

  testWidgets('navigates to listing detail when a listing is tapped',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
    ]);

    final harness = await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('listing-card-listing-1')));
    expect(
      harness.searchController.state.mapViewport.selectedListingId,
      'listing-1',
    );
    await tester.pumpAndSettle();

    expect(find.text('Listing detail listing-1 preview listing-1'),
        findsOneWidget);
  });

  testWidgets('selects a listing card for map/list sync', (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
    ]);

    final harness = await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('select-listing-listing-1')));
    await tester.pumpAndSettle();

    expect(
      harness.searchController.state.mapViewport.selectedListingId,
      'listing-1',
    );
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('select-listing-listing-1')),
        matching: find.byIcon(Icons.location_pin),
      ),
      findsOneWidget,
    );
  });

  testWidgets('commits draft bbox from Search this area', (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
      searchResponse(ids: ['listing-2']),
    ]);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    final harness = await pumpSearchScreen(tester, repository);
    await tester.pumpAndSettle();

    harness.searchController.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
      source: MapCameraChangeSource.user,
    );
    await tester.pump();

    expect(find.byKey(const ValueKey('search-this-area')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('search-this-area')));
    await tester.pumpAndSettle();

    expect(repository.queries.last.bbox, bbox.toQueryParam());
    expect(
      harness.searchController.state.mapViewport.hasPendingSearchArea,
      isFalse,
    );
  });

  testWidgets('shows add-to-tour only when tour engine is enabled',
      (tester) async {
    final repository = FakeListingsRepository([
      searchResponse(ids: ['listing-1']),
    ]);

    final harness =
        await pumpSearchScreen(tester, repository, tourEngine: true);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('add-to-tour-listing-1')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));

    expect(harness.tourController.state.stops.single.listingId, 'listing-1');
    expect(find.text('Added to tour draft'), findsOneWidget);
    expect(find.text('View tour'), findsOneWidget);

    await tester.tap(find.text('View tour'));
    await tester.pumpAndSettle();

    expect(find.text('Tour route'), findsOneWidget);
  });
}
