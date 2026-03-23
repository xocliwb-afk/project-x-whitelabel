'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import { useMapLensStore } from '@/stores/useMapLensStore';
import { MapLens } from '../MapLens';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Listing } from '@project-x/shared-types';

type MapboxLensPortalProps = {
  map: mapboxgl.Map | null;
  onHoverListing?: (id: string | null) => void;
  onSelectListing?: (id: string | null) => void;
  onOpenListingDetailModal?: (listingOrId: Listing | string, source?: 'pin' | 'lens') => void;
};

export function MapboxLensPortal({
  map,
  onHoverListing,
  onSelectListing,
  onOpenListingDetailModal,
}: MapboxLensPortalProps) {
  const { activeClusterData, dismissLens, isLocked } = useMapLensStore((s) => ({
    activeClusterData: s.activeClusterData,
    dismissLens: s.dismissLens,
    isLocked: s.isLocked,
  }));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const isLockedRef = useRef(isLocked);
  const isMobile = useIsMobile();

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const ensureContainer = useCallback(() => {
    if (containerRef.current) return containerRef.current;
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      zIndex: '10000',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
    });
    el.dataset.testid = 'mapbox-lens-portal';
    containerRef.current = el;
    setPortalContainer(el);
    return el;
  }, []);

  const updatePosition = useCallback(() => {
    const mapInstance = map;
    const container = containerRef.current;
    if (!mapInstance || !container || !activeClusterData?.anchorLatLng) return;
    const { lat, lng } = activeClusterData.anchorLatLng;
    const point = mapInstance.project([lng, lat]);
    const rect = mapInstance.getContainer().getBoundingClientRect();
    container.style.left = `${rect.left + point.x}px`;
    container.style.top = `${rect.top + point.y}px`;
  }, [map, activeClusterData]);

  useEffect(() => {
    const mapInstance = map;
    if (!mapInstance || !activeClusterData || isMobile) {
      const existing = containerRef.current;
      if (existing && document.body.contains(existing)) {
        document.body.removeChild(existing);
      }
      setPortalContainer(null);
      containerRef.current = null;
      return;
    }

    let container = containerRef.current;
    if (!container) {
      container = ensureContainer();
    }
    if (!document.body.contains(container)) {
      document.body.appendChild(container);
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const inMap = Boolean(target && mapInstance?.getContainer()?.contains(target));
      const inLens = Boolean(target && container.contains(target));
      const inLensPreview = Boolean(
        target && target.closest?.('[data-maplens-preview="true"]')
      );
      if (isLockedRef.current) return;
      if (inMap) return;
      if (inLens || inLensPreview) return;
      dismissLens();
    };

    mapInstance.on('move', updatePosition);
    mapInstance.on('zoom', updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, true);

    updatePosition();
    requestAnimationFrame(updatePosition);

    return () => {
      mapInstance.off('move', updatePosition);
      mapInstance.off('zoom', updatePosition);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [map, activeClusterData, ensureContainer, updatePosition, dismissLens, isMobile]);

  if (isMobile) {
    if (!activeClusterData) return null;
    return (
      <MapLens
        isMobile
        onHoverListing={onHoverListing}
        onSelectListing={onSelectListing}
        onOpenListingDetailModal={onOpenListingDetailModal}
      />
    );
  }
  if (!activeClusterData) return null;
  const container = portalContainer;
  if (!container) return null;

  return createPortal(
    <div className="pointer-events-auto">
      <MapLens
        onHoverListing={onHoverListing}
        onSelectListing={onSelectListing}
        onOpenListingDetailModal={onOpenListingDetailModal}
        mapContainerEl={map?.getContainer() ?? null}
      />
    </div>,
    container,
  );
}
