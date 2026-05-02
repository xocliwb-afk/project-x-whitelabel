import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/listing.dart';
import '../data/listing_detail_repository.dart';

const _noChange = Object();

class ListingDetailArgs {
  final String listingId;
  final Listing? previewListing;

  const ListingDetailArgs({
    required this.listingId,
    this.previewListing,
  });
}

class ListingDetailState {
  final String listingId;
  final Listing? previewListing;
  final Listing? listing;
  final bool isLoading;
  final bool hasLoaded;
  final String? error;

  const ListingDetailState({
    required this.listingId,
    this.previewListing,
    this.listing,
    this.isLoading = false,
    this.hasLoaded = false,
    this.error,
  });

  Listing? get displayListing => listing ?? previewListing;

  ListingDetailState copyWith({
    Listing? previewListing,
    Listing? listing,
    bool? isLoading,
    bool? hasLoaded,
    Object? error = _noChange,
  }) {
    return ListingDetailState(
      listingId: listingId,
      previewListing: previewListing ?? this.previewListing,
      listing: listing ?? this.listing,
      isLoading: isLoading ?? this.isLoading,
      hasLoaded: hasLoaded ?? this.hasLoaded,
      error: identical(error, _noChange) ? this.error : error as String?,
    );
  }
}

class ListingDetailController extends StateNotifier<ListingDetailState> {
  final ListingDetailRepository _repository;

  ListingDetailController(
    this._repository, {
    required String listingId,
    Listing? previewListing,
  }) : super(
          ListingDetailState(
            listingId: listingId,
            previewListing: previewListing,
          ),
        );

  Future<void> load() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final listing = await _repository.getListingById(state.listingId);
      state = state.copyWith(
        listing: listing,
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

  Future<void> retry() => load();

  String _describeError(Object error) => error.toString();
}

final listingDetailControllerProvider = StateNotifierProvider.family<
    ListingDetailController, ListingDetailState, ListingDetailArgs>(
  (ref, args) {
    return ListingDetailController(
      ref.watch(listingDetailRepositoryProvider),
      listingId: args.listingId,
      previewListing: args.previewListing,
    );
  },
);
