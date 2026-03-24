import {
  CreateFavoriteResponse,
  CreateSavedSearchRequest,
  CreateSavedSearchResponse,
  FavoriteIdsResponse,
  ListFavoritesResponse,
  ListSavedSearchesResponse,
  Listing,
  ListingSearchParams,
  PlanTourRequest,
  PlannedTour,
  UpdateSavedSearchRequest,
} from '@project-x/shared-types';

/**
 * Web client listing params. Extends ListingSearchParams with
 * corner-based bbox convenience fields (swLat/swLng/neLat/neLng)
 * that are converted to a bbox string before the API call.
 */
export type FetchListingsParams = ListingSearchParams & {
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
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

export type AuthenticatedRequestOptions = {
  accessToken: string;
  tenantId: string;
};

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

async function authenticatedApiFetch<T>(
  path: string,
  auth: AuthenticatedRequestOptions,
  init?: RequestInit,
): Promise<T> {
  if (!auth.tenantId.trim()) {
    throw new Error('Missing tenant configuration for authenticated request.');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${auth.accessToken}`,
      'x-tenant-id': auth.tenantId,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiClientError(
      typeof body?.message === 'string' ? body.message : `Request failed: ${res.status}`,
      res.status,
      typeof body?.code === 'string' ? body.code : undefined,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

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

export async function planTourApi(
  payload: PlanTourRequest,
  auth?: AuthenticatedRequestOptions,
): Promise<PlannedTour> {
  const url = `${API_BASE_URL}/api/tours`;

  if (auth && auth.tenantId.trim().length === 0) {
    throw new Error('Missing tenant configuration for authenticated tour request.');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      ...(auth?.tenantId ? { 'x-tenant-id': auth.tenantId } : {}),
    },
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

export async function getSavedSearches(
  auth: AuthenticatedRequestOptions,
  page = 1,
  limit = 20,
): Promise<ListSavedSearchesResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return authenticatedApiFetch<ListSavedSearchesResponse>(
    `/api/saved-searches?${searchParams.toString()}`,
    auth,
  );
}

export async function createSavedSearch(
  input: CreateSavedSearchRequest,
  auth: AuthenticatedRequestOptions,
): Promise<CreateSavedSearchResponse> {
  return authenticatedApiFetch<CreateSavedSearchResponse>('/api/saved-searches', auth, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSavedSearch(
  id: string,
  patch: UpdateSavedSearchRequest,
  auth: AuthenticatedRequestOptions,
): Promise<{ savedSearch: CreateSavedSearchResponse['savedSearch'] }> {
  return authenticatedApiFetch<{ savedSearch: CreateSavedSearchResponse['savedSearch'] }>(
    `/api/saved-searches/${encodeURIComponent(id)}`,
    auth,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
}

export async function deleteSavedSearch(
  id: string,
  auth: AuthenticatedRequestOptions,
): Promise<void> {
  await authenticatedApiFetch<void>(`/api/saved-searches/${encodeURIComponent(id)}`, auth, {
    method: 'DELETE',
  });
}

export async function getFavoriteIds(
  auth: AuthenticatedRequestOptions,
): Promise<FavoriteIdsResponse> {
  return authenticatedApiFetch<FavoriteIdsResponse>('/api/favorites/ids', auth);
}

export async function getFavorites(
  auth: AuthenticatedRequestOptions,
  page = 1,
  limit = 20,
): Promise<ListFavoritesResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return authenticatedApiFetch<ListFavoritesResponse>(
    `/api/favorites?${searchParams.toString()}`,
    auth,
  );
}

export async function addFavorite(
  listingId: string,
  auth: AuthenticatedRequestOptions,
): Promise<CreateFavoriteResponse> {
  return authenticatedApiFetch<CreateFavoriteResponse>('/api/favorites', auth, {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  });
}

export async function removeFavorite(
  listingId: string,
  auth: AuthenticatedRequestOptions,
): Promise<void> {
  await authenticatedApiFetch<void>(`/api/favorites/${encodeURIComponent(listingId)}`, auth, {
    method: 'DELETE',
  });
}
