import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;

import '../../../../core/config/app_config.dart';
import '../../../../models/brand_config.dart';
import '../../../../models/listing.dart';
import '../../application/map_listing_pin.dart';
import '../../application/map_viewport_state.dart';

const _fallbackCenter = LatLng(lat: 42.3314, lng: -83.0458);
const _fallbackZoom = 11.0;

typedef MapCameraChanged = void Function({
  required LatLng center,
  required double zoom,
  required MapSearchBbox? visibleBbox,
  required MapCameraChangeSource source,
});

class MapboxSearchMap extends StatefulWidget {
  final BrandConfig? brand;
  final double? height;
  final BorderRadius borderRadius;
  final List<Listing> listings;
  final String? selectedListingId;
  final ValueChanged<String>? onPinTap;
  final VoidCallback? onMapReady;
  final MapCameraChanged? onCameraChanged;

  const MapboxSearchMap({
    super.key,
    this.brand,
    this.height = 220,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
    this.listings = const [],
    this.selectedListingId,
    this.onPinTap,
    this.onMapReady,
    this.onCameraChanged,
  });

  @override
  State<MapboxSearchMap> createState() => _MapboxSearchMapState();
}

class _MapboxSearchMapState extends State<MapboxSearchMap> {
  String? _configuredToken;
  mapbox.MapboxMap? _mapboxMap;
  mapbox.PointAnnotationManager? _pointAnnotationManager;
  mapbox.Cancelable? _pinTapEvents;
  MapCameraChangeSource _nextCameraChangeSource =
      MapCameraChangeSource.programmatic;
  String? _annotationSignature;
  bool _isDisposed = false;

  @override
  void didUpdateWidget(covariant MapboxSearchMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.listings != widget.listings ||
        oldWidget.selectedListingId != widget.selectedListingId) {
      unawaited(_syncPricePins());
    }

    if (oldWidget.selectedListingId != widget.selectedListingId) {
      unawaited(_focusSelectedListing());
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _pinTapEvents?.cancel();
    unawaited(_pointAnnotationManager?.deleteAll());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final token = AppConfig.mapboxAccessToken;
    final center = widget.brand?.search?.defaultCenter ?? _fallbackCenter;
    final zoom = widget.brand?.search?.defaultZoom?.toDouble() ?? _fallbackZoom;

    final mapContent = ClipRRect(
      borderRadius: widget.borderRadius,
      child: token == null
          ? const _MissingTokenMapPlaceholder()
          : _buildMap(
              token: token,
              center: center,
              zoom: zoom,
            ),
    );

    if (widget.height == null) {
      return SizedBox.expand(
        key: const ValueKey('mapbox-search-shell'),
        child: mapContent,
      );
    }

    return SizedBox(
      key: const ValueKey('mapbox-search-shell'),
      height: widget.height,
      width: double.infinity,
      child: mapContent,
    );
  }

  Widget _buildMap({
    required String token,
    required LatLng center,
    required double zoom,
  }) {
    if (_configuredToken != token) {
      mapbox.MapboxOptions.setAccessToken(token);
      _configuredToken = token;
    }

    return mapbox.MapWidget(
      key: const ValueKey('mapbox-search-map'),
      styleUri: mapbox.MapboxStyles.STANDARD,
      viewport: mapbox.CameraViewportState(
        center: mapbox.Point(
          coordinates: mapbox.Position(center.lng, center.lat),
        ),
        zoom: zoom,
      ),
      onMapCreated: _onMapCreated,
      onScrollListener: (_) => _markUserCameraChange(),
      onZoomListener: (_) => _markUserCameraChange(),
      onMapIdleListener: (_) {
        final source = _nextCameraChangeSource;
        _nextCameraChangeSource = MapCameraChangeSource.programmatic;
        unawaited(_emitCameraChanged(source));
      },
    );
  }

  Future<void> _onMapCreated(mapbox.MapboxMap mapboxMap) async {
    _mapboxMap = mapboxMap;
    widget.onMapReady?.call();
    await _setUpAnnotations(mapboxMap);
    await _emitCameraChanged(MapCameraChangeSource.programmatic);
  }

  Future<void> _setUpAnnotations(mapbox.MapboxMap mapboxMap) async {
    final manager = await mapboxMap.annotations.createPointAnnotationManager();
    if (_isDisposed) {
      unawaited(manager.deleteAll());
      return;
    }

    _pointAnnotationManager = manager;
    _pinTapEvents = manager.tapEvents(
      onTap: (annotation) {
        final listingId = annotation.customData?['listingId'];
        if (listingId is String) {
          widget.onPinTap?.call(listingId);
        }
      },
    );
    await _syncPricePins();
  }

