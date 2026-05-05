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
      body: Stack(
        key: const ValueKey('map-first-search-shell'),
        children: [
          Positioned.fill(
            child: MapboxSearchMap(
              brand: brand,
              height: null,
              borderRadius: BorderRadius.zero,
              listings: state.results,
              selectedListingId: state.mapViewport.selectedListingId,
              onMapReady: () {
                ref
                    .read(listingSearchControllerProvider.notifier)
                    .markMapReady();
              },
              onPinTap: (listingId) {
                ref
                    .read(listingSearchControllerProvider.notifier)
                    .selectListing(listingId);
              },
              onCameraChanged: ({
                required center,
                required zoom,
                required visibleBbox,
                required source,
              }) {
                ref
                    .read(listingSearchControllerProvider.notifier)
                    .updateMapCamera(
                      center: center,
                      zoom: zoom,
                      visibleBbox: visibleBbox,
                      source: source,
                    );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: _SearchTopOverlay(
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
          ),
          if (state.mapViewport.hasPendingSearchArea)
            SafeArea(
              child: Align(
                alignment: Alignment.topCenter,
                child: Padding(
                  padding: const EdgeInsets.only(top: 148),
                  child: _SearchThisAreaButton(
                    onPressed: () {
                      ref
                          .read(listingSearchControllerProvider.notifier)
                          .commitDraftVisibleBbox();
                    },
                  ),
                ),
              ),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: _SearchResultsPanel(
              state: state,
              showAddToTour: tourEnabled,
              onRefresh: () =>
                  ref.read(listingSearchControllerProvider.notifier).refresh(),
              onRetry: _retry,
              onLoadMore: () =>
                  ref.read(listingSearchControllerProvider.notifier).loadMore(),
              onOpenListing: (listing) {
                ref
                    .read(listingSearchControllerProvider.notifier)
                    .selectListing(listing.id);
                _openListing(listing);
              },
              onSelectListing: (listing) {
                ref
                    .read(listingSearchControllerProvider.notifier)
                    .selectListing(listing.id);
              },
              onAddToTour: _addToTour,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchTopOverlay extends StatelessWidget {
  final Widget child;

  const _SearchTopOverlay({required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      key: const ValueKey('search-top-overlay'),
      color: theme.colorScheme.surface,
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: child,
      ),
    );
  }
}

class _SearchResultsPanel extends StatelessWidget {
  final SearchState state;
  final bool showAddToTour;
  final Future<void> Function() onRefresh;
  final VoidCallback onRetry;
  final VoidCallback onLoadMore;
  final ValueChanged<Listing> onOpenListing;
  final ValueChanged<Listing> onSelectListing;
  final ValueChanged<Listing> onAddToTour;

  const _SearchResultsPanel({
    required this.state,
    required this.showAddToTour,
    required this.onRefresh,
    required this.onRetry,
    required this.onLoadMore,
    required this.onOpenListing,
    required this.onSelectListing,
    required this.onAddToTour,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final panelHeight = (screenHeight * 0.46).clamp(320.0, 460.0);

    return Material(
      key: const ValueKey('search-results-panel'),
      color: colorScheme.surface,
      elevation: 8,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: panelHeight,
          width: double.infinity,
          child: Column(
            children: [
              const SizedBox(height: 8),
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: _SearchStatus(state: state),
              ),
              if (state.error != null && state.results.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: _InlineError(
                    message: state.error!,
                    onRetry: onRetry,
                  ),
                ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: onRefresh,
                  child: _SearchResultsList(
                    state: state,
                    showAddToTour: showAddToTour,
                    onRetry: onRetry,
                    onLoadMore: onLoadMore,
                    onOpenListing: onOpenListing,
                    onSelectListing: onSelectListing,
                    onAddToTour: onAddToTour,
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

class _SearchResultsList extends StatelessWidget {
  final SearchState state;
  final bool showAddToTour;
  final VoidCallback onRetry;
  final VoidCallback onLoadMore;
  final ValueChanged<Listing> onOpenListing;
  final ValueChanged<Listing> onSelectListing;
  final ValueChanged<Listing> onAddToTour;

  const _SearchResultsList({
    required this.state,
    required this.showAddToTour,
    required this.onRetry,
    required this.onLoadMore,
    required this.onOpenListing,
    required this.onSelectListing,
    required this.onAddToTour,
  });

  @override
  Widget build(BuildContext context) {
    if (state.isLoading && state.results.isEmpty) {
      return ListView(
        key: const ValueKey('search-results-scroll'),
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 220, child: _LoadingState()),
        ],
      );
    }

    if (state.error != null && state.results.isEmpty) {
      return ListView(
        key: const ValueKey('search-results-scroll'),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: 240,
            child: _ErrorState(
              message: state.error!,
              onRetry: onRetry,
            ),
          ),
        ],
      );
    }

    if (state.hasLoaded && state.results.isEmpty) {
      return ListView(
        key: const ValueKey('search-results-scroll'),
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 220, child: _EmptyState()),
        ],
      );
    }

    return ListView.separated(
      key: const ValueKey('search-results-scroll'),
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      itemCount: state.results.length + 1,
      separatorBuilder: (_, index) => index < state.results.length - 1
          ? const SizedBox(height: 8)
          : const SizedBox.shrink(),
      itemBuilder: (context, index) {
        if (index == state.results.length) {
          return Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _LoadMoreButton(
              state: state,
              onPressed: onLoadMore,
            ),
          );
        }

        final listing = state.results[index];
        return _ListingCard(
          listing: listing,
          isSelected: state.mapViewport.selectedListingId == listing.id,
          showAddToTour: showAddToTour,
          onTap: () => onOpenListing(listing),
          onSelect: () => onSelectListing(listing),
          onAddToTour: () => onAddToTour(listing),
        );
      },
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
  final bool isSelected;
  final bool showAddToTour;
  final VoidCallback onTap;
  final VoidCallback onSelect;
  final VoidCallback onAddToTour;

  const _ListingCard({
    required this.listing,
    required this.isSelected,
    required this.showAddToTour,
    required this.onTap,
    required this.onSelect,
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
      color: isSelected ? theme.colorScheme.primaryContainer : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isSelected ? theme.colorScheme.primary : Colors.transparent,
          width: isSelected ? 2 : 0,
        ),
      ),
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
              const SizedBox(width: 4),
              IconButton(
                key: ValueKey('select-listing-${listing.id}'),
                tooltip: 'Select on map',
                icon: Icon(
                  isSelected ? Icons.location_pin : Icons.location_on_outlined,
                ),
                onPressed: onSelect,
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

class _SearchThisAreaButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _SearchThisAreaButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      key: const ValueKey('search-this-area'),
      onPressed: onPressed,
      icon: const Icon(Icons.search),
      label: const Text('Search this area'),
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
