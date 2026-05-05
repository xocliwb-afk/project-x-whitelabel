import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/search/application/map_listing_pin.dart';

import '../../test_support/listing_fixtures.dart';

void main() {
  group('formatCompactPrice', () {
    test('formats listing prices for map pins', () {
      expect(formatCompactPrice(425000), '\$425K');
      expect(formatCompactPrice(950000), '\$950K');
      expect(formatCompactPrice(1200000), '\$1.2M');
      expect(formatCompactPrice(1000000), '\$1M');
    });
  });

  group('buildMapListingPins', () {
    test('returns pins only for listings with valid coordinates', () {
      final pins = buildMapListingPins([
        buildListing('listing-1'),
        buildListing('bad-lat', lat: 91),
        buildListing('bad-lng', lng: -181),
        buildListing('nan', lat: double.nan),
      ]);

      expect(pins.map((pin) => pin.listingId), ['listing-1']);
      expect(pins.single.center.lat, 42.3314);
      expect(pins.single.center.lng, -83.0458);
    });

    test('marks the selected listing pin', () {
      final pins = buildMapListingPins(
        [
          buildListing('listing-1'),
          buildListing('listing-2'),
        ],
        selectedListingId: 'listing-2',
      );

      expect(pins.first.isSelected, isFalse);
      expect(pins.last.isSelected, isTrue);
    });

    test('marks favorited listing pins', () {
      final pins = buildMapListingPins(
        [
          buildListing('listing-1'),
          buildListing('listing-2'),
        ],
        favoritedListingIds: {'listing-1'},
      );

      expect(pins.first.isFavorited, isTrue);
      expect(pins.last.isFavorited, isFalse);
    });
  });
}