  Future<void> _syncPricePins() async {
    final manager = _pointAnnotationManager;
    if (manager == null || _isDisposed) {
      return;
    }

    final pins = buildMapListingPins(
      widget.listings,
      selectedListingId: widget.selectedListingId,
    );
    final signature = pins
        .map((pin) =>
            '${pin.listingId}:${pin.center.lat}:${pin.center.lng}:${pin.label}:${pin.isSelected}')
        .join('|');

    if (signature == _annotationSignature) {
      return;
    }
    _annotationSignature = signature;

    await manager.deleteAll();
    if (_isDisposed || pins.isEmpty) {
      return;
    }

    await manager.createMulti(
      pins.map(_annotationForPin).toList(growable: false),
    );
  }

  mapbox.PointAnnotationOptions _annotationForPin(MapListingPin pin) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final selected = pin.isSelected;

    return mapbox.PointAnnotationOptions(
      geometry: mapbox.Point(
        coordinates: mapbox.Position(pin.center.lng, pin.center.lat),
      ),
      textField: pin.label,
      textAnchor: mapbox.TextAnchor.CENTER,
      textJustify: mapbox.TextJustify.CENTER,
      textSize: selected ? 16 : 14,
      textColor: _mapboxColor(
        selected ? colorScheme.primary : colorScheme.onSurface,
      ),
      textHaloColor: _mapboxColor(
        selected ? colorScheme.primaryContainer : colorScheme.surface,
      ),
      textHaloWidth: selected ? 3 : 2,
      textEmissiveStrength: 1,
      symbolSortKey: selected ? 1 : 0,
      customData: {'listingId': pin.listingId},
    );
  }

  Future<void> _focusSelectedListing() async {
    final mapboxMap = _mapboxMap;
    final selectedListingId = widget.selectedListingId;
    if (mapboxMap == null || selectedListingId == null || _isDisposed) {
      return;
    }

    Listing? selectedListing;
    for (final listing in widget.listings) {
      if (listing.id == selectedListingId &&
          hasValidListingCoordinate(listing)) {
        selectedListing = listing;
        break;
      }
    }
    if (selectedListing == null) {
      return;
    }

    _nextCameraChangeSource = MapCameraChangeSource.programmatic;
    await mapboxMap.easeTo(
      mapbox.CameraOptions(
        center: mapbox.Point(
          coordinates: mapbox.Position(
            selectedListing.address.lng,
            selectedListing.address.lat,
          ),
        ),
      ),
      mapbox.MapAnimationOptions(duration: 250),
    );
  }

  void _markUserCameraChange() {
    _nextCameraChangeSource = MapCameraChangeSource.user;
  }

  Future<void> _emitCameraChanged(MapCameraChangeSource source) async {
    final mapboxMap = _mapboxMap;
    final onCameraChanged = widget.onCameraChanged;
    if (mapboxMap == null || onCameraChanged == null || _isDisposed) {
      return;
    }

    try {
      final cameraState = await mapboxMap.getCameraState();
      final bounds = await mapboxMap.coordinateBoundsForCamera(
        mapbox.CameraOptions(
          center: cameraState.center,
          zoom: cameraState.zoom,
          bearing: cameraState.bearing,
          pitch: cameraState.pitch,
        ),
      );
      if (_isDisposed) {
        return;
      }

      onCameraChanged(
        center: _latLngFromPoint(cameraState.center),
        zoom: cameraState.zoom,
        visibleBbox: _bboxFromCoordinateBounds(bounds),
        source: source,
      );
    } catch (_) {
      // Mapbox can reject camera/bounds reads while the native map is still
      // settling. Ignore the transient miss and wait for the next idle event.
    }
  }

  MapSearchBbox? _bboxFromCoordinateBounds(mapbox.CoordinateBounds bounds) {
    if (bounds.infiniteBounds) {
      return null;
    }

    final southwest = bounds.southwest.coordinates;
    final northeast = bounds.northeast.coordinates;
    return MapSearchBbox.tryCreate(
      minLng: southwest.lng.toDouble(),
      minLat: southwest.lat.toDouble(),
      maxLng: northeast.lng.toDouble(),
      maxLat: northeast.lat.toDouble(),
    );
  }

  LatLng _latLngFromPoint(mapbox.Point point) {
    return LatLng(
      lat: point.coordinates.lat.toDouble(),
      lng: point.coordinates.lng.toDouble(),
    );
  }

  int _mapboxColor(Color color) {
    final alpha = (color.a * 255).round();
    final red = (color.r * 255).round();
    final green = (color.g * 255).round();
    final blue = (color.b * 255).round();
    return alpha << 24 | red << 16 | green << 8 | blue;
  }
}

class _MissingTokenMapPlaceholder extends StatelessWidget {
  const _MissingTokenMapPlaceholder();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return DecoratedBox(
      key: const ValueKey('mapbox-token-missing'),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.map_outlined,
                size: 36,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 8),
              Text(
                'Map preview unavailable',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'Set MAPBOX_ACCESS_TOKEN to render the Mapbox search map.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
