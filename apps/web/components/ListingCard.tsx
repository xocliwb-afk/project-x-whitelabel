'use client';

import type { Listing } from '@project-x/shared-types';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { geocodeLocation } from '@/lib/geocode-client';
import {
  formatAddressFull,
  formatAttribution,
  formatDaysOnMarketShort,
  formatPrice,
  formatSqft,
  formatStatus,
  getListingDetailsRows,
  getStatusBadgeClasses,
  getThumbnailUrl,
} from '@/lib/listingFormat';

interface ListingCardProps {
  listing: Listing;
  isSelected: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onClick?: (listing: Listing) => void;
  priority?: boolean;
}

export function ListingCard({
  listing,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
  priority = false,
}: ListingCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const photos = listing.media?.photos ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  const priceText = formatPrice(listing);
  const beds = listing.details?.beds ?? 0;
  const baths = listing.details?.baths ?? 0;
  const bedsLabel = listing.details?.beds != null ? String(listing.details.beds) : 'N/A';
  const bathsLabel = listing.details?.baths != null ? String(listing.details.baths) : 'N/A';
  const sqft = formatSqft(listing.details?.sqft ?? null);
  const daysOnMarket = formatDaysOnMarketShort(listing.meta?.daysOnMarket ?? null);
  const mlsAttribution = formatAttribution(listing);

  const fullAddress = formatAddressFull(listing);
  const thumbnail = getThumbnailUrl(listing);
  const status = listing.details?.status;
  const currentImageUrl = photos[currentIndex] ?? thumbnail;
  const statusClass = getStatusBadgeClasses(status);
  const detailRows = getListingDetailsRows(listing);
  const county = (listing as any)?.address?.county as string | undefined;
  const neighborhood = (listing as any)?.address?.neighborhood as string | undefined;

  // --- Event Handlers ---
  const handleClick = () => {
    onClick?.(listing);
  };

  const applyLocationFilter = async (
    type: 'city' | 'zip' | 'county' | 'neighborhood',
    value?: string | null,
  ) => {
    if (!value) return;
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());
    const key =
      type === 'city'
        ? 'cities'
        : type === 'zip'
        ? 'postalCodes'
        : type === 'county'
        ? 'counties'
        : 'neighborhoods';

    params.delete(key);
    params.append(key, value);
    const geo = await geocodeLocation(value);
    if (geo?.bbox) {
      params.set('bbox', geo.bbox);
    }
    params.set('searchToken', Date.now().toString());

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // Prevent space from scrolling the page
      onClick?.(listing);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onMouseEnter(listing.id)}
      onMouseLeave={onMouseLeave}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 cursor-pointer dark:bg-slate-800 ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md hover:-translate-y-1'
      }`}
      aria-label={`${fullAddress} — ${priceText}, ${bedsLabel} bed, ${bathsLabel} bath. View details.`}
    >
      <div className="relative w-full overflow-hidden bg-slate-200 dark:bg-slate-700 aspect-[4/3] md:aspect-[16/9]">
        <Image
          src={currentImageUrl}
          alt={`Image of ${fullAddress}`}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(min-width: 1280px) 320px, (min-width: 1024px) 320px, (min-width: 768px) 50vw, 100vw"
          priority={priority}
          className="bg-slate-200"
        />
        {typeof status === 'string' && status.trim().length > 0 && (
          <div className="absolute left-3 top-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm ${statusClass}`}
            >
              {formatStatus(status)}
            </span>
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 flex -translate-y-1/2 rounded-full bg-white/80 p-1 text-slate-800 shadow opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
              }}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 flex -translate-y-1/2 rounded-full bg-white/80 p-1 text-slate-800 shadow opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCurrentIndex((prev) => (prev + 1) % photos.length);
              }}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-slate-900 dark:text-white">
                {priceText}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                {fullAddress}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Link
                href={`/listing/${listing.id}`}
                prefetch={false}
                onClick={(e) => e.stopPropagation()} // Prevent card click from firing
              className="inline-flex items-center whitespace-nowrap py-1 text-xs text-blue-600 hover:underline"
              aria-label={`View full page for ${fullAddress}`}
            >
              Full Page
            </Link>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
            {listing.address?.city && (
              <button
                type="button"
                data-testid="chip-city"
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void applyLocationFilter('city', listing.address?.city);
                }}
              >
                {listing.address.city}
              </button>
            )}
            {listing.address?.zip && (
              <button
                type="button"
                data-testid="chip-zip"
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void applyLocationFilter('zip', listing.address?.zip);
                }}
              >
                {listing.address.zip}
              </button>
            )}
            {county && (
              <button
                type="button"
                data-testid="chip-county"
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void applyLocationFilter('county', county);
                }}
              >
                {county}
              </button>
            )}
            {neighborhood && (
              <button
                type="button"
                data-testid="chip-neighborhood"
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  void applyLocationFilter('neighborhood', neighborhood);
                }}
              >
                {neighborhood}
              </button>
            )}
          </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span>{beds} bd</span>
          <span>•</span>
            <span>{baths} ba</span>
            {sqft && (
              <>
                <span>•</span>
                <span>{sqft} sqft</span>
              </>
            )}
          </div>

          {detailRows.length > 0 && (
            <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
              {detailRows.map((row) => (
                <div key={row.label} className="flex gap-1">
                  <span className="font-semibold">{row.label}:</span>
                  <span className="line-clamp-1">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
          <span className="whitespace-pre-line">{mlsAttribution}</span>
          {daysOnMarket && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {daysOnMarket}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
