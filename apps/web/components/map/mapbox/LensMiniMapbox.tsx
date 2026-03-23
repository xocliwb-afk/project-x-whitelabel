"use client";

import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { NormalizedListing } from "@project-x/shared-types";
import { listingsToGeoJSON } from "./mapbox-utils";
import type { LatLngBoundsTuple } from "../types";

type LensMiniMapboxProps = {
  center: [number, number];
  listings: NormalizedListing[];
  bounds?: LatLngBoundsTuple | null;
  focusedListingId?: string | null;
  onMarkerClick: (listing: NormalizedListing) => void;
  lensSizePx?: number;
};

const SOURCE_ID = "lens-mini-listings";
const LAYER_ID = "lens-mini-points";
const SEPARATION_THRESH_PX = 28;
const MAX_REFIT_ATTEMPTS = 3;
const MIN_PADDING_PX = 10;
const MAX_MINIMAP_ZOOM = 17;

const convertBoundsToMapbox = (bounds: LatLngBoundsTuple) =>
  [
    [bounds[0][1], bounds[0][0]],
    [bounds[1][1], bounds[1][0]],
  ] as [mapboxgl.LngLatLike, mapboxgl.LngLatLike];

export function LensMiniMapbox({
  center,
  listings,
  bounds,
  focusedListingId,
  onMarkerClick,
  lensSizePx,
}: LensMiniMapboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const sourceReadyRef = useRef(false);
  const pendingBoundsRef = useRef<{
    bounds: ReturnType<typeof convertBoundsToMapbox>;
    targetBounds: LatLngBoundsTuple;
    padding: number;
    maxZoom: number;
    isPoint: boolean;
    center: [number, number];
  } | null>(null);
  type SepState = {
    key: string;
    bounds: LatLngBoundsTuple;
    padding: number;
    maxZoom: number;
    attempt: number;
  };
  const sepStateRef = useRef<SepState | null>(null);
  const lastFocusedIdRef = useRef<string | null>(null);
  const initialCenterRef = useRef<[number, number]>(center);
  const listingsRef = useRef(listings);
  const listingsByIdRef = useRef(new Map<string, NormalizedListing>());
  const tokenRef = useRef<string | undefined>(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  const onMarkerClickRef = useRef(onMarkerClick);

  useEffect(() => {
    listingsRef.current = listings;
    listingsByIdRef.current = new Map(listings.map((l) => [String(l.id), l]));
  }, [listings]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  const applyFocusedState = useCallback((targetId: string | null) => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) {
      lastFocusedIdRef.current = targetId;
      return;
    }
    if (!map.getSource(SOURCE_ID)) {
      lastFocusedIdRef.current = targetId;
      return;
    }

    if (lastFocusedIdRef.current) {
      map.setFeatureState({ source: SOURCE_ID, id: lastFocusedIdRef.current }, { focused: false });
    }

    if (targetId) {
      map.setFeatureState({ source: SOURCE_ID, id: targetId }, { focused: true });
    }

    lastFocusedIdRef.current = targetId;
  }, []);

  const buildSepKey = useCallback(
    (b: LatLngBoundsTuple) => {
      const ids = listingsRef.current.slice(0, 5).map((l) => String(l.id ?? l.mlsId ?? ""));
      return `${b[0][0]}|${b[0][1]}|${b[1][0]}|${b[1][1]}|len=${listingsRef.current.length}|ids=${ids.join(
        ","
      )}`;
    },
    []
  );

  const computeMinPixelDistance = useCallback(() => {
    const map = mapRef.current;
    if (!map) return Infinity;
    const coords = listingsRef.current
      .slice(0, 200)
      .map((l) => ({
        lat: Number(l.address?.lat),
        lng: Number(l.address?.lng),
      }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
    if (coords.length < 2) return Infinity;
    const projected = coords.map((c) => map.project([c.lng, c.lat]));
    let minDist = Infinity;
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const dx = projected[i].x - projected[j].x;
        const dy = projected[i].y - projected[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) minDist = dist;
      }
    }
    return minDist;
  }, []);

  const startOrResetSeparation = useCallback(
    (b: LatLngBoundsTuple, padding: number, maxZoom: number) => {
      sepStateRef.current = {
        key: buildSepKey(b),
        bounds: b,
        padding,
        maxZoom,
        attempt: 0,
      };
    },
    [buildSepKey]
  );

  const handleSeparationCheck = useCallback(() => {
    const map = mapRef.current;
    const state = sepStateRef.current;
    if (!map || !state) return;
    const currentKey = buildSepKey(state.bounds);
    if (currentKey !== state.key) {
      sepStateRef.current = null;
      return;
    }

    const minDist = computeMinPixelDistance();
    if (!Number.isFinite(minDist) || minDist >= SEPARATION_THRESH_PX) {
      sepStateRef.current = null;
      return;
    }

    if (state.attempt >= MAX_REFIT_ATTEMPTS) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[LensMiniMap] separation attempts exhausted");
      }
      sepStateRef.current = null;
      return;
    }

    state.attempt += 1;
    state.padding = Math.max(MIN_PADDING_PX, Math.round(state.padding * 0.7));
    state.maxZoom = Math.min(MAX_MINIMAP_ZOOM, Math.max(state.maxZoom, MAX_MINIMAP_ZOOM - 2));
    const mapboxBounds = convertBoundsToMapbox(state.bounds);
    map.fitBounds(mapboxBounds, { padding: state.padding, maxZoom: state.maxZoom, animate: false });
  }, [buildSepKey, computeMinPixelDistance]);

  const applyBounds = useCallback((targetBounds: LatLngBoundsTuple | null) => {
    if (!targetBounds) {
      pendingBoundsRef.current = null;
      sepStateRef.current = null;
      return;
    }

    const map = mapRef.current;
    const mapboxBounds = convertBoundsToMapbox(targetBounds);
    const south = targetBounds[0][0];
    const west = targetBounds[0][1];
    const north = targetBounds[1][0];
    const east = targetBounds[1][1];
    const isPoint = south === north && west === east;

    const padding = Math.min(64, Math.max(22, Math.round((lensSizePx ?? 400) * 0.08)));
    const diagLat = Math.abs(north - south);
    const diagLng = Math.abs(east - west);
    const diagDegrees = Math.hypot(diagLat, diagLng);
    const maxZoom =
      diagDegrees < 0.01 ? 15 : diagDegrees < 0.1 ? 14 : 12;
    const centerPoint: [number, number] = [(south + north) / 2, (west + east) / 2];

    const fit = () => {
      if (!map) return;
      if (isPoint) {
        map.setCenter([centerPoint[1], centerPoint[0]]);
        map.setZoom(Math.min(maxZoom, 15));
        return;
      }
      map.fitBounds(mapboxBounds, { padding, maxZoom, animate: false });
    };

    if (map && sourceReadyRef.current) {
      fit();
      startOrResetSeparation(targetBounds, padding, maxZoom);
      queueMicrotask(() => handleSeparationCheck());
    } else {
      pendingBoundsRef.current = {
        bounds: mapboxBounds,
        targetBounds,
        padding,
        maxZoom,
        isPoint,
        center: centerPoint,
      };
    }
  }, [handleSeparationCheck, lensSizePx, startOrResetSeparation]);

  useEffect(() => {
    applyFocusedState(focusedListingId ?? null);
  }, [applyFocusedState, focusedListingId]);

  useEffect(() => {
    sepStateRef.current = null;
    const map = mapRef.current;
    const source = map?.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(listingsToGeoJSON(listings));
      applyFocusedState(focusedListingId ?? null);
    }
  }, [applyFocusedState, listings, focusedListingId]);

  useEffect(() => {
    applyBounds(bounds ?? null);
  }, [applyBounds, bounds]);

  useEffect(() => {
    const container = containerRef.current;
    const token = tokenRef.current;
    if (!container || !token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenterRef.current[1] ?? 0, initialCenterRef.current[0] ?? 0],
      zoom: 13,
      interactive: true,
      attributionControl: false,
    });

    const canvas = map.getCanvas();
    canvas.style.cursor = "grab";

    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
    map.keyboard.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    const pillId = "lens-price-pill";
    if (!map.hasImage(pillId)) {
      const width = 72;
      const height = 30;
      const radius = 15;
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
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
        map.addImage(pillId, ctx.getImageData(0, 0, canvas.width, canvas.height), {
          pixelRatio: 2,
        });
      }
    }

    const handlePointClick = (e: mapboxgl.MapLayerMouseEvent) => {
      e.originalEvent?.stopPropagation?.();
      const feature = e.features?.[0];
      const id = feature?.properties?.id;
      if (!id) return;
      const listing = listingsByIdRef.current.get(String(id));
      if (!listing) return;
      onMarkerClickRef.current?.(listing);
    };

    const handlePointEnter = () => {
      canvas.style.cursor = "pointer";
    };

    const handlePointLeave = () => {
      canvas.style.cursor = "grab";
    };

    const handleLoad = () => {
      const sourceData = listingsToGeoJSON(listingsRef.current);
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: sourceData,
      });
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "focused"], false], 9, 7],
          "circle-color": ["case", ["boolean", ["feature-state", "focused"], false], "#2563eb", "#111827"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "lens-mini-price",
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "text-field": ["get", "priceLabel"],
          "text-size": 14,
          "icon-image": "lens-price-pill",
          "icon-text-fit": "both",
          "icon-text-fit-padding": [5, 8, 5, 8],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "center",
          "text-font": ["DIN Offc Pro Bold", "DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-anchor": "center",
          "text-offset": [0, 0],
          "text-padding": 2,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#0f172a",
          "text-halo-width": 0,
        },
      });

      map.on("mouseenter", LAYER_ID, handlePointEnter);
      map.on("mouseleave", LAYER_ID, handlePointLeave);
      map.on("click", LAYER_ID, handlePointClick);
      map.on("mouseenter", "lens-mini-price", handlePointEnter);
      map.on("mouseleave", "lens-mini-price", handlePointLeave);
      map.on("click", "lens-mini-price", handlePointClick);
      map.on("moveend", handleSeparationCheck);
      sourceReadyRef.current = true;

      if (pendingBoundsRef.current) {
        const { bounds: pendingBounds, targetBounds, padding, maxZoom, isPoint, center } =
          pendingBoundsRef.current;
        if (isPoint) {
          map.setCenter([center[1], center[0]]);
          map.setZoom(Math.min(maxZoom, 15));
        } else {
          map.fitBounds(pendingBounds, { padding, maxZoom, animate: false });
        }
        pendingBoundsRef.current = null;
        if (targetBounds) {
          startOrResetSeparation(targetBounds, padding, maxZoom);
          queueMicrotask(() => handleSeparationCheck());
        }
      }

      applyFocusedState(lastFocusedIdRef.current);
      map.resize();
      requestAnimationFrame(() => map.resize());

    };

    map.on("load", handleLoad);
    mapRef.current = map;

      return () => {
        map.off("load", handleLoad);
        map.off("mouseenter", LAYER_ID, handlePointEnter);
        map.off("mouseleave", LAYER_ID, handlePointLeave);
        map.off("click", LAYER_ID, handlePointClick);
        map.off("mouseenter", "lens-mini-price", handlePointEnter);
        map.off("mouseleave", "lens-mini-price", handlePointLeave);
        map.off("click", "lens-mini-price", handlePointClick);
        map.off("moveend", handleSeparationCheck);
        resizeObserver.disconnect();
        sourceReadyRef.current = false;
        lastFocusedIdRef.current = null;
        pendingBoundsRef.current = null;
        sepStateRef.current = null;
        map.remove();
        mapRef.current = null;
      };
  }, [applyFocusedState, handleSeparationCheck, startOrResetSeparation]);

  if (!tokenRef.current) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-surface-muted text-xs text-text-secondary">
        Mapbox token missing
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] text-text-secondary drop-shadow-sm">
        Map data © Mapbox, © OpenStreetMap
      </div>
    </div>
  );
}
