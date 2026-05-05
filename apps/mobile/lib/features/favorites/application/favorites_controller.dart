import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../providers/auth_provider.dart';
import '../../../services/api_client.dart';
import '../data/favorites_repository.dart';

const _noChange = Object();

enum FavoriteToggleOutcome {
  toggled,
  loginRequired,
  failed,
}

class FavoriteToggleResult {
  final FavoriteToggleOutcome outcome;
  final String? message;

  const FavoriteToggleResult._(this.outcome, {this.message});

  const FavoriteToggleResult.toggled() : this._(FavoriteToggleOutcome.toggled);

  const FavoriteToggleResult.loginRequired()
      : this._(
          FavoriteToggleOutcome.loginRequired,
          message: 'Log in to save this home.',
        );

  const FavoriteToggleResult.failed(String message)
      : this._(FavoriteToggleOutcome.failed, message: message);
}

class FavoritesState {
  final Set<String> favoriteIds;
  final Set<String> pendingListingIds;
  final bool isLoading;
  final bool hasLoaded;
  final String? error;

  const FavoritesState({
    this.favoriteIds = const {},
    this.pendingListingIds = const {},
    this.isLoading = false,
    this.hasLoaded = false,
    this.error,
  });

  FavoritesState copyWith({
    Set<String>? favoriteIds,
    Set<String>? pendingListingIds,
    bool? isLoading,
    bool? hasLoaded,
    Object? error = _noChange,
  }) {
    return FavoritesState(
      favoriteIds: favoriteIds ?? this.favoriteIds,
      pendingListingIds: pendingListingIds ?? this.pendingListingIds,
      isLoading: isLoading ?? this.isLoading,
      hasLoaded: hasLoaded ?? this.hasLoaded,
      error: identical(error, _noChange) ? this.error : error as String?,
    );
  }

  bool isFavorite(String listingId) => favoriteIds.contains(listingId);
  bool isPending(String listingId) => pendingListingIds.contains(listingId);
}

class FavoritesController extends StateNotifier<FavoritesState> {
  final FavoritesRepository _repository;
  String? _userId;
  int _hydrateGeneration = 0;

  FavoritesController(this._repository) : super(const FavoritesState());

  Future<void> syncAuth(AuthState authState) async {
    final nextUserId = authState.user?.id;
    if (nextUserId == null) {
      _userId = null;
      _hydrateGeneration++;
      if (state.favoriteIds.isNotEmpty ||
          state.pendingListingIds.isNotEmpty ||
          state.hasLoaded ||
          state.isLoading ||
          state.error != null) {
        state = const FavoritesState();
      }
      return;
    }

    if (_userId == nextUserId && state.hasLoaded) {
      return;
    }

    _userId = nextUserId;
    await hydrate();
  }

  Future<void> hydrate() async {
    final activeUserId = _userId;
    if (activeUserId == null) {
      state = const FavoritesState();
      return;
    }

    final generation = ++_hydrateGeneration;
    state = state.copyWith(isLoading: true, error: null);

    try {
      final favoriteIds = await _repository.listFavoriteIds();
      if (generation != _hydrateGeneration || _userId != activeUserId) {
        return;
      }
      state = state.copyWith(
        favoriteIds: favoriteIds,
        pendingListingIds: const {},
        isLoading: false,
        hasLoaded: true,
        error: null,
      );
    } catch (error) {
      if (generation != _hydrateGeneration || _userId != activeUserId) {
        return;
      }
      state = state.copyWith(
        isLoading: false,
        hasLoaded: true,
        error: _describeError(error),
      );
    }
  }

  Future<FavoriteToggleResult> toggleFavorite(String listingId) async {
    final normalizedListingId = listingId.trim();
    if (normalizedListingId.isEmpty) {
      return const FavoriteToggleResult.failed('Listing unavailable.');
    }
    if (_userId == null) {
      return const FavoriteToggleResult.loginRequired();
    }
    if (state.pendingListingIds.contains(normalizedListingId)) {
      return const FavoriteToggleResult.failed('Favorite update in progress.');
    }

    final wasFavorite = state.favoriteIds.contains(normalizedListingId);
    final nextFavoriteIds = Set<String>.from(state.favoriteIds);
    if (wasFavorite) {
      nextFavoriteIds.remove(normalizedListingId);
    } else {
      nextFavoriteIds.add(normalizedListingId);
    }

    state = state.copyWith(
      favoriteIds: nextFavoriteIds,
      pendingListingIds: {
        ...state.pendingListingIds,
        normalizedListingId,
      },
      error: null,
    );

    try {
      if (wasFavorite) {
        await _repository.removeFavorite(normalizedListingId);
      } else {
        await _repository.addFavorite(normalizedListingId);
      }
      state = state.copyWith(
        pendingListingIds: _withoutPending(normalizedListingId),
        error: null,
      );
      return const FavoriteToggleResult.toggled();
    } catch (error) {
      final rolledBackFavoriteIds = Set<String>.from(state.favoriteIds);
      if (wasFavorite) {
        rolledBackFavoriteIds.add(normalizedListingId);
      } else {
        rolledBackFavoriteIds.remove(normalizedListingId);
      }

      final message = _describeError(error);
      state = state.copyWith(
        favoriteIds: rolledBackFavoriteIds,
        pendingListingIds: _withoutPending(normalizedListingId),
        error: message,
      );

      if (_isAuthFailure(error)) {
        return const FavoriteToggleResult.loginRequired();
      }
      return FavoriteToggleResult.failed(message);
    }
  }

  Set<String> _withoutPending(String listingId) {
    return Set<String>.from(state.pendingListingIds)..remove(listingId);
  }

  bool _isAuthFailure(Object error) {
    return error is ApiException &&
        (error.statusCode == 401 || error.statusCode == 403);
  }

  String _describeError(Object error) {
    if (error is ApiException) {
      return error.message;
    }
    return error.toString();
  }
}

final favoritesControllerProvider =
    StateNotifierProvider<FavoritesController, FavoritesState>((ref) {
  final controller =
      FavoritesController(ref.watch(favoritesRepositoryProvider));
  unawaited(controller.syncAuth(ref.read(authProvider)));
  ref.listen<AuthState>(authProvider, (_, next) {
    unawaited(controller.syncAuth(next));
  });
  return controller;
});
