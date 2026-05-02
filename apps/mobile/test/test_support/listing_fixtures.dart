import 'package:project_x_mobile/models/listing.dart';

Listing buildListing(String id, {String? thumbnailUrl}) {
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
    details: const ListingDetails(
      beds: 3,
      baths: 2,
      sqft: 1800,
      status: 'Active',
    ),
    meta: const ListingMeta(daysOnMarket: 4),
  );
}
