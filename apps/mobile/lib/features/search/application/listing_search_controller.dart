import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing.dart';
import '../data/listings_repository.dart';

const _noChange = Object();

class SearchState {
  final ListingSearchQuery query;
  final List<Listing> results;
  final int page;
  final int limit;
  final int pageCount;
  final bool hasMore;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasLoaded;
  final String? error;

  const SearchState({
    this.query = const ListingSearchQuery(),
    this.results = const [],
    this.page = 1,
    this.limit = 20,
    this.pageCount = 0,
    this.hasMore = false,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasLoaded = false,
    this.error,
  });

  SearchState copyWith({
    ListingSearchQuery? query,
    List<Listing>? results,
    int? page,
    int? limit,
    int? pageCount,
    bool? hasMore,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasLoaded,
    Object? error = _noChange,
  }) {
    return SearchState(
      query: query ?? this.query,
      results: results ?? this.results,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      pageCount: pageCount ?? this.pageCount,
      hasMore: hasMore ?? this.hasMore,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasLoaded: hasLoaded ?? this.hasLoaded,
      error: identical(error, _noChange) ? this.error : error as String?,
    );
  }
}

class ListingSearchController extends StateNotifier<SearchState> {
  final ListingsRepository _repository;

  ListingSearchController(this._repository) : super(const SearchState());

  Future<void> search(ListingSearchQuery query) async {
    final firstPageQuery = query.copyWith(page: 1);
    state = state.copyWith(
      query: firstPageQuery,
      isLoading: true,
      isLoadingMore: false,
      error: null,
    );

    try {
      final response = await _repository.searchListings(firstPageQuery);
      state = state.copyWith(
        results: response.results,
        page: response.pagination.page,
        limit: response.pagination.limit,
        pageCount: response.pagination.pageCount,
        hasMore: response.pagination.hasMore,
        isLoading: false,
        hasLoaded: true,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        hasLoaded: true,
        error: _describeError(error),
      );
    }
  }

  Future<void> refresh() {
    return search(state.query.copyWith(page: 1));
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) {
      return;
    }

    final nextPageQuery = state.query.copyWith(page: state.page + 1);
    state = state.copyWith(
      query: nextPageQuery,
      isLoadingMore: true,
      error: null,
    );

    try {
      final response = await _repository.searchListings(nextPageQuery);
      state = state.copyWith(
        results: [...state.results, ...response.results],
        page: response.pagination.page,
        limit: response.pagination.limit,
        pageCount: response.pagination.pageCount,
        hasMore: response.pagination.hasMore,
        isLoadingMore: false,
        hasLoaded: true,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isLoadingMore: false,
        hasLoaded: true,
        error: _describeError(error),
      );
    }
  }

  String _describeError(Object error) => error.toString();
}

final listingSearchControllerProvider =
    StateNotifierProvider<ListingSearchController, SearchState>((ref) {
  return ListingSearchController(ref.watch(listingsRepositoryProvider));
});
