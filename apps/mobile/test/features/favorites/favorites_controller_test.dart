import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/favorites/application/favorites_controller.dart';
import 'package:project_x_mobile/features/favorites/data/favorites_repository.dart';
import 'package:project_x_mobile/providers/auth_provider.dart';
import 'package:project_x_mobile/services/api_client.dart';

import '../../test_support/auth_fixtures.dart';

class FakeFavoritesRepository implements FavoritesRepository {
  Set<String> ids;
  Object? listError;
  Object? addError;
  Object? removeError;
  int listCalls = 0;
  final List<String> addCalls = [];
  final List<String> removeCalls = [];

  FakeFavoritesRepository({
    Set<String> initialIds = const {},
    this.listError,
    this.addError,
    this.removeError,
  }) : ids = Set<String>.from(initialIds);

  @override
  Future<Set<String>> listFavoriteIds() async {
    listCalls += 1;
    final error = listError;
    if (error != null) {
      throw error;
    }
    return Set<String>.from(ids);
  }

  @override
  Future<void> addFavorite(String listingId) async {
    addCalls.add(listingId);
    final error = addError;
    if (error != null) {
      throw error;
    }
    ids.add(listingId);
  }

  @override
  Future<void> removeFavorite(String listingId) async {
    removeCalls.add(listingId);
    final error = removeError;
    if (error != null) {
      throw error;
    }
    ids.remove(listingId);
  }
}

AuthState signedInState() {
  return AuthState(
    isInitialized: true,
    user: buildAuthUser(),
  );
}

void main() {
  test('hydrates favorite ids for signed-in users', () async {
    final repository = FakeFavoritesRepository(
      initialIds: {'listing-1', 'listing-2'},
    );
    final controller = FavoritesController(repository);

    await controller.syncAuth(signedInState());

    expect(repository.listCalls, 1);
    expect(controller.state.favoriteIds, {'listing-1', 'listing-2'});
    expect(controller.state.hasLoaded, isTrue);
    expect(controller.state.isLoading, isFalse);
  });

  test('signed-out toggle requires login and skips favorites API', () async {
    final repository = FakeFavoritesRepository();
    final controller = FavoritesController(repository);

    await controller.syncAuth(const AuthState(isInitialized: true));
    final result = await controller.toggleFavorite('listing-1');

    expect(result.outcome, FavoriteToggleOutcome.loginRequired);
    expect(result.message, 'Log in to save this home.');
    expect(repository.addCalls, isEmpty);
    expect(repository.removeCalls, isEmpty);
  });

  test('signed-in toggle adds and removes favorites', () async {
    final repository = FakeFavoritesRepository();
    final controller = FavoritesController(repository);

    await controller.syncAuth(signedInState());

    final addResult = await controller.toggleFavorite('listing-1');
    expect(addResult.outcome, FavoriteToggleOutcome.toggled);
    expect(repository.addCalls, ['listing-1']);
    expect(controller.state.isFavorite('listing-1'), isTrue);

    final removeResult = await controller.toggleFavorite('listing-1');
    expect(removeResult.outcome, FavoriteToggleOutcome.toggled);
    expect(repository.removeCalls, ['listing-1']);
    expect(controller.state.isFavorite('listing-1'), isFalse);
  });

  test('failed favorite mutation rolls back local state', () async {
    final repository = FakeFavoritesRepository(
      addError: Exception('network failed'),
    );
    final controller = FavoritesController(repository);

    await controller.syncAuth(signedInState());
    final result = await controller.toggleFavorite('listing-1');

    expect(result.outcome, FavoriteToggleOutcome.failed);
    expect(controller.state.isFavorite('listing-1'), isFalse);
    expect(controller.state.isPending('listing-1'), isFalse);
    expect(controller.state.error, contains('network failed'));
  });

  test('auth failure rolls back and returns login prompt outcome', () async {
    final repository = FakeFavoritesRepository(
      addError: const ApiException(
        message: 'Authentication required',
        statusCode: 401,
      ),
    );
    final controller = FavoritesController(repository);

    await controller.syncAuth(signedInState());
    final result = await controller.toggleFavorite('listing-1');

    expect(result.outcome, FavoriteToggleOutcome.loginRequired);
    expect(controller.state.isFavorite('listing-1'), isFalse);
    expect(controller.state.isPending('listing-1'), isFalse);
  });

  test('logout clears local favorite ids', () async {
    final repository = FakeFavoritesRepository(initialIds: {'listing-1'});
    final controller = FavoritesController(repository);

    await controller.syncAuth(signedInState());
    expect(controller.state.favoriteIds, {'listing-1'});

    await controller.syncAuth(const AuthState(isInitialized: true));

    expect(controller.state.favoriteIds, isEmpty);
    expect(controller.state.hasLoaded, isFalse);
  });
}
