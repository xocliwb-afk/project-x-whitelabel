import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../providers/api_provider.dart';
import '../../../services/api_client.dart';

abstract class FavoritesRepository {
  Future<Set<String>> listFavoriteIds();
  Future<void> addFavorite(String listingId);
  Future<void> removeFavorite(String listingId);
}

class ApiFavoritesRepository implements FavoritesRepository {
  final ApiClient _apiClient;

  const ApiFavoritesRepository(this._apiClient);

  @override
  Future<Set<String>> listFavoriteIds() {
    return _apiClient.getFavoriteListingIds();
  }

  @override
  Future<void> addFavorite(String listingId) {
    return _apiClient.addFavorite(listingId);
  }

  @override
  Future<void> removeFavorite(String listingId) {
    return _apiClient.removeFavorite(listingId);
  }
}

final favoritesRepositoryProvider = Provider<FavoritesRepository>((ref) {
  return ApiFavoritesRepository(ref.watch(apiClientProvider));
});
