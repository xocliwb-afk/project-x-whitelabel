import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing.dart';
import '../../../providers/api_provider.dart';
import '../../../services/api_client.dart';

abstract class ListingDetailRepository {
  Future<Listing> getListingById(String id);
}

class ApiListingDetailRepository implements ListingDetailRepository {
  final ApiClient _apiClient;

  const ApiListingDetailRepository(this._apiClient);

  @override
  Future<Listing> getListingById(String id) {
    return _apiClient.getListingById(id);
  }
}

final listingDetailRepositoryProvider =
    Provider<ListingDetailRepository>((ref) {
  return ApiListingDetailRepository(ref.watch(apiClientProvider));
});
