import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing.dart';
import '../../../models/brand_config.dart';
import '../data/listings_repository.dart';
import 'map_viewport_state.dart';

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
  final MapViewportState mapViewport;

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
    this.mapViewport = const MapViewportState(),
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
    MapViewportState? mapViewport,
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
      mapViewport: mapViewport ?? this.mapViewport,
    );
  }
}

class ListingSearchController extends StateNotifier<SearchState> {
  final ListingsRepository _repository;
  int _requestGeneration = 0;
  CancelToken? _activeRequestCancelToken;

  ListingSearchController(this._repository) : super(const SearchState());

  @override
  void dispose() {
    _activeRequestCancelToken?.cancel('Search controller disposed');
    super.dispose();
  }

  void markMapReady() {
    state = state.copyWith(
      mapViewport: state.mapViewport.copyWith(isMapReady: true),
    );
  }

  void updateMapCamera({
    required LatLng center,
    required double zoom,
    MapSearchBbox? visibleBbox,
    MapCameraChangeSource source = MapCameraChangeSource.user,
  }) {
    final normalizedDraft = visibleBbox;
    final mapState = state.mapViewport;
    final isUserChange = source == MapCameraChangeSource.user;
    final hasMeaningfulDraftChange = normalizedDraft != null &&
        normalizedDraft != mapState.committedSearchBbox;
    final hasPendingSearchArea =
        isUserChange ? hasMeaningfulDraftChange : mapState.hasPendingSearchArea;

    state = state.copyWith(
      mapViewport: mapState.copyWith(
        cameraCenter: center,
        zoom: zoom,
        draftVisibleBbox: normalizedDraft,
        hasPendingSearchArea: hasPendingSearchArea,
      ),
    );
  }

  void selectListing(String? listingId) {
    state = state.copyWith(
      mapViewport: state.mapViewport.copyWith(
        selectedListingId: listingId,
      ),
    );
  }

  Future<void> commitDraftVisibleBbox() async {
    final draftBbox = state.mapViewport.draftVisibleBbox;
    if (draftBbox == null) {
      state = state.copyWith(
        mapViewport: state.mapViewport.copyWith(hasPendingSearchArea: false),
      );
      return;
    }

    final nextMapState = state.mapViewport.copyWith(
      committedSearchBbox: draftBbox,
      hasPendingSearchArea: false,
    );
    state = state.copyWith(mapViewport: nextMapState);

    await _search(
      state.query.copyWith(
        bbox: draftBbox.toQueryParam(),
        page: 1,
      ),
      committedBbox: draftBbox,
    );
  }

  Future<void> search(ListingSearchQuery query) async {
    return _search(query);
  }

  Future<void> _search(
    ListingSearchQuery query, {
    MapSearchBbox? committedBbox,
  }) async {
    final firstPageQuery = query.copyWith(page: 1);
    final requestGeneration = _startRequest();
    final cancelToken = CancelToken();
    _activeRequestCancelToken = cancelToken;

    state = state.copyWith(
      query: firstPageQuery,
      isLoading: true,
      isLoadingMore: false,
      error: null,
    );

    try {
      final response = await _repository.searchListings(
        firstPageQuery,
        cancelToken: cancelToken,
      );
      if (!_isCurrentRequest(requestGeneration)) {
        return;
      }
      final successfulBbox =
          committedBbox ?? MapSearchBbox.tryParse(firstPageQuery.bbox);
      final draftBbox = state.mapViewport.draftVisibleBbox;
      final hasPendingSearchArea = draftBbox != null &&
          successfulBbox != null &&
          draftBbox != successfulBbox;
      state = state.copyWith(
        results: response.results,
        page: response.pagination.page,
        limit: response.pagination.limit,
        pageCount: response.pagination.pageCount,
        hasMore: response.pagination.hasMore,
        isLoading: false,
        hasLoaded: true,
        error: null,
        mapViewport: state.mapViewport.copyWith(
          committedSearchBbox: successfulBbox,
          lastSuccessfulBbox: successfulBbox,
          hasPendingSearchArea: hasPendingSearchArea,
        ),
      );
    } catch (error) {
      if (!_isCurrentRequest(requestGeneration) || _isCanceled(error)) {
        return;
      }
      state = state.copyWith(
        isLoading: false,
        hasLoaded: true,
        error: _describeError(error),
      );
    } finally {
      if (_isCurrentRequest(requestGeneration)) {
        _activeRequestCancelToken = null;
      }
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
    final requestGeneration = _startRequest();
    final cancelToken = CancelToken();
    _activeRequestCancelToken = cancelToken;

    state = state.copyWith(
      query: nextPageQuery,
      isLoadingMore: true,
      error: null,
    );

    try {
      final response = await _repository.searchListings(
        nextPageQuery,
        cancelToken: cancelToken,
      );
      if (!_isCurrentRequest(requestGeneration)) {
        return;
      }
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
      if (!_isCurrentRequest(requestGeneration) || _isCanceled(error)) {
        return;
      }
      state = state.copyWith(
        isLoadingMore: false,
        hasLoaded: true,
        error: _describeError(error),
      );
    } finally {
      if (_isCurrentRequest(requestGeneration)) {
        _activeRequestCancelToken = null;
      }
    }
  }

  int _startRequest() {
    _activeRequestCancelToken?.cancel('Superseded listing search');
    return ++_requestGeneration;
  }

  bool _isCurrentRequest(int requestGeneration) {
    return requestGeneration == _requestGeneration;
  }

  bool _isCanceled(Object error) {
    return error is DioException && error.type == DioExceptionType.cancel;
  }

  String _describeError(Object error) => error.toString();
}

final listingSearchControllerProvider =
    StateNotifierProvider<ListingSearchController, SearchState>((ref) {
  return ListingSearchController(ref.watch(listingsRepositoryProvider));
});
