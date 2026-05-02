import 'package:project_x_mobile/models/listing.dart';

Listing buildListing(
  String id, {
  String? thumbnailUrl,
  String? description,
  ListingAttribution? attribution,
  int? yearBuilt,
  int? daysOnMarket = 4,
}) {
  return Listing(
    id: id,
    mlsId: 'MLS-$id',
    listPrice: 425000,
    listPriceFormatted: '\$425,000',
    address: ListingAddress(
      full: '$id Main Street, Detroit, MI 48201',
      street: '$id Main Street',
      city: 'Detroit',
      state: 'MI',
      zip: '48201',
      lat: 42.3314,
      lng: -83.0458,
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
