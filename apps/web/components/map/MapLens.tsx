"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Listing } from "@project-x/shared-types";
import { useMapLensStore } from "@/stores/useMapLensStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { useTheme } from "@/context/ThemeContext";
import { trackEvent } from "@/lib/analytics";
import {
  formatAddressFull,
  formatPrice,
  formatSqft,
  formatStatus,
  getStatusBadgeClasses,
  getThumbnailUrl,
} from "@/lib/listingFormat";
import { LatLngBoundsTuple } from "./types";
import { computePreviewSide } from "@project-x/shared-types";

const MapboxLensMiniMap = dynamic(
  () => import("./mapbox/LensMiniMapbox").then((m) => m.LensMiniMapbox),
  {
    ssr: false,
    loading: () => <div className="h-full w-full rounded-full bg-surface-muted" />,
  },
);

type MapLensProps = {
  onHoverListing?: (id: string | null) => void;
  onSelectListing?: (id: string | null) => void;
  onOpenListingDetailModal?: (listingOrId: Listing | string, source?: "pin" | "lens") => void;
  isMobile?: boolean;
  mapContainerEl?: HTMLElement | null;
};

export function MapLens({
  onHoverListing,
  onSelectListing,
  onOpenListingDetailModal,
  isMobile,
  mapContainerEl,
}: MapLensProps) {
  const activeClusterData = useMapLensStore((s) => s.activeClusterData);
  const dismissLens = useMapLensStore((s) => s.dismissLens);
  const isLocked = useMapLensStore((s) => s.isLocked);
  const [visible, setVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const focusedListingId = useMapLensStore((s) => s.focusedListingId);
  const setFocusedListingId = useMapLensStore((s) => s.setFocusedListingId);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const lensOpenRef = useRef(false);
  const mobileDetected = useIsMobile();
  const { mapSide } = useTheme();

  const allClusterListings = useMemo(
    () => activeClusterData?.listings ?? [],
    [activeClusterData]
  );
  const sortedAllListings = useMemo(
    () =>
      [...allClusterListings].sort((a, b) => {
        const priceA =
          typeof a.listPrice === "number" ? a.listPrice : typeof a.listPrice === "string" ? Number(a.listPrice) : 0;
        const priceB =
          typeof b.listPrice === "number" ? b.listPrice : typeof b.listPrice === "string" ? Number(b.listPrice) : 0;
        return priceB - priceA;
      }),
    [allClusterListings]
  );
  const visibleListings = sortedAllListings.slice(0, 50);

  const clusterBounds: LatLngBoundsTuple | null = useMemo(() => {
    if (!activeClusterData) return null;
    const hasBounds = activeClusterData.bounds as any;
    if (
      hasBounds &&
      Array.isArray(hasBounds) &&
      hasBounds.length === 2 &&
      Array.isArray(hasBounds[0]) &&
      Array.isArray(hasBounds[1])
    ) {
      const south = Number(hasBounds[0][0]);
      const west = Number(hasBounds[0][1]);
      const north = Number(hasBounds[1][0]);
      const east = Number(hasBounds[1][1]);
      if ([south, west, north, east].every((n) => Number.isFinite(n))) {
        return [
          [south, west],
          [north, east],
        ];
      }
    }
    let south = Infinity;
    let west = Infinity;
    let north = -Infinity;
    let east = -Infinity;
    allClusterListings.forEach((l) => {
      const lat = Number(l.address?.lat);
      const lng = Number(l.address?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        south = Math.min(south, lat);
        west = Math.min(west, lng);
        north = Math.max(north, lat);
        east = Math.max(east, lng);
      }
    });
    if ([south, west, north, east].some((v) => !Number.isFinite(v))) return null;
    return [
      [south, west],
      [north, east],
    ];
  }, [activeClusterData, allClusterListings]);

  const lensSizePx = useMemo(() => {
    const isMobileView = (isMobile ?? false) || mobileDetected;
    if (isMobileView) {
      const base = viewportWidth * 0.78;
      return Math.min(350, Math.max(240, base));
    }
    return Math.min(525, Math.max(350, viewportWidth * 0.35));
  }, [viewportWidth, isMobile, mobileDetected]);
  const lensKey = useMemo(() => {
    if (!activeClusterData) return "lens-none";
    const { lat, lng } = activeClusterData.anchorLatLng;
    return `lens-${lat.toFixed(5)}-${lng.toFixed(5)}-${activeClusterData.listings.length}`;
  }, [activeClusterData]);
  const MiniMapComponent = MapboxLensMiniMap;

  useEffect(() => {
    setVisible(Boolean(activeClusterData));
  }, [activeClusterData]);

  useEffect(() => {
    const isOpen = Boolean(activeClusterData);
    if (isOpen && !lensOpenRef.current) {
      trackEvent("maplens_open", {
        cluster_size: activeClusterData?.listings?.length ?? undefined,
      });
    }
    lensOpenRef.current = isOpen;
  }, [activeClusterData]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setFocusedListingId(null);
    dismissLens();
    onHoverListing?.(null);
  }, [dismissLens, onHoverListing, setFocusedListingId]);

  useEffect(() => {
    setFocusedListingId(null);
  }, [activeClusterData, setFocusedListingId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleDismiss]);

  const focusedListing = useMemo(
    () => sortedAllListings.find((l) => l.id === focusedListingId) ?? null,
    [sortedAllListings, focusedListingId]
  );

  const lensTransitionClass =
    "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";
  const lensVisibilityClass = visible
    ? "opacity-100 scale-100"
    : "opacity-0 scale-50";
  const pointerClass = visible ? "pointer-events-auto" : "pointer-events-none";
  const listOnRight = mapSide === "left";
  const [previewOnRight, setPreviewOnRight] = useState(listOnRight);
  const [, setPreviewKey] = useState(0);

  const isMobileView = (isMobile ?? false) || mobileDetected;

  useEffect(() => {
    if (!isMobileView || !activeClusterData) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isMobileView, activeClusterData]);

  useEffect(() => {
    if (!focusedListing) {
      setPreviewOnRight(listOnRight);
      return;
    }
    const mapRect = mapContainerEl?.getBoundingClientRect();
    const lensRect = lensRef.current?.getBoundingClientRect();
    const side = computePreviewSide(mapRect, lensRect, listOnRight);
    setPreviewOnRight(side ?? listOnRight);
  }, [focusedListing, listOnRight, mapContainerEl]);

  // Update preview position when lens moves or window resizes
  useEffect(() => {
    if (!focusedListing || isMobileView) return;

    const updatePreviewPosition = () => {
      setPreviewKey(k => k + 1);
    };

    // Update on scroll (lens might move within viewport)
    window.addEventListener("scroll", updatePreviewPosition, { passive: true });
    // Update on resize
    window.addEventListener("resize", updatePreviewPosition);
    // Update on animation frame (for smooth tracking during map pan/zoom)
    let rafId: number;
    const trackPosition = () => {
      updatePreviewPosition();
      rafId = requestAnimationFrame(trackPosition);
    };
    rafId = requestAnimationFrame(trackPosition);

    return () => {
      window.removeEventListener("scroll", updatePreviewPosition);
      window.removeEventListener("resize", updatePreviewPosition);
      cancelAnimationFrame(rafId);
    };
  }, [focusedListing, isMobileView]);

  if (!activeClusterData || allClusterListings.length === 0) {
    return null;
  }

  const goToListing = (id: string) => {
    const idStr = String(id);
    onSelectListing?.(idStr);
    const listing = sortedAllListings.find(
      (candidate) => String(candidate.id) === idStr
    );
    if (listing) {
      const listingForModal = { ...listing, id: idStr };
      onOpenListingDetailModal?.(listingForModal, "lens");
    } else {
      onOpenListingDetailModal?.(idStr, "lens");
    }
    handleDismiss();
  };

  if (isMobileView) {
    const modal = (
      <div className="fixed inset-0 z-[99999] pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-0 bg-black/40" onClick={handleDismiss} />
        <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 p-4">
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Close lens"
              className="rounded-full bg-white/90 px-3 py-1 text-lg font-semibold shadow"
              onClick={handleDismiss}
            >
              ×
            </button>
          </div>
          <div
            className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-64 border-b border-border">
            <MiniMapComponent
              key={lensKey}
              center={[
                activeClusterData.anchorLatLng?.lat,
                activeClusterData.anchorLatLng?.lng,
              ]}
              listings={sortedAllListings}
              bounds={clusterBounds}
              focusedListingId={focusedListingId}
              onMarkerClick={(listing) => {
                setFocusedListingId(listing.id);
                onHoverListing?.(listing.id);
              }}
              lensSizePx={lensSizePx}
            />
            </div>
            {sortedAllListings.length > visibleListings.length && (
              <div className="px-4 pb-2 text-[11px] text-text-secondary">
                Showing 50 of {sortedAllListings.length}. Zoom in to reduce overlap.
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
              {focusedListing ? (
                <button
                  type="button"
                  onClick={() => goToListing(focusedListing.id)}
                  className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition active:scale-[0.99]"
                >
                  <div className="relative w-full overflow-hidden rounded-xl bg-slate-200 aspect-[16/9]">
                    <Image
                      src={getThumbnailUrl(focusedListing)}
                      alt={focusedListing.address?.full ?? "Listing photo"}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold leading-tight">
                        {formatPrice(focusedListing)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(
                            focusedListing.details?.status
                          )}`}
                        >
                          {formatStatus(focusedListing.details?.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 line-clamp-2">
                        {formatAddressFull(focusedListing)}
                      </div>
                      <div className="text-xs text-slate-600">
                        {(focusedListing.details?.beds ?? "—").toString()} bd •{" "}
                        {(focusedListing.details?.baths ?? "—").toString()} ba
                        {(() => {
                          const sqft = formatSqft(focusedListing.details?.sqft);
                          return sqft ? ` • ${sqft} sqft` : "";
                        })()}
                      </div>
                    </div>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-lg">
                      ☆
                    </span>
                  </div>

                      <div className="text-xs text-text-secondary">
                        Tap to open full listing
                      </div>
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                  Select a pin to preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
    if (typeof document === "undefined") return modal;
    return createPortal(modal, document.body);
  }

  return (
    <div
      ref={lensRef}
      data-testid="map-lens"
      className={`${pointerClass} ${lensTransitionClass} ${lensVisibilityClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex flex-col items-center">
        <div
          style={{ width: lensSizePx, height: lensSizePx }}
          className="relative rounded-full overflow-hidden border-2 border-border/70 bg-surface/10 shadow-2xl backdrop-blur-lg"
          onClick={(e) => {
            e.stopPropagation();
            if (!isLocked) {
              handleDismiss();
            }
          }}
        >
          <MiniMapComponent
            key={lensKey}
            center={[
              activeClusterData.anchorLatLng?.lat,
              activeClusterData.anchorLatLng?.lng,
            ]}
            listings={sortedAllListings}
            bounds={clusterBounds}
            focusedListingId={focusedListingId}
            onMarkerClick={(listing) => {
              setFocusedListingId(listing.id);
              onHoverListing?.(listing.id);
            }}
            lensSizePx={lensSizePx}
          />
        </div>
        {sortedAllListings.length > visibleListings.length && (
          <div className="mt-1 text-[11px] text-text-secondary">
            Showing 50 of {sortedAllListings.length}. Zoom in to reduce overlap.
          </div>
        )}

        {focusedListing && typeof document !== "undefined" && (() => {
          const lensRect = lensRef.current?.getBoundingClientRect();
          if (!lensRect) return null;

          const previewWidth = 320; // w-80
          const gap = 12; // ml-3/mr-3

          // Calculate fixed position based on lens position
          const top = lensRect.top + lensRect.height / 2;
          let left: number;

          if (previewOnRight) {
            left = lensRect.right + gap;
            // Flip if would overflow viewport
            if (left + previewWidth > window.innerWidth) {
              left = lensRect.left - previewWidth - gap;
            }
          } else {
            left = lensRect.left - previewWidth - gap;
            // Flip if would overflow viewport
            if (left < 0) {
              left = lensRect.right + gap;
            }
          }

          return createPortal(
            <div
              style={{
                position: "fixed",
                top: `${top}px`,
                left: `${left}px`,
                transform: "translateY(-50%)",
                zIndex: 10000,
              }}
            >
              <button
                data-maplens-preview="true"
                type="button"
                onClick={() => {
                  const lensId = String(
                    focusedListing?.id ?? focusedListing?.mlsId ?? ""
                  );
                  if (!lensId) return;
                  goToListing(lensId);
                }}
                className={`w-64 rounded-2xl bg-white shadow-lg border border-border/60 p-2 text-left cursor-pointer transition-all duration-200 ease-out ${
                  focusedListing
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
              >
                <div className="flex flex-col gap-2 w-full">
                  <div className="mb-2 w-full overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic listing thumbnail URL; keep <img> to avoid remotePatterns and behavior drift */}
                    <img
                      src={getThumbnailUrl(focusedListing)}
                      alt={focusedListing.address?.full ?? "Listing photo"}
                      className="h-28 w-full object-cover bg-slate-200"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-text-main">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-lg font-semibold leading-tight">
                        {formatPrice(focusedListing)}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(
                          focusedListing.details?.status
                        )}`}
                      >
                        {formatStatus(focusedListing.details?.status)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 line-clamp-2">
                      {formatAddressFull(focusedListing)}
                    </div>
                    <div className="text-xs text-slate-600">
                      {(focusedListing.details?.beds ?? "—").toString()} bd •{" "}
                      {(focusedListing.details?.baths ?? "—").toString()} ba
                      {(() => {
                        const sqft = formatSqft(focusedListing.details?.sqft);
                        return sqft ? ` • ${sqft} sqft` : "";
                      })()}
                    </div>
                    <span className="mt-2 text-xs font-semibold text-blue-600 hover:underline">
                      View Details →
                    </span>
                  </div>
                </div>
              </button>
            </div>,
            document.body
          );
        })()}
        {isLocked && (
          <div className="mt-2 text-[11px] text-text-secondary">
            {focusedListing
              ? 'Use "View details" to open the listing.'
              : "Click a price to preview details."}
          </div>
        )}
      </div>
    </div>
  );
}
