import 'package:project_x_mobile/models/listing.dart';

Listing buildListing(
  String id, {
  String? thumbnailUrl,
  String? description,
  ListingAttribution? attribution,
  int listPrice = 425000,
  String? listPriceFormatted,
  double lat = 42.3314,
  double lng = -83.0458,
  int? yearBuilt,
  int? daysOnMarket = 4,
}) {
  return Listing(
    id: id,
    mlsId: 'MLS-$id',
    listPrice: listPrice,
    listPriceFormatted: listPriceFormatted ?? '\$425,000',
    address: ListingAddress(
      full: '$id Main Street, Detroit, MI 48201',
      street: '$id Main Street',
      city: 'Detroit',
      state: 'MI',
      zip: '48201',
      lat: lat,
      lng: lng,
    ),
    media: ListingMedia(
      photos: const [],
      thumbnailUrl: thumbnailUrl,
    ),
    details: ListingDetails(
      beds: 3,
      baths: 2,
      sqft: 1800,
      yearBuilt: yearBuilt,
      status: 'Active',
    ),
    meta: ListingMeta(daysOnMarket: daysOnMarket),
    description: description,
    attribution: attribution,
  );
}
