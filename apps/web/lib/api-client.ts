import { Listing, ListingSearchParams, PlanTourRequest, PlannedTour } from '@project-x/shared-types';

/**
 * Extended filter params for web client.
 * These extend the base ListingSearchParams with additional filters
 * that the API supports but may not be in the shared-types yet.
 */
export type FetchListingsParams = ListingSearchParams & {
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  // Extended filters (API supports these, wired in this PR)
  cities?: string[];
  postalCodes?: string[];
  counties?: string[];
  neighborhoods?: string[];
  features?: string[];
  subtype?: string[];
  agent?: string[];
  brokers?: string[];
  maxBeds?: number;
  maxBaths?: number;
};

export type PaginatedListingsResponse = {
  results: Listing[];
  pagination: {
    page: number;
    limit: number;
    pageCount: number;
    hasMore: boolean;
  };
};

import { getApiBaseUrl } from "./getApiBaseUrl";

const API_BASE_URL = getApiBaseUrl();
const inflightListings = new Map<string, Promise<PaginatedListingsResponse>>();

/**
 * Fetches a paginated list of listings from the backend API.
 * Safe for both server and client components (uses GET with query params).
 */
export async function fetchListings(
  params: FetchListingsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedListingsResponse> {
  const searchParams = new URLSearchParams();
  const useLimit =
    params.limit != null
      ? params.limit
      : params.bbox || (params.swLat != null && params.swLng != null && params.neLat != null && params.neLng != null)
      ? 50
      : undefined;

  const bboxFromCorners =
    params.swLat != null &&
    params.swLng != null &&
    params.neLat != null &&
    params.neLng != null
      ? `${params.swLng},${params.swLat},${params.neLng},${params.neLat}`
      : null;

  const bbox = params.bbox ?? bboxFromCorners;

  if (bbox) searchParams.set('bbox', bbox);
  if (params.q) searchParams.set('q', params.q);
  if (params.page != null) searchParams.set('page', String(params.page));
  if (useLimit != null) searchParams.set('limit', String(useLimit));
  if (params.minPrice != null) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.beds != null) searchParams.set('beds', String(params.beds));
  if (params.baths != null) searchParams.set('baths', String(params.baths));
  if (params.propertyType) searchParams.set('propertyType', params.propertyType);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.status?.length)
    searchParams.set('status', params.status.filter(Boolean).join(','));
  if (params.minSqft != null) searchParams.set('minSqft', String(params.minSqft));
  if (params.maxSqft != null) searchParams.set('maxSqft', String(params.maxSqft));
  if (params.minYearBuilt != null)
    searchParams.set('minYearBuilt', String(params.minYearBuilt));
  if (params.maxYearBuilt != null)
    searchParams.set('maxYearBuilt', String(params.maxYearBuilt));
  if (params.maxDaysOnMarket != null)
    searchParams.set('maxDaysOnMarket', String(params.maxDaysOnMarket));
  if (params.keywords) searchParams.set('keywords', params.keywords);

  // Array params: append as repeated query params
  if (params.cities?.length) {
    for (const v of params.cities) searchParams.append('cities', v);
  }
  if (params.postalCodes?.length) {
    for (const v of params.postalCodes) searchParams.append('postalCodes', v);
  }
  if (params.counties?.length) {
    for (const v of params.counties) searchParams.append('counties', v);
  }
  if (params.neighborhoods?.length) {
    for (const v of params.neighborhoods) searchParams.append('neighborhoods', v);
  }
  if (params.features?.length) {
    for (const v of params.features) searchParams.append('features', v);
  }
  if (params.subtype?.length) {
    for (const v of params.subtype) searchParams.append('subtype', v);
  }
  if (params.agent?.length) {
    for (const v of params.agent) searchParams.append('agent', v);
  }
  if (params.brokers?.length) {
    for (const v of params.brokers) searchParams.append('brokers', v);
  }

  // Number params
  if (params.maxBeds != null) searchParams.set('maxBeds', String(params.maxBeds));
  if (params.maxBaths != null) searchParams.set('maxBaths', String(params.maxBaths));

  const qs = searchParams.toString();
  const url = `${API_BASE_URL}/api/listings${qs ? `?${qs}` : ''}`;

  const key = `GET ${url}`;
  // Coalesce identical in-flight GETs to avoid request storms. Only share when
  // no caller-specific AbortSignal is provided.
  if (!signal && inflightListings.has(key)) {
    return inflightListings.get(key)!;
  }

  const fetchPromise = fetch(url, {
    cache: 'no-store',
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch listings: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as PaginatedListingsResponse;
  });

  if (!signal) {
    inflightListings.set(key, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (!signal) {
      inflightListings.delete(key);
    }
  }
}

/**
 * Fetches a single listing by its ID from the backend API.
 * Intended to be called from server components.
 */
export async function fetchListing(id: string): Promise<{ listing: Listing }> {
  const url = `${API_BASE_URL}/api/listings/${encodeURIComponent(id)}`;

  const res = await fetch(url, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch listing ${id}: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as { listing: Listing };
}

export async function planTourApi(payload: PlanTourRequest): Promise<PlannedTour> {
  const url = `${API_BASE_URL}/api/tours`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = 'Failed to plan tour';
    try {
      const data = await res.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return (await res.json()) as PlannedTour;
}
