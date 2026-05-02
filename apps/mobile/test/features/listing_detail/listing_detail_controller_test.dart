import 'package:flutter_test/flutter_test.dart';
import 'package:project_x_mobile/features/listing_detail/application/listing_detail_controller.dart';
import 'package:project_x_mobile/features/listing_detail/data/listing_detail_repository.dart';
import 'package:project_x_mobile/models/listing.dart';

import '../../test_support/listing_fixtures.dart';

class FakeListingDetailRepository implements ListingDetailRepository {
  Object result;
  int calls = 0;

  FakeListingDetailRepository(this.result);

  @override
  Future<Listing> getListingById(String id) async {
    calls += 1;
    final next = result;
    if (next is Exception) {
      throw next;
    }
    return next as Listing;
  }
}

void main() {
  test('uses preview listing as display fallback before detail loads', () {
    final preview = buildListing('preview');
    final repository = FakeListingDetailRepository(buildListing('detail'));
    final controller = ListingDetailController(
      repository,
      listingId: 'detail',
      previewListing: preview,
    );

    expect(controller.state.listing, isNull);
    expect(controller.state.displayListing, preview);
    expect(controller.state.isLoading, isFalse);
  });

  test('failed detail fetch preserves preview listing', () async {
    final preview = buildListing('preview');
    final repository = FakeListingDetailRepository(Exception('not found'));
    final controller = ListingDetailController(
      repository,
      listingId: 'detail',
      previewListing: preview,
    );

    await controller.load();

    expect(repository.calls, 1);
    expect(controller.state.listing, isNull);
    expect(controller.state.displayListing, preview);
    expect(controller.state.error, contains('not found'));
    expect(controller.state.isLoading, isFalse);
  });

  test('retry can replace preview with loaded detail', () async {
    final preview = buildListing('preview');
    final detail = buildListing('detail');
    final repository = FakeListingDetailRepository(Exception('first failed'));
    final controller = ListingDetailController(
      repository,
      listingId: 'detail',
      previewListing: preview,
    );

    await controller.load();
    repository.result = detail;
    await controller.retry();

    expect(controller.state.displayListing, detail);
    expect(controller.state.error, isNull);
  });
}
