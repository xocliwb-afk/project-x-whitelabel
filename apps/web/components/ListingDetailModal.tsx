'use client';

import { useEffect } from 'react';
import type { Listing } from '@project-x/shared-types';
import ListingImageGallery from './ListingImageGallery';
import { ListingInfo } from './ListingInfo';
import Link from 'next/link';
import { normalizeRemarks } from '@/lib/listingFormat';

type ListingDetailModalProps = {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ListingDetailModal({
  listing,
  isOpen,
  onClose,
}: ListingDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !listing) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const description = normalizeRemarks(listing.description ?? null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      onClick={handleBackdropClick}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={handleContentClick}
      >
        <button
          type="button"
          aria-label="Close listing details"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-border bg-white/95 px-3 py-1.5 text-sm font-semibold text-text-main shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          Close
        </button>
        <div className="w-full md:w-1/2">
          <ListingImageGallery
            photos={listing.media?.photos ?? []}
            listing={listing}
          />
          {description && (
            <div className="mt-4 px-4 pb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {description}
            </div>
          )}
        </div>
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 md:px-6">
            <Link
              href={`/listing/${listing.id}`}
              prefetch={false}
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
            >
              View full page
            </Link>
          </div>
          <ListingInfo listing={listing} />
        </div>
      </div>
    </div>
  );
}
