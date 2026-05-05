import 'dart:math' as math;

import '../../../models/brand_config.dart';

const _noChange = Object();

enum MapCameraChangeSource {
  user,
  programmatic,
}

class MapSearchBbox {
  final double minLng;
  final double minLat;
  final double maxLng;
  final double maxLat;

  const MapSearchBbox._({
    required this.minLng,
    required this.minLat,
    required this.maxLng,
    required this.maxLat,
  });

  factory MapSearchBbox({
    required double minLng,
    required double minLat,
    required double maxLng,
    required double maxLat,
  }) {
    final bbox = MapSearchBbox.tryCreate(
      minLng: minLng,
      minLat: minLat,
      maxLng: maxLng,
      maxLat: maxLat,
    );
    if (bbox == null) {
      throw ArgumentError.value(
        [minLng, minLat, maxLng, maxLat],
        'bbox',
        'Expected finite bounds with non-zero width and height.',
      );
    }
    return bbox;
  }

  static MapSearchBbox? tryCreate({
    required double minLng,
    required double minLat,
    required double maxLng,
    required double maxLat,
  }) {
    final values = [minLng, minLat, maxLng, maxLat];
    if (values.any((value) => !value.isFinite)) {
      return null;
    }

    final normalizedMinLng = _round(math.min(minLng, maxLng));
    final normalizedMaxLng = _round(math.max(minLng, maxLng));
    final normalizedMinLat = _round(math.min(minLat, maxLat));
    final normalizedMaxLat = _round(math.max(minLat, maxLat));

    if (normalizedMinLng >= normalizedMaxLng ||
        normalizedMinLat >= normalizedMaxLat) {
      return null;
    }

    return MapSearchBbox._(
      minLng: normalizedMinLng,
      minLat: normalizedMinLat,
      maxLng: normalizedMaxLng,
      maxLat: normalizedMaxLat,
    );
  }

  static MapSearchBbox? tryParse(String? raw) {
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }
    final parts = raw.split(',').map((part) => double.tryParse(part.trim()));
    final values = parts.toList(growable: false);
    if (values.length != 4 || values.any((value) => value == null)) {
      return null;
    }
    return tryCreate(
      minLng: values[0]!,
      minLat: values[1]!,
      maxLng: values[2]!,
      maxLat: values[3]!,
    );
  }

  String toQueryParam() {
    return [
      _format(minLng),
      _format(minLat),
      _format(maxLng),
      _format(maxLat),
    ].join(',');
  }

  static double _round(double value) {
    final rounded = double.parse(value.toStringAsFixed(5));
    return rounded == 0 ? 0 : rounded;
  }

  static String _format(double value) {
    return value.toStringAsFixed(5).replaceFirst(RegExp(r'\.?0+$'), '');
  }

  @override
  bool operator ==(Object other) {
    return other is MapSearchBbox &&
        other.minLng == minLng &&
        other.minLat == minLat &&
        other.maxLng == maxLng &&
        other.maxLat == maxLat;
  }

  @override
  int get hashCode => Object.hash(minLng, minLat, maxLng, maxLat);

  @override
  String toString() => toQueryParam();
}

class MapViewportState {
  final MapSearchBbox? draftVisibleBbox;
  final MapSearchBbox? committedSearchBbox;
  final MapSearchBbox? lastSuccessfulBbox;
  final LatLng? cameraCenter;
  final double? zoom;
  final bool isMapReady;
  final bool hasPendingSearchArea;
  final String? selectedListingId;

  const MapViewportState({
    this.draftVisibleBbox,
    this.committedSearchBbox,
    this.lastSuccessfulBbox,
    this.cameraCenter,
    this.zoom,
    this.isMapReady = false,
    this.hasPendingSearchArea = false,
    this.selectedListingId,
  });

  MapViewportState copyWith({
    Object? draftVisibleBbox = _noChange,
    Object? committedSearchBbox = _noChange,
    Object? lastSuccessfulBbox = _noChange,
    Object? cameraCenter = _noChange,
    Object? zoom = _noChange,
    bool? isMapReady,
    bool? hasPendingSearchArea,
    Object? selectedListingId = _noChange,
  }) {
    return MapViewportState(
      draftVisibleBbox: identical(draftVisibleBbox, _noChange)
          ? this.draftVisibleBbox
          : draftVisibleBbox as MapSearchBbox?,
      committedSearchBbox: identical(committedSearchBbox, _noChange)
          ? this.committedSearchBbox
          : committedSearchBbox as MapSearchBbox?,
      lastSuccessfulBbox: identical(lastSuccessfulBbox, _noChange)
          ? this.lastSuccessfulBbox
          : lastSuccessfulBbox as MapSearchBbox?,
      cameraCenter: identical(cameraCenter, _noChange)
          ? this.cameraCenter
          : cameraCenter as LatLng?,
      zoom: identical(zoom, _noChange) ? this.zoom : zoom as double?,
      isMapReady: isMapReady ?? this.isMapReady,
      hasPendingSearchArea: hasPendingSearchArea ?? this.hasPendingSearchArea,
      selectedListingId: identical(selectedListingId, _noChange)
          ? this.selectedListingId
          : selectedListingId as String?,
    );
  }
}
