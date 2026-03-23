"use client";

import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Listing as NormalizedListing } from "@project-x/shared-types";
import { useEffect } from "react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  formatAddressFull,
  formatPrice,
  formatSqft,
  formatStatus,
  getStatusBadgeClasses,
  getThumbnailUrl,
} from "@/lib/listingFormat";

type ListingPreviewModalProps = {
  listing: NormalizedListing | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ListingPreviewModal({ listing, isOpen, onClose }: ListingPreviewModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen || !listing) return null;

  const goToListing = () => {
    router.push(`/listing/${listing.id}`);
    onClose();
  };

  const priceLabel = formatPrice(listing);
  const statusLabel = formatStatus(listing.details?.status);
  const sqft = formatSqft(listing.details?.sqft);
  const mainPhoto = getThumbnailUrl(listing);

  const modal = (
    <div className="fixed inset-0 z-[99999] pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex h-full flex-col gap-3 p-4">
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Close preview"
            className="rounded-full bg-white/90 px-3 py-1 text-lg font-semibold shadow"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div
          className="flex-1 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={goToListing}
            className="flex h-full w-full flex-col gap-3 overflow-hidden text-left"
          >
            <div className="relative w-full overflow-hidden rounded-b-none rounded-t-2xl bg-slate-200 aspect-[16/9]">
              <Image
                src={mainPhoto}
                alt={listing.address?.full ?? "Listing photo"}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold leading-tight">{priceLabel}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(
                        listing.details?.status
                      )}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 line-clamp-2">{formatAddressFull(listing)}</div>
                  <div className="text-xs text-slate-600">
                    {(listing.details?.beds ?? "—").toString()} bd • {(listing.details?.baths ?? "—").toString()} ba
                    {sqft ? ` • ${sqft} sqft` : ""}
                  </div>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg">
                  ☆
                </span>
              </div>
              <div className="text-xs text-text-secondary">Tap to open full listing</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
