import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../models/listing.dart';
import '../../../../providers/api_provider.dart';
import '../../../tour/application/tour_draft_controller.dart';
import '../../application/listing_search_controller.dart';
import '../../data/listings_repository.dart';
import '../widgets/mapbox_search_map.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  String? _selectedSort;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(listingSearchControllerProvider);
      if (!state.hasLoaded && !state.isLoading) {
        ref
            .read(listingSearchControllerProvider.notifier)
            .search(const ListingSearchQuery());
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _submitSearch() {
    final query = _searchController.text.trim();
    ref.read(listingSearchControllerProvider.notifier).search(
          ListingSearchQuery(
            q: query.isEmpty ? null : query,
            sort: _selectedSort,
          ),
        );
  }

  void _retry() {
    ref.read(listingSearchControllerProvider.notifier).refresh();
  }

  void _openListing(Listing listing) {
    context.push('/listing/${listing.id}', extra: listing);
  }

  void _addToTour(Listing listing) {
    ref.read(tourDraftControllerProvider.notifier).addStop(
          TourDraftStop(
            listingId: listing.id,
            address: listing.address.full,
            lat: listing.address.lat,
            lng: listing.address.lng,
            thumbnailUrl: listing.media.thumbnailUrl,
          ),
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Added to tour draft'),
        action: SnackBarAction(
          label: 'View tour',
          onPressed: () => context.go('/tour'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(listingSearchControllerProvider);
    final brandConfigAsync = ref.watch(brandConfigProvider);
    final brand = brandConfigAsync.asData?.value;
    final tourEnabled = brand?.features?.tourEngine == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () =>
              ref.read(listingSearchControllerProvider.notifier).refresh(),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: MapboxSearchMap(brand: brand),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: _SearchControls(
                    controller: _searchController,
                    selectedSort: _selectedSort,
                    onSortChanged: (value) {
                      setState(() => _selectedSort = value);
                      _submitSearch();
                    },
                    onSubmit: _submitSearch,
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: _SearchStatus(state: state),
                ),
              ),
              if (state.error != null && state.results.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: _InlineError(
                      message: state.error!,
                      onRetry: _retry,
                    ),
                  ),
                ),
              if (state.isLoading && state.results.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _LoadingState(),
                )
              else if (state.error != null && state.results.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _ErrorState(
                    message: state.error!,
                    onRetry: _retry,
                  ),
                )
              else if (state.hasLoaded && state.results.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyState(),
                )
              else
                SliverList.separated(
                  itemCount: state.results.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final listing = state.results[index];
                    return Padding(
                      padding: EdgeInsets.fromLTRB(
                        16,
                        index == 0 ? 4 : 0,
                        16,
                        index == state.results.length - 1 ? 12 : 0,
                      ),
                      child: _ListingCard(
                        listing: listing,
                        showAddToTour: tourEnabled,
                        onTap: () => _openListing(listing),
                        onAddToTour: () => _addToTour(listing),
                      ),
                    );
                  },
                ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  child: _LoadMoreButton(
                    state: state,
                    onPressed: () => ref
                        .read(listingSearchControllerProvider.notifier)
                        .loadMore(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchControls extends StatelessWidget {
  final TextEditingController controller;
  final String? selectedSort;
  final ValueChanged<String?> onSortChanged;
  final VoidCallback onSubmit;

  const _SearchControls({
    required this.controller,
    required this.selectedSort,
    required this.onSortChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: const ValueKey('search-input'),
          controller: controller,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            labelText: 'Search listings',
            hintText: 'City, ZIP, address, or keyword',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(
              key: const ValueKey('search-submit'),
              tooltip: 'Search',
              icon: const Icon(Icons.arrow_forward),
              onPressed: onSubmit,
            ),
            border: const OutlineInputBorder(),
          ),
          onSubmitted: (_) => onSubmit(),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          key: const ValueKey('sort-select'),
          initialValue: selectedSort,
          decoration: const InputDecoration(
            labelText: 'Sort',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: null, child: Text('Default')),
            DropdownMenuItem(value: 'newest', child: Text('Newest')),
            DropdownMenuItem(
                value: 'price-asc', child: Text('Price: low to high')),
            DropdownMenuItem(
                value: 'price-desc', child: Text('Price: high to low')),
            DropdownMenuItem(value: 'dom', child: Text('Days on market')),
          ],
          onChanged: onSortChanged,
        ),
      ],
    );
  }
}

class _SearchStatus extends StatelessWidget {
  final SearchState state;

  const _SearchStatus({required this.state});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final message = state.isLoading && state.results.isEmpty
        ? 'Loading listings...'
        : state.hasLoaded
            ? '${state.results.length} listings shown'
            : 'Search listings';

    return Row(
      children: [
        Expanded(
          child: Text(
            message,
            style: textTheme.bodyMedium,
          ),
        ),
        if (state.isLoadingMore)
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
      ],
    );
  }
}

class _ListingCard extends StatelessWidget {
  final Listing listing;
  final bool showAddToTour;
  final VoidCallback onTap;
  final VoidCallback onAddToTour;

  const _ListingCard({
    required this.listing,
    required this.showAddToTour,
    required this.onTap,
    required this.onAddToTour,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final details = listing.details;
    final factParts = [
      if (details.beds != null) '${details.beds} bd',
      if (details.baths != null) '${details.baths} ba',
      if (details.sqft != null) '${details.sqft} sqft',
      details.status,
    ];

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('listing-card-${listing.id}'),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ListingThumbnail(listing: listing),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.listPriceFormatted,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      listing.address.full,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      factParts.join(' / '),
                      style: theme.textTheme.bodySmall,
                    ),
                    if (listing.meta.daysOnMarket != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${listing.meta.daysOnMarket} days on market',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (showAddToTour) ...[
                const SizedBox(width: 4),
                IconButton(
                  key: ValueKey('add-to-tour-${listing.id}'),
                  tooltip: 'Add to tour',
                  icon: const Icon(Icons.add_road),
                  onPressed: onAddToTour,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ListingThumbnail extends StatelessWidget {
  final Listing listing;

  const _ListingThumbnail({required this.listing});

  @override
  Widget build(BuildContext context) {
    final url = listing.media.thumbnailUrl;
    final borderRadius = BorderRadius.circular(8);

    Widget fallback() {
      return ColoredBox(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.home_outlined,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      );
    }

    return ClipRRect(
      borderRadius: borderRadius,
      child: SizedBox(
        width: 96,
        height: 84,
        child: url == null || url.isEmpty
            ? fallback()
            : Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => fallback(),
              ),
      ),
    );
  }
}

class _LoadMoreButton extends StatelessWidget {
  final SearchState state;
  final VoidCallback onPressed;

  const _LoadMoreButton({
    required this.state,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    if (!state.hasMore || state.results.isEmpty) {
      return const SizedBox.shrink();
    }

    return OutlinedButton(
      key: const ValueKey('load-more'),
      onPressed: state.isLoadingMore ? null : onPressed,
      child: Text(state.isLoadingMore ? 'Loading more...' : 'Load more'),
    );
  }
}

class _InlineError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _InlineError({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: colorScheme.errorContainer,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: colorScheme.onErrorContainer),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(color: colorScheme.onErrorContainer),
              ),
            ),
            TextButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'No listings match this search.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 44),
            const SizedBox(height: 12),
            Text(
              'Search unavailable',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
