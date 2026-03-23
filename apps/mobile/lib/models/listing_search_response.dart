import 'package:json_annotation/json_annotation.dart';
import 'listing.dart';

part 'listing_search_response.g.dart';

/// Mirrors the paginated search response from GET /api/listings.
/// Shape: { results: Listing[], pagination: { page, limit, pageCount, hasMore } }
@JsonSerializable()
class ListingSearchResponse {
  final List<Listing> results;
  final SearchPagination pagination;

  const ListingSearchResponse({
    required this.results,
    required this.pagination,
  });

  factory ListingSearchResponse.fromJson(Map<String, dynamic> json) =>
      _$ListingSearchResponseFromJson(json);

  Map<String, dynamic> toJson() => _$ListingSearchResponseToJson(this);
}

@JsonSerializable()
class SearchPagination {
  final int page;
  final int limit;
  final int pageCount;
  final bool hasMore;

  const SearchPagination({
    required this.page,
    required this.limit,
    required this.pageCount,
    required this.hasMore,
  });

  factory SearchPagination.fromJson(Map<String, dynamic> json) =>
      _$SearchPaginationFromJson(json);

  Map<String, dynamic> toJson() => _$SearchPaginationToJson(this);
}
