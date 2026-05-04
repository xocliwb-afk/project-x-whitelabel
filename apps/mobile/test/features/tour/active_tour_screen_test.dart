import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/tour/data/tour_repository.dart';
import 'package:project_x_mobile/features/tour/presentation/screens/active_tour_screen.dart';
import 'package:project_x_mobile/models/narration.dart';
import 'package:project_x_mobile/models/tour.dart';
import 'package:project_x_mobile/services/narration_service.dart';
import 'package:project_x_mobile/services/proximity_event_source.dart';

class FakeTourRepository implements TourRepository {
  final Map<String, Tour> tours;
  final Object? failure;

  const FakeTourRepository({
    required this.tours,
    this.failure,
  });

  @override
  Future<List<Tour>> listTours() async => tours.values.toList();

  @override
  Future<Tour> getTourById(String id) async {
    final failure = this.failure;
    if (failure != null) {
      throw failure;
    }

    final tour = tours[id];
    if (tour == null) {
      throw Exception('tour not found');
    }
    return tour;
  }

  @override
  Future<Tour> planTour(PlanTourRequest request) async {
    throw UnimplementedError();
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
    throw UnimplementedError();
  }

  @override
  Future<void> deleteTour(String id) async {
    throw UnimplementedError();
  }
}

class FakeNarrationService implements NarrationService {
  final List<NarrationPayload> payloads;

  const FakeNarrationService({this.payloads = const []});

  @override
  Future<List<NarrationPayload>> fetchTourNarrations(String tourId) async {
    return payloads;
  }
}

class FakeTtsEngine implements TtsEngine {
  final bool completeSpeakImmediately;
  int speakCalls = 0;
  int stopCalls = 0;
  Object? speakFailure;
  final List<String> calls = [];
  bool _speaking = false;
  Completer<void>? _pendingSpeak;

  FakeTtsEngine({
    this.completeSpeakImmediately = true,
  });

  @override
  Future<void> speak(NarrationPayload payload) async {
    await speakText(payload.narrationText);
  }

  @override
  Future<void> speakText(String text) async {
    calls.add('speak:$text');
    speakCalls += 1;
    final failure = speakFailure;
    if (failure != null) {
      throw failure;
    }

    _speaking = true;
    if (!completeSpeakImmediately) {
      _pendingSpeak = Completer<void>();
      await _pendingSpeak!.future;
    }
    _speaking = false;
  }

  @override
  Future<void> stop() async {
    calls.add('stop');
    stopCalls += 1;
    _speaking = false;
  }

  @override
  bool get isSpeaking => _speaking;

  void completeSpeak() {
    final pendingSpeak = _pendingSpeak;
    if (pendingSpeak == null || pendingSpeak.isCompleted) {
      return;
    }

    pendingSpeak.complete();
  }
}

TourStop tourStop(String id, int order, String address) {
  return TourStop(
    id: id,
    listingId: 'listing-$id',
    order: order,
    address: address,
    lat: 42.3314 + order,
    lng: -83.0458 - order,
  );
}

Tour buildTour({
  String id = 'tour-1',
  List<TourStop>? stops,
  List<NarrationPayload>? narrationPayloads,
}) {
  return Tour(
    id: id,
    title: 'Planned Tour',
    clientName: 'Client',
    date: '2026-05-03',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    stops: stops ??
        [
          tourStop('stop-1', 0, '1 Main Street'),
          tourStop('stop-2', 1, '2 Main Street'),
        ],
    narrationPayloads: narrationPayloads,
  );
}

NarrationPayload narrationPayload({
  required TourStop stop,
  required String trigger,
  required String text,
}) {
  return NarrationPayload(
    tourStopId: stop.id,
    listingId: stop.listingId,
    trigger: trigger,
    narrationText: text,
  );
}

Future<void> pumpActiveTourScreen(
  WidgetTester tester, {
  Tour? tour,
  Object? failure,
  List<NarrationPayload> narrationPayloads = const [],
  SimulatedProximityEventSource? source,
  TtsEngine? ttsEngine,
}) async {
  final proximitySource = source ?? SimulatedProximityEventSource();
  addTearDown(proximitySource.close);
  final activeTour = tour ?? buildTour();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        tourRepositoryProvider.overrideWithValue(
          FakeTourRepository(
            tours: {activeTour.id: activeTour},
            failure: failure,
          ),
        ),
        narrationServiceProvider.overrideWithValue(
          FakeNarrationService(payloads: narrationPayloads),
        ),
        proximityEventSourceProvider.overrideWithValue(proximitySource),
        ttsEngineProvider.overrideWithValue(ttsEngine ?? NoOpTtsEngine()),
      ],
      child: MaterialApp(
        home: ActiveTourScreen(tourId: activeTour.id),
      ),
    ),
  );

  await tester.pumpAndSettle();
}

