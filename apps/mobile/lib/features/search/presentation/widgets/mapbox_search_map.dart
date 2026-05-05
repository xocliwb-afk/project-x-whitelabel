import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;

import '../../../../core/config/app_config.dart';
import '../../../../models/brand_config.dart';

const _fallbackCenter = LatLng(lat: 42.3314, lng: -83.0458);
const _fallbackZoom = 11.0;

class MapboxSearchMap extends StatefulWidget {
  final BrandConfig? brand;
  final double? height;
  final BorderRadius borderRadius;

  const MapboxSearchMap({
    super.key,
    this.brand,
    this.height = 220,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  State<MapboxSearchMap> createState() => _MapboxSearchMapState();
}

class _MapboxSearchMapState extends State<MapboxSearchMap> {
  String? _configuredToken;

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
    );
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
