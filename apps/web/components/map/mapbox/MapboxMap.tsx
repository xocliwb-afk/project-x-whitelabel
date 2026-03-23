'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Listing as NormalizedListing } from '@project-x/shared-types';
import mapboxgl from 'mapbox-gl';
import { buildBboxFromBounds, listingsToGeoJSON } from './mapbox-utils';
import { MapboxLensPortal } from './MapboxLensPortal';
import { useMapLensStore } from '@/stores/useMapLensStore';
import { useMapLens } from '@/hooks/useMapLens';
import ListingPreviewModal from '../ListingPreviewModal';
import { trackEvent } from '@/lib/analytics';
import type { LatLngBoundsTuple } from '@/components/map/types';

type MapboxMapProps = {
  listings: NormalizedListing[];
  selectedListingId?: string | null;
  hoveredListingId?: string | null;
  onSelectListing?: (id: string | null) => void;
  onOpenListingDetailModal?: (listingOrId: NormalizedListing | string, source?: 'pin' | 'lens') => void;
  onHoverListing?: (id: string | null) => void;
  onBoundsChange?: (bounds: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
    bbox?: string;
  }, isUserGesture: boolean) => void;
  fitBbox?: string | null;
  fitBboxIsZipIntent?: boolean;
  onMapReady?: () => void;
  onMapError?: (error: unknown) => void;
};

const defaultCenter: [number, number] = [42.9634, -85.6681];
const defaultZoom = 12;
const OVERLAP_HITBOX_PX = 14;
const OVERLAP_MIN_COUNT = 2;
const OVERLAP_MAX_LENS = 50;

