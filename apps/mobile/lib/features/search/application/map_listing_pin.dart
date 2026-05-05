import '../../../models/brand_config.dart';
import '../../../models/listing.dart';

class MapListingPin {
  final Listing listing;
  final String label;
  final bool isSelected;
  final bool isFavorited;

  const MapListingPin({
    required this.listing,
    required this.label,
    required this.isSelected,
    required this.isFavorited,
  });

  String get listingId => listing.id;

  LatLng get center => LatLng(
        lat: listing.address.lat,
        lng: listing.address.lng,
      );
}

List<MapListingPin> buildMapListingPins(
  List<Listing> listings, {
  String? selectedListingId,
  Set<String> favoritedListingIds = const {},
}) {
  return listings
      .where(hasValidListingCoordinate)
      .map(
        (listing) => MapListingPin(
          listing: listing,
          label: formatCompactPrice(listing.listPrice),
          isSelected: listing.id == selectedListingId,
          isFavorited: favoritedListingIds.contains(listing.id),
        ),
      )
      .toList(growable: false);
}

bool hasValidListingCoordinate(Listing listing) {
  final lat = listing.address.lat;
  final lng = listing.address.lng;

  return lat.isFinite &&
      lng.isFinite &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;
}

String formatCompactPrice(int price) {
  if (price.abs() >= 1000000) {
    final millions = price / 1000000;
    final compact = millions >= 10
        ? millions.round().toString()
        : millions.toStringAsFixed(1).replaceFirst(RegExp(r'\.0$'), '');
    return '\$${compact}M';
  }

  if (price.abs() >= 1000) {
    return '\$${(price / 1000).round()}K';
  }

  return '\$$price';
}
