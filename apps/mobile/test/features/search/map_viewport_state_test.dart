import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/search/application/map_viewport_state.dart';

void main() {
  group('MapSearchBbox', () {
    test('formats bbox query as minLng,minLat,maxLng,maxLat', () {
      final bbox = MapSearchBbox(
        minLng: -83.123456,
        minLat: 42.1,
        maxLng: -82.987654,
        maxLat: 42.5,
      );

      expect(bbox.toQueryParam(), '-83.12346,42.1,-82.98765,42.5');
    });

    test('normalizes reversed bounds before formatting', () {
      final bbox = MapSearchBbox(
        minLng: -82.9,
        minLat: 42.5,
        maxLng: -83.2,
        maxLat: 42.1,
      );

      expect(bbox.toQueryParam(), '-83.2,42.1,-82.9,42.5');
    });

    test('returns null for invalid or missing bbox input', () {
      expect(
        MapSearchBbox.tryCreate(
          minLng: -83,
          minLat: 42,
          maxLng: -83,
          maxLat: 42.5,
        ),
        isNull,
      );
      expect(MapSearchBbox.tryParse(null), isNull);
      expect(MapSearchBbox.tryParse('not,a,bbox'), isNull);
    });

    test('rounds equivalent bounds to avoid duplicate search areas', () {
      final first = MapSearchBbox(
        minLng: -83.123451,
        minLat: 42.123451,
        maxLng: -82.987651,
        maxLat: 42.987651,
      );
      final second = MapSearchBbox(
        minLng: -83.123452,
        minLat: 42.123452,
        maxLng: -82.987652,
        maxLat: 42.987652,
      );

      expect(first, second);
    });
  });
}
