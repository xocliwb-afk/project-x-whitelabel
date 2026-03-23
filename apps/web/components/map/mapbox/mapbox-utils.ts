import type mapboxgl from 'mapbox-gl';

export const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

export type BboxResult = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  bbox: string;
};

export const buildBboxFromBounds = (
  bounds: mapboxgl.LngLatBounds,
): BboxResult => {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const swLat = round5(sw.lat);
  const swLng = round5(sw.lng);
  const neLat = round5(ne.lat);
  const neLng = round5(ne.lng);

  return {
    swLat,
    swLng,
    neLat,
    neLng,
    bbox: `${swLng},${swLat},${neLng},${neLat}`,
  };
};

const formatPriceLabel = (listing: { listPrice?: number | null }): string => {
  const price = Number(listing.listPrice);
  if (!Number.isFinite(price) || price <= 0) return '—';
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  const roundedThousands = Math.round(price / 1000);
  return `$${roundedThousands}K`;
};

export type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: {
      id: string;
      priceLabel: string;
    };
  }>;
};

export const listingsToGeoJSON = (
  listings: {
    id?: string | number;
    address?: { lat?: number; lng?: number };
    listPrice?: number | null;
  }[],
): GeoJSONFeatureCollection => {
  const features = listings
    .filter((l) => Number.isFinite(l.address?.lat) && Number.isFinite(l.address?.lng))
    .map((l) => ({
      type: 'Feature' as const,
      id: String(l.id ?? ''),
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(l.address!.lng), Number(l.address!.lat)] as [number, number],
      },
      properties: {
        id: String(l.id ?? ''),
        priceLabel: formatPriceLabel(l),
      },
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
};