export default function MapboxMap({
  listings,
  onBoundsChange,
  selectedListingId,
  hoveredListingId,
  onSelectListing,
  onOpenListingDetailModal,
  onHoverListing,
  fitBbox = null,
  fitBboxIsZipIntent = false,
  onMapReady,
  onMapError,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const sourceReadyRef = useRef(false);
  const lastSelectedIdRef = useRef<string | null>(null);
  const lastHoveredIdRef = useRef<string | null>(null);
  const hoverPointRef = useRef<{ point: { x: number; y: number }; featureId?: string } | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const skipNextMapClickRef = useRef(false);
  const isDraggingRef = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const lastFitBboxRef = useRef<string | null>(null);
  const cinematicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewListing, setPreviewListing] = useState<NormalizedListing | null>(null);
  const listingsRef = useRef(listings);
  const resolveInitialCenter = () => {
    const firstWithCoords = listings.find(
      (l) => Number.isFinite(l.address.lat) && Number.isFinite(l.address.lng),
    );
    return firstWithCoords
      ? ([firstWithCoords.address.lat, firstWithCoords.address.lng] as [number, number])
      : defaultCenter;
  };
  const initialCenterRef = useRef<[number, number]>(resolveInitialCenter());
  const initialZoomRef = useRef<number>(defaultZoom);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onHoverListingRef = useRef(onHoverListing);
  const onSelectListingRef = useRef(onSelectListing);
  const onOpenListingDetailModalRef = useRef(onOpenListingDetailModal);
  const onMapReadyRef = useRef(onMapReady);
  const onMapErrorRef = useRef(onMapError);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { openImmediate, dismissLens } = useMapLens();
  const enableE2E =
    typeof window !== 'undefined' &&
    (process.env.NEXT_PUBLIC_E2E === 'true' || (window as any).__PX_E2E === true);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    onHoverListingRef.current = onHoverListing;
  }, [onHoverListing]);

  useEffect(() => {
    onSelectListingRef.current = onSelectListing;
  }, [onSelectListing]);

  useEffect(() => {
    onOpenListingDetailModalRef.current = onOpenListingDetailModal;
  }, [onOpenListingDetailModal]);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

  const getNearbyListingIds = useCallback(
    (point: { x: number; y: number }) => {
      const map = mapRef.current;
      if (!map || !sourceReadyRef.current) return [];
      const bbox: [[number, number], [number, number]] = [
        [point.x - OVERLAP_HITBOX_PX, point.y - OVERLAP_HITBOX_PX],
        [point.x + OVERLAP_HITBOX_PX, point.y + OVERLAP_HITBOX_PX],
      ];
      const features = map.queryRenderedFeatures(bbox, {
        layers: ['unclustered-price', 'unclustered-point'],
      });
      const ids = new Set<string>();
      features.forEach((f) => {
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const id = props.id ?? props.mlsId;
        if (id != null) {
          ids.add(String(id));
        }
      });
      return Array.from(ids);
    },
    [],
  );

  const mapIdsToListings = useCallback((ids: string[]) => {
    const byId = new Map<string, NormalizedListing>();
    listingsRef.current.forEach((l) => {
      if (l.id != null) byId.set(String(l.id), l);
      if (l.mlsId != null) byId.set(String(l.mlsId), l);
    });
    const results: NormalizedListing[] = [];
    ids.forEach((id) => {
      const listing = byId.get(id);
      if (listing && !results.includes(listing)) {
        results.push(listing);
      }
    });
    return results.slice(0, OVERLAP_MAX_LENS);
  }, []);

  const setFeatureState = useCallback((id: string, key: 'selected' | 'hovered', value: boolean) => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;
    const source = map.getSource('listings');
    if (!source) return;
    try {
      map.setFeatureState({ source: 'listings', id }, { [key]: value });
    } catch {
      /* noop */
    }
  }, []);

  const applyFeatureStates = useCallback(() => {
    if (lastSelectedIdRef.current) {
      setFeatureState(lastSelectedIdRef.current, 'selected', true);
    }
    if (lastHoveredIdRef.current) {
      setFeatureState(lastHoveredIdRef.current, 'hovered', true);
    }
  }, [setFeatureState]);

  const applyFitBbox = useCallback(
    (
      map: mapboxgl.Map | null,
      bboxStr: string | null | undefined,
      isZipIntent?: boolean,
    ) => {
      if (!map) return;
      if (cinematicTimeoutRef.current) {
        clearTimeout(cinematicTimeoutRef.current);
        cinematicTimeoutRef.current = null;
      }
      if (!bboxStr) {
        lastFitBboxRef.current = null;
        return;
      }
      if (lastFitBboxRef.current === bboxStr) return;
      const parts = bboxStr.split(',').map((v) => Number(v));
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return;
      const [minLng, minLat, maxLng, maxLat] = parts;
      const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      lastFitBboxRef.current = bboxStr;
      map.stop();

      const runFit = () => {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 50, animate: true, essential: true, maxZoom: 14, duration: 650 },
        );
      };

      if (isZipIntent) {
        map.easeTo({
          center,
          zoom: Math.min(map.getZoom(), 9),
          duration: 350,
          essential: true,
        });
        cinematicTimeoutRef.current = setTimeout(() => {
          cinematicTimeoutRef.current = null;
          runFit();
        }, 360);
        return;
      }

      runFit();
    },
    [],
  );

  useEffect(
    () => () => {
      if (cinematicTimeoutRef.current) {
        clearTimeout(cinematicTimeoutRef.current);
        cinematicTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    listingsRef.current = listings;
  }, [listings]);

  useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;

    mapboxgl.accessToken = token;

    let rafId: number | null = null;
    let createdMap: mapboxgl.Map | null = null;
    let cleanupTestHook: (() => void) | null = null;
    let handleMouseDown!: () => void;
    let handleMouseUp!: () => void;
    let handleMouseEnter: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
    let handleMouseMove: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
    let handleMouseLeave: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
    let handleClick: ((e: mapboxgl.MapLayerMouseEvent) => void) | null = null;
    let handleMapClick: ((e: mapboxgl.MapMouseEvent) => void) | null = null;

    const emitBounds = (e?: { originalEvent?: unknown }) => {
      if (!onBoundsChangeRef.current) return;
      const map = createdMap;
      if (!map) return;
      const bounds = map.getBounds() as mapboxgl.LngLatBounds;
      const bbox = buildBboxFromBounds(bounds);
      // Determine if this is a user gesture (drag/zoom with mouse/touch)
      // e.originalEvent exists for user interactions, null/undefined for programmatic moves
      const isUserGesture = !!(e && 'originalEvent' in e && e.originalEvent != null);
      onBoundsChangeRef.current(bbox, isUserGesture);
    };

    const sourceId = 'listings';

    const initMap = () => {
      if (!containerRef.current) return;

      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [initialCenterRef.current[1], initialCenterRef.current[0]],
          zoom: initialZoomRef.current,
        });
      } catch (err) {
        onMapErrorRef.current?.(err);
        return;
      }
      createdMap = map;
      mapRef.current = map;
      setMapInstance(map);
      map.on('error', (err) => {
        if (!sourceReadyRef.current) {
          onMapErrorRef.current?.(err);
        }
      });
      const canvas = map.getCanvas();
      canvas.style.cursor = 'grab';

      handleMouseDown = () => {
        isDraggingRef.current = true;
        canvas.style.cursor = 'grabbing';
      };
      handleMouseUp = () => {
        isDraggingRef.current = false;
        canvas.style.cursor = 'grab';
      };

      map.on('mousedown', handleMouseDown);
      map.on('mouseup', handleMouseUp);
      map.on('dragend', handleMouseUp);

      map.on('load', () => {
      const pillId = 'price-pill';
      if (map.hasImage(pillId) === false) {
        const width = 80;
        const height = 36;
        const radius = 18;
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(width - radius, 0);
          ctx.quadraticCurveTo(width, 0, width, radius);
          ctx.lineTo(width, height - radius);
          ctx.quadraticCurveTo(width, height, width - radius, height);
          ctx.lineTo(radius, height);
          ctx.quadraticCurveTo(0, height, 0, height - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          try {
            map.addImage(pillId, ctx.getImageData(0, 0, canvas.width, canvas.height), {
              pixelRatio: 2,
            });
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[MapboxMap] Failed to add price-pill image:', err);
            }
          }
        }
      }

      if (!map.getSource(sourceId)) {
        try {
          map.addSource(sourceId, {
            type: 'geojson',
            data: listingsToGeoJSON(listingsRef.current),
            cluster: false,
          });
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[MapboxMap] Failed to add source:', err);
          }
        }
      }

      if (!map.getLayer('unclustered-point')) {
        try {
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: sourceId,
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#2563eb',
              'circle-radius': 12,
              'circle-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.25,
                ['boolean', ['feature-state', 'hovered'], false],
                0.15,
                0.0,
              ],
              'circle-stroke-width': 0,
            },
          });
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[MapboxMap] Failed to add unclustered-point layer:', err);
          }
        }
      }

      if (!map.getLayer('unclustered-price')) {
        try {
          map.addLayer({
            id: 'unclustered-price',
            type: 'symbol',
            source: sourceId,
            filter: ['!', ['has', 'point_count']],
            layout: {
              'text-field': ['get', 'priceLabel'],
              'text-size': 14,
              'icon-image': 'price-pill',
              'icon-text-fit': 'both',
              'icon-text-fit-padding': [6, 10, 6, 10],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
              'text-font': ['DIN Offc Pro Bold', 'DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'text-anchor': 'center',
              'text-offset': [0, 0],
              'text-padding': 2,
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#0f172a',
              'text-halo-width': 0,
            },
          });
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[MapboxMap] Failed to add unclustered-price layer:', err);
          }
        }
      }

      const lensOpen = () => Boolean(useMapLensStore.getState().activeClusterData);

      const runHoverCheck = (point: { x: number; y: number }, featureId?: string) => {
        if (lensOpen()) return;
        const nearbyIds = getNearbyListingIds(point);
        const isCrowded = nearbyIds.length >= OVERLAP_MIN_COUNT;
        canvas.style.cursor = isCrowded ? 'zoom-in' : 'pointer';
        if (!featureId) return;
        setFeatureState(featureId, 'hovered', true);
        lastHoveredIdRef.current = featureId;
        onHoverListingRef.current?.(featureId);
      };

      handleMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
        hoverPointRef.current = {
          point: e.point,
          featureId: e.features?.[0]?.properties?.id as string | undefined,
        };
        runHoverCheck(hoverPointRef.current.point, hoverPointRef.current.featureId);
      };

      handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
        hoverPointRef.current = {
          point: e.point,
          featureId: e.features?.[0]?.properties?.id as string | undefined,
        };
        if (hoverRafRef.current != null) return;
        hoverRafRef.current = window.requestAnimationFrame(() => {
          hoverRafRef.current = null;
          const latestHover = hoverPointRef.current;
          if (!latestHover) return;
          runHoverCheck(latestHover.point, latestHover.featureId);
        });
      };

      handleMouseLeave = () => {
        if (hoverRafRef.current != null) {
          cancelAnimationFrame(hoverRafRef.current);
          hoverRafRef.current = null;
        }
        hoverPointRef.current = null;
        if (lensOpen()) return;
        canvas.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
        if (lastHoveredIdRef.current) {
          setFeatureState(lastHoveredIdRef.current, 'hovered', false);
          lastHoveredIdRef.current = null;
        }
        onHoverListingRef.current?.(null);
      };

      handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
        if (lensOpen()) return;
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (!id) return;
        const listing = listingsRef.current.find((l) => String(l.id) === id);
        if (!listing) return;
        const nearbyIds = getNearbyListingIds(e.point);
        if (nearbyIds.length >= OVERLAP_MIN_COUNT) {
          // Let the map-level click handler open MapLens for crowded clicks.
          return;
        }

        skipNextMapClickRef.current = true;
        trackEvent('listing_click', {
          listing_id: listing.id ?? listing.mlsId ?? id,
          source: 'pin',
          page_type: 'search',
        });
        setPreviewListing(null);
        onSelectListingRef.current?.(id);
        onOpenListingDetailModalRef.current?.(listing, 'pin');
      };

      map.on('mouseenter', 'unclustered-point', handleMouseEnter);
      map.on('mouseleave', 'unclustered-point', handleMouseLeave);
      map.on('click', 'unclustered-point', handleClick);
      map.on('mouseenter', 'unclustered-price', handleMouseEnter);
      map.on('mousemove', 'unclustered-price', handleMouseMove);
      map.on('mouseleave', 'unclustered-price', handleMouseLeave);
      map.on('click', 'unclustered-price', handleClick);

      handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        if (skipNextMapClickRef.current) {
          skipNextMapClickRef.current = false;
          return;
        }
        const { activeClusterData, isLocked } = useMapLensStore.getState();
        const lensIsOpen = Boolean(activeClusterData);
        if (lensIsOpen && isLocked) return;

        const nearbyIds = getNearbyListingIds(e.point);
        const isCrowded = nearbyIds.length >= OVERLAP_MIN_COUNT;
        if (isCrowded) {
          const baseListings = mapIdsToListings(nearbyIds);
          if (baseListings.length === 0) {
            dismissLens();
            return;
          }

          const { lng, lat } = e.lngLat;
          const overlapKey = `ov:${[...nearbyIds].sort().slice(0, 5).join('|')}:${baseListings.length}`;
          const activeClusterKey = useMapLensStore.getState().activeClusterData?.clusterKey;
          if (lensIsOpen && activeClusterKey === overlapKey && !isLocked) {
            dismissLens();
            return;
          }
          if (popupRef.current) {
            popupRef.current.remove();
          }
          setPreviewListing(null);

          const coords = baseListings
            .map((l) => ({
              lat: Number(l.address?.lat),
              lng: Number(l.address?.lng),
              listing: l,
            }))
            .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

          if (coords.length === 0) {
            openImmediate(baseListings, { lat, lng }, { clusterKey: overlapKey });
            return;
          }

          const south = Math.min(...coords.map((c) => c.lat));
          const north = Math.max(...coords.map((c) => c.lat));
          const west = Math.min(...coords.map((c) => c.lng));
          const east = Math.max(...coords.map((c) => c.lng));
          const latSpan = north - south;
          const lngSpan = east - west;
          const latPad = Math.max(latSpan * 0.12, 0.0005);
          const lngPad = Math.max(lngSpan * 0.12, 0.0005);
          const expanded: LatLngBoundsTuple = [
            [Math.max(-85, south - latPad), Math.max(-180, west - lngPad)],
            [Math.min(85, north + latPad), Math.min(180, east + lngPad)],
          ];

          const allListings = listingsRef.current;
          const dedupe = new Set<string>();
          const expandedListings: NormalizedListing[] = [];
          allListings.forEach((listing) => {
            const id = String(listing.id ?? listing.mlsId ?? '');
            if (!id || dedupe.has(id)) return;
            const latVal = Number(listing.address?.lat);
            const lngVal = Number(listing.address?.lng);
            if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) return;
            const inLat = latVal >= expanded[0][0] && latVal <= expanded[1][0];
            const inLng = lngVal >= expanded[0][1] && lngVal <= expanded[1][1];
            if (inLat && inLng) {
              dedupe.add(id);
              expandedListings.push(listing);
            }
          });

          const finalListings =
            expandedListings.length >= baseListings.length ? expandedListings : baseListings;

          openImmediate(finalListings, { lat, lng }, { clusterKey: overlapKey });
          return;
        }

        const hits = map.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point', 'unclustered-price'],
        });

        if (hits.length === 0) {
          if (popupRef.current) {
            popupRef.current.remove();
          }
          if (!lensIsOpen) {
            setPreviewListing(null);
          }
        }

        if (lensIsOpen && hits.length === 0 && !isLocked) {
          setPreviewListing(null);
          if (popupRef.current) {
            popupRef.current.remove();
          }
          dismissLens();
        }
      };

      map.on('click', handleMapClick);
      map.on('dragstart', () => {
        isDraggingRef.current = true;
        canvas.style.cursor = 'grabbing';
      });
      map.on('dragend', () => {
        isDraggingRef.current = false;
        canvas.style.cursor = 'grab';
      });
      map.on('drag', () => {
        if (isDraggingRef.current) {
          canvas.style.cursor = 'grabbing';
        }
      });
      map.on('mouseout', () => {
        isDraggingRef.current = false;
        canvas.style.cursor = 'grab';
      });

      sourceReadyRef.current = true;
      onMapReadyRef.current?.();
      emitBounds();
      applyFeatureStates();
      applyFitBbox(map, fitBbox ?? null, fitBboxIsZipIntent);
      if (enableE2E) {
        const hook = () => {
          const canvasEl = map.getCanvas();
          const width = canvasEl.clientWidth || canvasEl.width;
          const height = canvasEl.clientHeight || canvasEl.height;
          const centerX = width / 2;
          const centerY = height / 2;
          const offsets = [-40, 0, 40];
          const points: Array<{ x: number; y: number }> = [];
          offsets.forEach((dx) => {
            offsets.forEach((dy) => {
              const x = centerX + dx;
              const y = centerY + dy;
              if (x >= 0 && y >= 0 && x <= width && y <= height) {
                points.push({ x, y });
              }
            });
          });
          for (const pt of points) {
            const ids = getNearbyListingIds(pt);
            if (ids.length >= OVERLAP_MIN_COUNT) {
              const anchor = map.unproject([pt.x, pt.y]);
              const listingsForLens = mapIdsToListings(ids);
              openImmediate(listingsForLens, { lat: anchor.lat, lng: anchor.lng });
              return true;
            }
          }
          return false;
        };
        (window as any).__PX_TEST__ = { ...(window as any).__PX_TEST__, openLensAtCenter: hook };
        cleanupTestHook = () => {
          if ((window as any).__PX_TEST__) {
            delete (window as any).__PX_TEST__.openLensAtCenter;
          }
        };
      }
    });

      map.on('moveend', emitBounds as any);
      map.on('zoomend', emitBounds as any);
    };

    rafId = requestAnimationFrame(initMap);

    return () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      const map = createdMap;
      if (!map) return;
      map.off('load', emitBounds as any);
      map.off('moveend', emitBounds as any);
      map.off('zoomend', emitBounds as any);
      if (handleMouseEnter) {
        map.off('mouseenter', 'unclustered-point', handleMouseEnter);
        map.off('mouseenter', 'unclustered-price', handleMouseEnter);
      }
      if (handleMouseMove) {
        map.off('mousemove', 'unclustered-price', handleMouseMove);
      }
      if (handleMouseLeave) {
        map.off('mouseleave', 'unclustered-point', handleMouseLeave);
        map.off('mouseleave', 'unclustered-price', handleMouseLeave);
      }
      if (handleClick) {
        map.off('click', 'unclustered-point', handleClick);
        map.off('click', 'unclustered-price', handleClick);
      }
      if (handleMapClick) {
        map.off('click', handleMapClick);
      }
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUp);
      map.off('dragend', handleMouseUp);
      if (hoverRafRef.current != null) {
        cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
      hoverPointRef.current = null;
      if (cleanupTestHook) {
        cleanupTestHook();
      }
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      sourceReadyRef.current = false;
    };
  }, [
    token,
    applyFeatureStates,
    setFeatureState,
    openImmediate,
    dismissLens,
    getNearbyListingIds,
    mapIdsToListings,
    enableE2E,
    applyFitBbox,
    fitBbox,
    fitBboxIsZipIntent,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;
    const source = map.getSource('listings') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(listingsToGeoJSON(listings));
    applyFeatureStates();
  }, [listings, applyFeatureStates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyFitBbox(map, fitBbox ?? null, fitBboxIsZipIntent);
  }, [fitBbox, fitBboxIsZipIntent, applyFitBbox]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;
    if (lastSelectedIdRef.current && lastSelectedIdRef.current !== selectedListingId) {
      setFeatureState(lastSelectedIdRef.current, 'selected', false);
      lastSelectedIdRef.current = null;
    }
    if (selectedListingId) {
      setFeatureState(selectedListingId, 'selected', true);
      lastSelectedIdRef.current = selectedListingId;
    }
  }, [selectedListingId, setFeatureState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;
    if (lastHoveredIdRef.current && lastHoveredIdRef.current !== hoveredListingId) {
      setFeatureState(lastHoveredIdRef.current, 'hovered', false);
      lastHoveredIdRef.current = null;
    }
    if (hoveredListingId) {
      setFeatureState(hoveredListingId, 'hovered', true);
      lastHoveredIdRef.current = hoveredListingId;
    }
  }, [hoveredListingId, setFeatureState]);

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-text-main/70">
        Mapbox token missing
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <MapboxLensPortal
        map={mapInstance}
        onHoverListing={onHoverListing}
        onSelectListing={onSelectListing}
        onOpenListingDetailModal={onOpenListingDetailModal}
      />
      <ListingPreviewModal
        listing={previewListing}
        isOpen={Boolean(previewListing)}
        onClose={() => setPreviewListing(null)}
      />
    </>
  );
}
