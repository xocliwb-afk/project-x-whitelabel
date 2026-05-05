import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/search/application/listing_search_controller.dart';
import 'package:project_x_mobile/features/search/application/map_viewport_state.dart';
import 'package:project_x_mobile/features/search/data/listings_repository.dart';
import 'package:project_x_mobile/models/brand_config.dart';
import 'package:project_x_mobile/models/listing_search_response.dart';

import '../../test_support/listing_fixtures.dart';

class FakeListingsRepository implements ListingsRepository {
  final List<ListingSearchQuery> queries = [];
  final List<CancelToken?> cancelTokens = [];
  final List<Object> results;

  FakeListingsRepository(this.results);

  @override
  Future<ListingSearchResponse> searchListings(
    ListingSearchQuery query, {
    CancelToken? cancelToken,
  }) async {
    queries.add(query);
    cancelTokens.add(cancelToken);
    final next = results.removeAt(0);
    if (next is Exception) {
      throw next;
    }
    if (next is Future<ListingSearchResponse>) {
      return next;
    }
    return next as ListingSearchResponse;
  }
}

ListingSearchResponse response({
  required List<String> ids,
  required int page,
  required bool hasMore,
}) {
  return ListingSearchResponse(
    results: ids.map(buildListing).toList(),
    pagination: SearchPagination(
      page: page,
      limit: 2,
      pageCount: hasMore ? page + 1 : page,
      hasMore: hasMore,
    ),
  );
}

