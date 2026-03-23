'use client';

import type { Listing } from '@project-x/shared-types';
import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import { ListingCard } from './ListingCard';
import ListingCardSkeleton from './ListingCardSkeleton';

type ListingsListProps = {
  listings: Listing[];
  isLoading: boolean;
  isWaiting?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  loadMoreError?: string | null;
  onLoadMore?: () => void;
  selectedListingId: string | null;
  hoveredListingId?: string | null;
  onSelectListing: (id: string | null) => void;
  onHoverListing?: (id: string | null) => void;
  onCardClick?: (listing: Listing) => void;
};

export default function ListingsList({
  listings,
  isLoading,
  isWaiting = false,
  hasMore = false,
  isLoadingMore = false,
  loadMoreError = null,
  onLoadMore,
  selectedListingId,
  hoveredListingId,
  onSelectListing,
  onHoverListing,
  onCardClick,
}: ListingsListProps) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedListingId) return;
    const el = itemRefs.current[selectedListingId];
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedListingId]);

  if (isLoading || isWaiting) {
    return (
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2">
        {Array.from({ length: 8 }).map((_, idx) => (
          <ListingCardSkeleton key={`listing-skeleton-${idx}`} />
        ))}
      </div>
    );
  }

  if (!listings.length && !isWaiting) {
    return <p className="text-sm text-text-main/70">No listings found.</p>;
  }

  const disableLoadMore = isLoading || isWaiting || isLoadingMore;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2">
        {listings.map((listing, idx) => (
          <div
            key={listing.id}
            data-listing-id={listing.id}
            data-testid="listing-card-item"
            ref={(el) => {
              if (el) {
                itemRefs.current[listing.id] = el;
              } else {
                delete itemRefs.current[listing.id];
              }
            }}
            className="w-full"
          >
            <ListingCard
              listing={listing}
              isSelected={
                selectedListingId === listing.id ||
                hoveredListingId === listing.id
              }
              priority={idx === 0}
              onMouseEnter={() => onHoverListing?.(listing.id)}
              onMouseLeave={() => onHoverListing?.(null)}
              onClick={(clickedListing) => {
                const stableId = clickedListing.id ?? clickedListing.mlsId;
                const stableIdValue = stableId != null ? String(stableId) : null;
                if (stableIdValue) {
                  trackEvent('listing_click', {
                    listing_id: stableIdValue,
                    source: 'card',
                    page_type: 'search',
                  });
                }
                onSelectListing(stableIdValue);
                onCardClick?.(clickedListing);
              }}
            />
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-4">
          <button
            type="button"
            className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-main transition hover:bg-surface-accent disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onLoadMore}
            disabled={disableLoadMore || !onLoadMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
          {loadMoreError && (
            <p className="mt-2 text-xs text-red-500">{loadMoreError}</p>
          )}
        </div>
      )}
    </>
  );
}
