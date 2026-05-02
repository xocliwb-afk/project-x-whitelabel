import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/listing_detail/data/listing_detail_repository.dart';
import 'package:project_x_mobile/features/listing_detail/presentation/screens/listing_detail_screen.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/listing.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/providers/api_provider.dart';

import '../../test_support/listing_fixtures.dart';
import '../../test_support/tour_fixtures.dart';

class FakeListingDetailRepository implements ListingDetailRepository {
  final List<Object> results;
  int calls = 0;

  FakeListingDetailRepository(this.results);

  @override
  Future<Listing> getListingById(String id) async {
    calls += 1;
    final next = results.removeAt(0);
    if (next is Exception) {
      throw next;
    }
    if (next is Future<Listing>) {
      return next;
    }
    return next as Listing;
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

Future<void> pumpListingDetailScreen(
  WidgetTester tester,
  FakeListingDetailRepository repository, {
  Listing? preview,
  bool tourEngine = false,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        listingDetailRepositoryProvider.overrideWithValue(repository),
        brandConfigProvider.overrideWith((ref) async {
          return brandConfig(tourEngine: tourEngine);
        }),
        tourDraftControllerProvider.overrideWith((ref) {
          return TourDraftController(FakeTourRepository());
        }),
      ],
      child: MaterialApp(
        home: ListingDetailScreen(
          listingId: preview?.id ?? 'listing-1',
          previewListing: preview,
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('renders preview immediately while full detail loads',
      (tester) async {
    final preview = buildListing('listing-1');
    final completer = Completer<Listing>();
    final repository = FakeListingDetailRepository([completer.future]);

    await pumpListingDetailScreen(tester, repository, preview: preview);

    expect(find.text('\$425,000'), findsOneWidget);
    expect(
        find.text('listing-1 Main Street, Detroit, MI 48201'), findsOneWidget);

    await tester.pump();
    expect(find.text('Showing preview while details load'), findsOneWidget);

    completer.complete(buildListing('listing-1', description: 'Full remarks'));
    await tester.pumpAndSettle();

    expect(find.text('Full remarks'), findsOneWidget);
  });

  testWidgets('renders full detail content after loading', (tester) async {
    final detail = buildListing(
      'listing-1',
      description: 'Updated full listing remarks',
      yearBuilt: 1928,
      attribution: const ListingAttribution(
        mlsName: 'MLS Grid',
        disclaimer: 'MLS disclaimer text',
      ),
    );
    final repository = FakeListingDetailRepository([detail]);

    await pumpListingDetailScreen(tester, repository);
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
    expect(find.text('Updated full listing remarks'), findsOneWidget);
    expect(find.text('1928'), findsOneWidget);
    expect(find.text('Provided by MLS Grid'), findsOneWidget);
    expect(find.text('MLS disclaimer text'), findsOneWidget);
  });

  testWidgets('failed fetch preserves preview with inline retry',
      (tester) async {
    final preview = buildListing('listing-1');
    final repository = FakeListingDetailRepository([
      Exception('detail failed'),
      buildListing('listing-1', description: 'Recovered detail'),
    ]);

    await pumpListingDetailScreen(tester, repository, preview: preview);
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
    expect(find.textContaining('detail failed'), findsOneWidget);

    await tester.ensureVisible(find.text('Retry'));
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('Recovered detail'), findsOneWidget);
  });

  testWidgets('failed fetch without preview shows full-screen retry error',
      (tester) async {
    final repository = FakeListingDetailRepository([
      Exception('not found'),
      buildListing('listing-1'),
    ]);

    await pumpListingDetailScreen(tester, repository);
    await tester.pumpAndSettle();

    expect(find.text('Listing unavailable'), findsOneWidget);
    expect(find.textContaining('not found'), findsOneWidget);

    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();

    expect(find.text('\$425,000'), findsOneWidget);
  });

  testWidgets('hides add-to-tour when tour engine is disabled', (tester) async {
    final repository = FakeListingDetailRepository([buildListing('listing-1')]);

    await pumpListingDetailScreen(tester, repository);
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('detail-add-to-tour')), findsNothing);
  });

  testWidgets('adds to local tour draft when tour engine is enabled',
      (tester) async {
    await pumpListingDetailScreen(
      tester,
      FakeListingDetailRepository([buildListing('listing-1')]),
      tourEngine: true,
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('detail-add-to-tour')));
    await tester.pump();

    expect(find.text('Added to tour draft'), findsOneWidget);
  });
}
