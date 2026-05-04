import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:project_x_mobile/core/theme/app_theme.dart';
import 'package:project_x_mobile/features/tour/application/tour_draft_controller.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/features/tour/presentation/screens/tour_screen.dart';
import 'package:project_x_mobile/models/auth_user.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/providers/api_provider.dart';
import 'package:project_x_mobile/providers/auth_provider.dart';

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

class FakeTourRepository implements TourRepository {
  int planCalls = 0;
  int deleteCalls = 0;
  Object? planResult;
  PlanTourRequest? lastRequest;

  @override
  Future<List<Tour>> listTours() async => [];

  @override
  Future<Tour> getTourById(String id) async => buildTour(id);

  @override
  Future<Tour> planTour(PlanTourRequest request) async {
    planCalls += 1;
    lastRequest = request;
    final next = planResult ?? buildTour('tour-1');
    if (next is Exception) {
      throw next;
    }
    return next as Tour;
  }

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
  Future<void> deleteTour(String id) async {
    deleteCalls += 1;
  }
}

TourDraftStop draftStop(String id) {
  return TourDraftStop(
    listingId: id,
    address: '$id Main Street',
    lat: 42.3314,
    lng: -83.0458,
  );
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

BrandConfig brandConfig({bool tourEngine = true}) {
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

Future<TourDraftController> pumpTourScreen(
  WidgetTester tester,
  FakeTourRepository repository, {
  bool isAuthenticated = false,
  bool tourEngine = true,
  List<TourDraftStop> stops = const [],
  String date = '',
}) async {
  final controller = TourDraftController(repository);
  for (final stop in stops) {
    controller.addStop(stop);
  }
  if (date.isNotEmpty) {
    controller.setSchedule(date: date);
  }
  final brand = brandConfig(tourEngine: tourEngine);
  final router = GoRouter(
    initialLocation: '/tour',
    routes: [
      GoRoute(
        path: '/tour',
        builder: (context, state) => const TourScreen(),
      ),
      GoRoute(
        path: '/tour/drive/:tourId',
        builder: (context, state) {
          return Scaffold(
            body: Text('Drive route ${state.pathParameters['tourId']}'),
          );
        },
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authProvider.overrideWith((ref) {
          return FakeAuthNotifier(
            AuthState(
              isInitialized: true,
              user: isAuthenticated ? buildUser() : null,
            ),
          );
        }),
        brandConfigProvider.overrideWith((ref) async {
          return brand;
        }),
        tourDraftControllerProvider.overrideWith((ref) => controller),
      ],
      child: MaterialApp.router(
        theme: AppTheme(brand: brand).build(),
        routerConfig: router,
      ),
    ),
  );

  await tester.pumpAndSettle();
  return controller;
}

Future<void> scrollUntilFound(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    220,
    scrollable: find.byType(Scrollable).first,
  );
}

void main() {
  testWidgets('renders empty local draft state', (tester) async {
    await pumpTourScreen(tester, FakeTourRepository());

    expect(find.text('Planner'), findsOneWidget);
    expect(find.text('0 stops in local draft'), findsOneWidget);
    expect(
      find.text('No stops yet. Add listings from Search or Listing Detail.'),
      findsOneWidget,
    );
  });

  testWidgets('renders draft stops and supports remove and reorder',
      (tester) async {
    final controller = await pumpTourScreen(
      tester,
      FakeTourRepository(),
      stops: [draftStop('listing-1'), draftStop('listing-2')],
    );

    expect(find.text('listing-1 Main Street'), findsOneWidget);
    expect(find.text('listing-2 Main Street'), findsOneWidget);

    final moveDown = find.byKey(const ValueKey('move-down-listing-1'));
    await scrollUntilFound(tester, moveDown);
    await tester.tap(moveDown);
    await tester.pump();

    expect(controller.state.stops.map((stop) => stop.listingId), [
      'listing-2',
      'listing-1',
    ]);

    await tester.tap(find.byKey(const ValueKey('remove-stop-listing-2')));
    await tester.pump();

    expect(controller.state.stops.map((stop) => stop.listingId), [
      'listing-1',
    ]);
    expect(find.text('1 stop in local draft'), findsOneWidget);
  });

  testWidgets('signed-out save shows auth requirement and preserves draft',
      (tester) async {
    final repository = FakeTourRepository();
    final controller = await pumpTourScreen(
      tester,
      repository,
      stops: [draftStop('listing-1')],
      date: '2026-05-02',
    );

    final saveButton = find.byKey(const ValueKey('save-tour-draft'));
    await scrollUntilFound(tester, saveButton);
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    expect(repository.planCalls, 0);
    expect(controller.state.stops.single.listingId, 'listing-1');
    expect(find.text('Sign in to save tours.'), findsOneWidget);
  });

  testWidgets('signed-in save persists and shows saved tour status',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final repository = FakeTourRepository()..planResult = buildTour('tour-9');
    await pumpTourScreen(
      tester,
      repository,
      isAuthenticated: true,
      stops: [draftStop('listing-1')],
      date: '2026-05-02',
    );

    final saveButton = find.byKey(const ValueKey('save-tour-draft'));
    await scrollUntilFound(tester, saveButton);
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    expect(repository.planCalls, 1);
    expect(repository.lastRequest?.date, '2026-05-02');
    expect(find.text('Saved tour'), findsOneWidget);
    expect(find.text('Planned Tour • 1 stop'), findsOneWidget);

    final driveButton = find.byKey(const ValueKey('drive-current-tour'));
    await scrollUntilFound(tester, driveButton);
    expect(driveButton, findsOneWidget);
    expect(find.text('Drive mode'), findsOneWidget);
    expect(tester.widget<FilledButton>(driveButton).onPressed, isNotNull);
    expect(find.byKey(const ValueKey('delete-current-tour')), findsOneWidget);

    await tester.tap(driveButton);
    await tester.pumpAndSettle();

    expect(find.text('Drive route tour-9'), findsOneWidget);
  });

  testWidgets('failed signed-in save preserves local draft', (tester) async {
    final repository = FakeTourRepository()
      ..planResult = Exception('save failed');
    final controller = await pumpTourScreen(
      tester,
      repository,
      isAuthenticated: true,
      stops: [draftStop('listing-1')],
      date: '2026-05-02',
    );

    final saveButton = find.byKey(const ValueKey('save-tour-draft'));
    await scrollUntilFound(tester, saveButton);
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    expect(repository.planCalls, 1);
    expect(controller.state.stops.single.listingId, 'listing-1');
    expect(find.textContaining('save failed'), findsOneWidget);
  });

  testWidgets('tour engine disabled keeps draft visible and hides save',
      (tester) async {
    await pumpTourScreen(
      tester,
      FakeTourRepository(),
      tourEngine: false,
      stops: [draftStop('listing-1')],
      date: '2026-05-02',
    );

    expect(find.text('listing-1 Main Street'), findsOneWidget);
    expect(find.byKey(const ValueKey('save-tour-draft')), findsNothing);
    final disabledMessage =
        find.text('Tour saving is not enabled for this brand.');
    await scrollUntilFound(tester, disabledMessage);
    expect(disabledMessage, findsOneWidget);
  });
}
