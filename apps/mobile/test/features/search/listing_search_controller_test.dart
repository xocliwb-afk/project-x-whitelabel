import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/search/application/listing_search_controller.dart';
import 'package:project_x_mobile/features/search/data/listings_repository.dart';
import 'package:project_x_mobile/models/listing_search_response.dart';

import '../../test_support/listing_fixtures.dart';

class FakeListingsRepository implements ListingsRepository {
  final List<ListingSearchQuery> queries = [];
  final List<Object> results;

  FakeListingsRepository(this.results);

  @override
  Future<ListingSearchResponse> searchListings(ListingSearchQuery query) async {
    queries.add(query);
    final next = results.removeAt(0);
    if (next is Exception) {
      throw next;
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
}