Future<void> tapControl(WidgetTester tester, Key key) async {
  final finder = find.byKey(key);
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('loads active tour and renders current stop', (tester) async {
    await pumpActiveTourScreen(tester);

    expect(find.text('Active Tour'), findsOneWidget);
    expect(find.text('Status: ready'), findsOneWidget);
    expect(find.text('Planned Tour'), findsOneWidget);
    expect(find.text('Stop 1 of 2'), findsOneWidget);
    expect(find.text('1 Main Street'), findsOneWidget);
    expect(find.text('Next: 2 Main Street'), findsOneWidget);
    expect(find.text('No narration selected'), findsOneWidget);
  });

  testWidgets('start next previous and end controls update runtime display',
      (tester) async {
    await pumpActiveTourScreen(tester);

    await tapControl(tester, const ValueKey('active-tour-start'));
    expect(find.text('Status: driving'), findsOneWidget);

    await tapControl(tester, const ValueKey('active-tour-next'));
    expect(find.text('Stop 2 of 2'), findsOneWidget);
    expect(find.text('2 Main Street'), findsOneWidget);

    await tapControl(tester, const ValueKey('active-tour-previous'));
    expect(find.text('Stop 1 of 2'), findsOneWidget);

    await tapControl(tester, const ValueKey('active-tour-end'));
    expect(find.text('Status: finished'), findsOneWidget);
  });

  testWidgets('simulate approaching displays approaching narration',
      (tester) async {
    final first = tourStop('stop-1', 0, '1 Main Street');
    final tour = buildTour(
      stops: [
        first,
        tourStop('stop-2', 1, '2 Main Street'),
      ],
    );

    await pumpActiveTourScreen(
      tester,
      tour: tour,
      narrationPayloads: [
        narrationPayload(
          stop: first,
          trigger: 'approaching',
          text: 'Approaching the first stop.',
        ),
      ],
    );

    await tapControl(
      tester,
      const ValueKey('active-tour-simulate-approaching'),
    );

    expect(find.text('Status: narrating'), findsOneWidget);
    expect(find.text('Approaching the first stop.'), findsOneWidget);
    expect(find.byKey(const ValueKey('active-tour-stop-narration')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('active-tour-replay-narration')),
        findsOneWidget);
  });

  testWidgets('simulate arrived displays fallback narration when missing',
      (tester) async {
    await pumpActiveTourScreen(tester);

    await tapControl(tester, const ValueKey('active-tour-simulate-arrived'));

    expect(find.text('Status: narrating'), findsOneWidget);
    expect(find.text('Arrived at 1 Main Street.'), findsOneWidget);
  });

  testWidgets('audio controls are hidden until narration exists',
      (tester) async {
    await pumpActiveTourScreen(tester);

    expect(
        find.byKey(const ValueKey('active-tour-stop-narration')), findsNothing);
    expect(find.byKey(const ValueKey('active-tour-replay-narration')),
        findsNothing);

    await tapControl(tester, const ValueKey('active-tour-simulate-arrived'));

    expect(find.byKey(const ValueKey('active-tour-stop-narration')),
        findsOneWidget);
    expect(find.byKey(const ValueKey('active-tour-replay-narration')),
        findsOneWidget);
  });

  testWidgets('stop narration keeps visible text and updates audio status',
      (tester) async {
    final ttsEngine = FakeTtsEngine(completeSpeakImmediately: false);
    await pumpActiveTourScreen(tester, ttsEngine: ttsEngine);

    await tapControl(tester, const ValueKey('active-tour-simulate-arrived'));
    await tapControl(tester, const ValueKey('active-tour-stop-narration'));

    expect(find.text('Arrived at 1 Main Street.'), findsOneWidget);
    expect(find.text('Audio: stopped'), findsOneWidget);
    expect(ttsEngine.stopCalls, 2);

    ttsEngine.completeSpeak();
    await tester.pump();
  });

  testWidgets('replay narration speaks current visible narration text',
      (tester) async {
    final ttsEngine = FakeTtsEngine();
    await pumpActiveTourScreen(tester, ttsEngine: ttsEngine);

    await tapControl(tester, const ValueKey('active-tour-simulate-arrived'));
    expect(ttsEngine.speakCalls, 1);

    await tapControl(tester, const ValueKey('active-tour-replay-narration'));

    expect(find.text('Arrived at 1 Main Street.'), findsOneWidget);
    expect(ttsEngine.calls, [
      'stop',
      'speak:Arrived at 1 Main Street.',
      'stop',
      'speak:Arrived at 1 Main Street.',
    ]);
  });

  testWidgets('playback error is visible and non-blocking', (tester) async {
    final ttsEngine = FakeTtsEngine()
      ..speakFailure = const TtsEngineException('raw plugin failure');
    await pumpActiveTourScreen(tester, ttsEngine: ttsEngine);

    await tapControl(tester, const ValueKey('active-tour-simulate-arrived'));

    expect(find.byKey(const ValueKey('active-tour-playback-error')),
        findsOneWidget);
    expect(find.text('Unable to play narration audio.'), findsOneWidget);

    await tapControl(tester, const ValueKey('active-tour-next'));

    expect(find.text('Stop 2 of 2'), findsOneWidget);
  });

  testWidgets('load failure displays graceful error', (tester) async {
    await pumpActiveTourScreen(
      tester,
      failure: Exception('load failed'),
    );

    expect(find.text('Status: error'), findsOneWidget);
    expect(find.byKey(const ValueKey('active-tour-error')), findsOneWidget);
    expect(find.textContaining('load failed'), findsOneWidget);
    expect(find.text('Current stop unavailable'), findsOneWidget);
  });
}
