import '../../models/tour.dart';
import '../../models/narration.dart';

/// Current state of the tour for Android Auto display.
class TourDriveState {
  final Tour tour;
  final TourStop currentStop;
  final TourStop? nextStop;
  final NarrationPayload? currentNarration;
  final int currentStopIndex;
  final int totalStops;
  final bool isNarrating;

  const TourDriveState({
    required this.tour,
    required this.currentStop,
    this.nextStop,
    this.currentNarration,
    required this.currentStopIndex,
    required this.totalStops,
    this.isNarrating = false,
  });
}

/// Events that flow from Android Auto surface back to Flutter.
enum AutoEvent {
  /// User tapped "Next Stop" on Auto
  nextStop,

  /// User tapped "Previous Stop" on Auto
  previousStop,

  /// User paused the tour narration
  pauseNarration,

  /// User resumed the tour narration
  resumeNarration,

  /// User requested navigation to current stop
  navigateToCurrent,
}

/// Placeholder Android Auto service.
///
/// Android Auto requires a native Kotlin CarAppService registered in
/// AndroidManifest.xml. Flutter communicates with it via platform channels.
///
/// ## Architecture Overview
///
/// ### What this class will do when implemented:
/// 1. Register a MethodChannel for Flutter ↔ native communication
/// 2. Push TourDriveState to the native CarAppService
/// 3. Receive AutoEvent callbacks from native UI interactions
/// 4. Coordinate with NarrationService and ProximityService
///
/// ### Data flow: Flutter → Android Auto
/// - Tour state (current stop, next stop, progress)
/// - Narration text for display on Auto screen
/// - Navigation destination for launching Maps/Waze
///
/// ### Data flow: Android Auto → Flutter
/// - User interaction events (next, previous, pause, navigate)
/// - Audio focus changes (another app took audio)
///
/// ### Native requirements (Kotlin side):
/// - CarAppService subclass registered in AndroidManifest.xml
/// - NavigationTemplate for showing tour progress
/// - MessageTemplate for narration text display
/// - Action handlers that invoke Flutter MethodChannel
///
/// See README.md in this directory for full architecture documentation.
class AndroidAutoService {
  bool _isConnected = false;

  /// Whether the Android Auto surface is currently connected.
  bool get isConnected => _isConnected;

  /// Callback for events from the Auto surface.
  void Function(AutoEvent event)? onAutoEvent;

  /// Push tour drive state to the Android Auto surface.
  /// In production, this sends data over a platform channel to the
  /// native CarAppService which updates the Auto UI.
  Future<void> pushTourState(TourDriveState state) async {
    // TODO: Implement platform channel communication
    // const channel = MethodChannel('com.projectx/android_auto');
    // await channel.invokeMethod('updateTourState', state.toMap());
  }

  /// Launch navigation to a destination using the car's navigation app.
  /// Constructs a geo: URI intent that Android Auto routes to Maps/Waze.
  Future<void> navigateToStop(TourStop stop) async {
    // TODO: Implement via platform channel
    // final uri = 'geo:${stop.lat},${stop.lng}?q=${Uri.encodeComponent(stop.address)}';
    // const channel = MethodChannel('com.projectx/android_auto');
    // await channel.invokeMethod('navigate', {'uri': uri});
  }

  /// Simulate connecting to Android Auto (for development/testing).
  void simulateConnect() {
    _isConnected = true;
  }

  /// Simulate disconnecting from Android Auto.
  void simulateDisconnect() {
    _isConnected = false;
  }
}
