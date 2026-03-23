import '../models/narration.dart';
import '../models/tour.dart';

/// Callback type for proximity events.
typedef OnProximityEvent = void Function(ProximityEvent event);

/// Placeholder geofence service for detecting proximity to tour stops.
///
/// Real implementation requires native Android/iOS geofence plugins
/// (e.g. geofencing_api, geolocator + custom native code).
/// This class defines the interface and provides a simulation method
/// for development and testing.
///
/// ## Implementation Notes (for future native integration):
/// - Android: Use GeofencingClient from Google Play Services
/// - iOS: Use CLLocationManager region monitoring
/// - Register circular geofences around each tour stop (radius ~100m)
/// - Fire ProximityEvent on enter/dwell/exit transitions
/// - Bridge events to Flutter via platform channels
class ProximityService {
  final List<TourStop> _registeredStops = [];
  OnProximityEvent? _onEvent;
  String? _tourId;

  /// Register geofences around all tour stops.
  /// In production, this would create native geofence regions.
  void registerGeofences({
    required String tourId,
    required List<TourStop> stops,
    required OnProximityEvent onEvent,
  }) {
    _tourId = tourId;
    _registeredStops
      ..clear()
      ..addAll(stops);
    _onEvent = onEvent;
  }

  /// Unregister all active geofences.
  void unregisterAll() {
    _registeredStops.clear();
    _onEvent = null;
    _tourId = null;
  }

  /// Whether geofences are currently registered.
  bool get isActive => _registeredStops.isNotEmpty;

  /// Number of registered geofences.
  int get registeredCount => _registeredStops.length;

  /// Simulate an arrival at a tour stop for development/testing.
  /// Fires a ProximityEvent through the registered callback.
  void simulateArrival(String tourStopId) {
    if (_onEvent == null || _tourId == null) return;

    final stop = _registeredStops
        .where((s) => s.id == tourStopId)
        .toList();
    if (stop.isEmpty) return;

    final matched = stop.first;
    _onEvent!(ProximityEvent(
      tourId: _tourId!,
      tourStopId: matched.id,
      listingId: matched.listingId,
      type: 'arrived',
      location: ProximityLocation(lat: matched.lat, lng: matched.lng),
      distanceMeters: 0,
      timestamp: DateTime.now().toUtc().toIso8601String(),
    ));
  }

  /// Simulate approaching a tour stop (within ~200m).
  void simulateApproaching(String tourStopId) {
    if (_onEvent == null || _tourId == null) return;

    final stop = _registeredStops
        .where((s) => s.id == tourStopId)
        .toList();
    if (stop.isEmpty) return;

    final matched = stop.first;
    _onEvent!(ProximityEvent(
      tourId: _tourId!,
      tourStopId: matched.id,
      listingId: matched.listingId,
      type: 'approaching',
      location: ProximityLocation(lat: matched.lat, lng: matched.lng),
      distanceMeters: 200,
      timestamp: DateTime.now().toUtc().toIso8601String(),
    ));
  }
}