void main() {
  test('starts with an empty idle state', () {
    final controller = ListingSearchController(FakeListingsRepository([]));

    expect(controller.state.results, isEmpty);
    expect(controller.state.isLoading, isFalse);
    expect(controller.state.hasLoaded, isFalse);
  });

  test('loads the first page for a committed query', () async {
    final repository = FakeListingsRepository([
      response(ids: ['listing-1', 'listing-2'], page: 1, hasMore: true),
    ]);
    final controller = ListingSearchController(repository);

    await controller.search(
      const ListingSearchQuery(q: 'detroit', sort: 'price-desc'),
    );

    expect(repository.queries.single.q, 'detroit');
    expect(repository.queries.single.sort, 'price-desc');
    expect(controller.state.results.map((listing) => listing.id), [
      'listing-1',
      'listing-2',
    ]);
    expect(controller.state.page, 1);
    expect(controller.state.hasMore, isTrue);
    expect(controller.state.error, isNull);
  });

  test('loadMore appends results and advances pagination', () async {
    final repository = FakeListingsRepository([
      response(ids: ['listing-1', 'listing-2'], page: 1, hasMore: true),
      response(ids: ['listing-3'], page: 2, hasMore: false),
    ]);
    final controller = ListingSearchController(repository);

    await controller.search(const ListingSearchQuery(q: 'detroit'));
    await controller.loadMore();

    expect(repository.queries.last.page, 2);
    expect(controller.state.results.map((listing) => listing.id), [
      'listing-1',
      'listing-2',
      'listing-3',
    ]);
    expect(controller.state.hasMore, isFalse);
  });

  test('refresh failure preserves existing results', () async {
    final repository = FakeListingsRepository([
      response(ids: ['listing-1'], page: 1, hasMore: false),
      Exception('network failed'),
    ]);
    final controller = ListingSearchController(repository);

    await controller.search(const ListingSearchQuery(q: 'detroit'));
    await controller.refresh();

    expect(controller.state.results.map((listing) => listing.id), [
      'listing-1',
    ]);
    expect(controller.state.isLoading, isFalse);
    expect(controller.state.error, contains('network failed'));
  });

  test('user camera movement updates draft bbox without searching', () {
    final repository = FakeListingsRepository([]);
    final controller = ListingSearchController(repository);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    controller.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
      source: MapCameraChangeSource.user,
    );

    expect(controller.state.mapViewport.draftVisibleBbox, bbox);
    expect(controller.state.mapViewport.committedSearchBbox, isNull);
    expect(controller.state.mapViewport.hasPendingSearchArea, isTrue);
    expect(repository.queries, isEmpty);
  });

  test('programmatic camera movement does not mark pending search area', () {
    final repository = FakeListingsRepository([]);
    final controller = ListingSearchController(repository);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    controller.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
      source: MapCameraChangeSource.programmatic,
    );

    expect(controller.state.mapViewport.draftVisibleBbox, bbox);
    expect(controller.state.mapViewport.hasPendingSearchArea, isFalse);
  });

  test('committing draft bbox drives the API query', () async {
    final repository = FakeListingsRepository([
      response(ids: ['listing-1'], page: 1, hasMore: false),
    ]);
    final controller = ListingSearchController(repository);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    controller.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
    );
    await controller.commitDraftVisibleBbox();

    expect(repository.queries.single.bbox, '-83.2,42.2,-83.1,42.3');
    expect(controller.state.mapViewport.committedSearchBbox, bbox);
    expect(controller.state.mapViewport.lastSuccessfulBbox, bbox);
    expect(controller.state.mapViewport.hasPendingSearchArea, isFalse);
  });

  test('bbox refresh keeps prior results visible while in flight', () async {
    final refreshCompleter = Completer<ListingSearchResponse>();
    final repository = FakeListingsRepository([
      response(ids: ['listing-1'], page: 1, hasMore: false),
      refreshCompleter.future,
    ]);
    final controller = ListingSearchController(repository);
    final bbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );

    await controller.search(const ListingSearchQuery(q: 'detroit'));
    controller.updateMapCamera(
      center: const LatLng(lat: 42.25, lng: -83.15),
      zoom: 12,
      visibleBbox: bbox,
    );
    final refresh = controller.commitDraftVisibleBbox();

    expect(controller.state.isLoading, isTrue);
    expect(controller.state.results.map((listing) => listing.id), [
      'listing-1',
    ]);

    refreshCompleter.complete(
      response(ids: ['listing-2'], page: 1, hasMore: false),
    );
    await refresh;

    expect(controller.state.results.map((listing) => listing.id), [
      'listing-2',
    ]);
  });

  test('loadMore uses committed bbox instead of unsaved draft bbox', () async {
    final repository = FakeListingsRepository([
      response(ids: ['listing-1'], page: 1, hasMore: true),
      response(ids: ['listing-2'], page: 2, hasMore: false),
    ]);
    final controller = ListingSearchController(repository);
    final committedBbox = MapSearchBbox(
      minLng: -83.2,
      minLat: 42.2,
      maxLng: -83.1,
      maxLat: 42.3,
    );
    final draftBbox = MapSearchBbox(
      minLng: -84.0,
      minLat: 42.0,
      maxLng: -83.9,
      maxLat: 42.1,
    );

    await controller.search(
      ListingSearchQuery(bbox: committedBbox.toQueryParam()),
    );
    controller.updateMapCamera(
      center: const LatLng(lat: 42.05, lng: -83.95),
      zoom: 13,
      visibleBbox: draftBbox,
    );
    await controller.loadMore();

    expect(repository.queries.last.page, 2);
    expect(repository.queries.last.bbox, committedBbox.toQueryParam());
    expect(repository.queries.last.bbox, isNot(draftBbox.toQueryParam()));
  });

  test('newer search cancels old request and drops stale response', () async {
    final firstCompleter = Completer<ListingSearchResponse>();
    final secondCompleter = Completer<ListingSearchResponse>();
    final repository = FakeListingsRepository([
      firstCompleter.future,
      secondCompleter.future,
    ]);
    final controller = ListingSearchController(repository);

    final firstSearch = controller.search(
      const ListingSearchQuery(q: 'old search'),
    );
    final secondSearch = controller.search(
      const ListingSearchQuery(q: 'new search'),
    );

    expect(repository.cancelTokens.first?.isCancelled, isTrue);

    secondCompleter.complete(
      response(ids: ['listing-2'], page: 1, hasMore: false),
    );
    await secondSearch;

    firstCompleter.complete(
      response(ids: ['listing-1'], page: 1, hasMore: false),
    );
    await firstSearch;

    expect(controller.state.query.q, 'new search');
    expect(controller.state.results.map((listing) => listing.id), [
      'listing-2',
    ]);
  });
}
