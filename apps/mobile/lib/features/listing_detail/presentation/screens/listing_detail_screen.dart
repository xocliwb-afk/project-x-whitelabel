import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../models/listing.dart';
import '../../../../providers/api_provider.dart';
import '../../../tour/application/tour_draft_controller.dart';
import '../../application/listing_detail_controller.dart';

class ListingDetailScreen extends ConsumerStatefulWidget {
  final String listingId;
  final Listing? previewListing;

  const ListingDetailScreen({
    super.key,
    required this.listingId,
    this.previewListing,
  });

  @override
  ConsumerState<ListingDetailScreen> createState() =>
      _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  late final ListingDetailArgs _args;

  @override
  void initState() {
    super.initState();
    _args = ListingDetailArgs(
      listingId: widget.listingId,
      previewListing: widget.previewListing,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final state = ref.read(listingDetailControllerProvider(_args));
      if (!state.hasLoaded && !state.isLoading) {
        ref.read(listingDetailControllerProvider(_args).notifier).load();
      }
    });
  }

  void _retry() {
    ref.read(listingDetailControllerProvider(_args).notifier).retry();
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
    final state = ref.watch(listingDetailControllerProvider(_args));
    final listing = state.displayListing;
    final tourEnabled = ref.watch(brandConfigProvider).maybeWhen(
          data: (brand) => brand.features?.tourEngine == true,
          orElse: () => false,
        );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Listing Detail'),
      ),
      body: SafeArea(
        child: listing == null
            ? _ListingDetailEmptyState(
                state: state,
                onRetry: _retry,
              )
            : RefreshIndicator(
                onRefresh: () => ref
                    .read(listingDetailControllerProvider(_args).notifier)
                    .retry(),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    _ListingHero(listing: listing),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (state.listing == null &&
                              state.previewListing != null &&
                              state.isLoading)
                            const _PreviewNotice(),
                          if (state.error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _InlineDetailError(
                                message: state.error!,
                                onRetry: _retry,
                              ),
                            ),
                          _ListingHeader(listing: listing),
                          const SizedBox(height: 16),
                          _FactGrid(listing: listing),
                          if (tourEnabled) ...[
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              key: const ValueKey('detail-add-to-tour'),
                              onPressed: () => _addToTour(listing),
                              icon: const Icon(Icons.add_road),
                              label: const Text('Add to tour'),
                            ),
                          ],
                          if (_hasDescription(listing)) ...[
                            const SizedBox(height: 24),
                            _DescriptionSection(listing: listing),
                          ],
                          if (listing.attribution != null) ...[
                            const SizedBox(height: 24),
                            _AttributionSection(
                              attribution: listing.attribution!,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

bool _hasDescription(Listing listing) =>
    listing.description != null && listing.description!.trim().isNotEmpty;

class _ListingDetailEmptyState extends StatelessWidget {
  final ListingDetailState state;
  final VoidCallback onRetry;

  const _ListingDetailEmptyState({
    required this.state,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (state.error != null) {
      return _FullScreenError(
        message: state.error!,
        onRetry: onRetry,
      );
    }

    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}

class _ListingHero extends StatelessWidget {
  final Listing listing;

  const _ListingHero({required this.listing});

  @override
  Widget build(BuildContext context) {
    final heroUrl = listing.media.thumbnailUrl ??
        (listing.media.photos.isNotEmpty ? listing.media.photos.first : null);

    return LayoutBuilder(
      builder: (context, constraints) {
        final height =
            constraints.maxWidth > 520 ? 320.0 : constraints.maxWidth * 10 / 16;

        return SizedBox(
          width: double.infinity,
          height: height,
          child: heroUrl == null || heroUrl.isEmpty
              ? const _PhotoFallback()
              : Image.network(
                  heroUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const _PhotoFallback(),
                ),
        );
      },
    );
  }
}

class _PhotoFallback extends StatelessWidget {
  const _PhotoFallback();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return ColoredBox(
      color: colorScheme.surfaceContainerHighest,
      child: Center(
        child: Icon(
          Icons.home_outlined,
          size: 56,
          color: colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _PreviewNotice extends StatelessWidget {
  const _PreviewNotice();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: colorScheme.onSecondaryContainer,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Showing preview while details load',
              style: TextStyle(color: colorScheme.onSecondaryContainer),
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineDetailError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _InlineDetailError({
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

class _ListingHeader extends StatelessWidget {
  final Listing listing;

  const _ListingHeader({required this.listing});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                listing.listPriceFormatted,
                style: textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),
            DecoratedBox(
              decoration: BoxDecoration(
                color: colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                child: Text(
                  listing.details.status,
                  style: textTheme.labelMedium?.copyWith(
                    color: colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          listing.address.full,
          style: textTheme.titleMedium,
        ),
        if (listing.address.neighborhood != null) ...[
          const SizedBox(height: 4),
          Text(
            listing.address.neighborhood!,
            style: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }
}

class _FactGrid extends StatelessWidget {
  final Listing listing;

  const _FactGrid({required this.listing});

  @override
  Widget build(BuildContext context) {
    final details = listing.details;
    final facts = <_Fact>[
      if (details.beds != null) _Fact('Beds', '${details.beds}'),
      if (details.baths != null) _Fact('Baths', '${details.baths}'),
      if (details.sqft != null) _Fact('Sqft', '${details.sqft}'),
      if (listing.meta.daysOnMarket != null)
        _Fact('Days on market', '${listing.meta.daysOnMarket}'),
      if (details.yearBuilt != null)
        _Fact('Year built', '${details.yearBuilt}'),
      if (details.propertyType != null) _Fact('Type', details.propertyType!),
    ];

    if (facts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: facts.map((fact) => _FactTile(fact: fact)).toList(),
    );
  }
}

class _Fact {
  final String label;
  final String value;

  const _Fact(this.label, this.value);
}

class _FactTile extends StatelessWidget {
  final _Fact fact;

  const _FactTile({required this.fact});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            fact.value,
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            fact.label,
            style: textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _DescriptionSection extends StatelessWidget {
  final Listing listing;

  const _DescriptionSection({required this.listing});

  @override
  Widget build(BuildContext context) {
    return _DetailSection(
      title: 'Description',
      child: Text(listing.description!.trim()),
    );
  }
}

class _AttributionSection extends StatelessWidget {
  final ListingAttribution attribution;

  const _AttributionSection({required this.attribution});

  @override
  Widget build(BuildContext context) {
    return _DetailSection(
      title: 'Listing information',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Provided by ${attribution.mlsName}'),
          const SizedBox(height: 8),
          Text(attribution.disclaimer),
        ],
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _DetailSection({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _FullScreenError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _FullScreenError({
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
              'Listing unavailable',
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
