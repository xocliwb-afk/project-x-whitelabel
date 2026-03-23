import { ListingSearchParams, NormalizedListing } from '@project-x/shared-types';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const clampLimit = (limit?: number): number => {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  const safe = Math.floor(limit);
  return Math.min(Math.max(safe, 1), MAX_LIMIT);
};

export const parseBbox = (bbox: string) => {
  const parts = bbox.split(',').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('Invalid bbox format. Expected "minLng,minLat,maxLng,maxLat".');
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng >= maxLng || minLat >= maxLat) {
    throw new Error('Invalid bbox bounds. minLng/maxLng or minLat/maxLat are out of order.');
  }
  return { minLng, minLat, maxLng, maxLat };
};

export const hasAnyNonPagingFilter = (params: ListingSearchParams): boolean =>
  Boolean(
    params.q ||
      params.bbox ||
      params.minPrice != null ||
      params.maxPrice != null ||
      params.beds != null ||
      params.baths != null ||
      params.propertyType ||
      (params.status && params.status.length > 0) ||
      params.minSqft != null ||
      params.maxSqft != null ||
      params.minYearBuilt != null ||
      params.maxYearBuilt != null ||
      params.maxDaysOnMarket != null ||
      params.keywords ||
      (params.cities && params.cities.length > 0) ||
      (params.postalCodes && params.postalCodes.length > 0) ||
      (params.counties && params.counties.length > 0) ||
      (params.neighborhoods && params.neighborhoods.length > 0) ||
      (params.features && params.features.length > 0) ||
      (params.subtype && params.subtype.length > 0) ||
      (params.agent && params.agent.length > 0) ||
      (params.brokers && params.brokers.length > 0) ||
      params.maxBeds != null ||
      params.maxBaths != null,
  );

type SortKey = ListingSearchParams['sort'];

const getSortValue = (listing: NormalizedListing, sort?: SortKey): number | null => {
  switch (sort) {
    case 'price-asc':
    case 'price-desc':
      return Number.isFinite(listing.listPrice) ? Number(listing.listPrice) : null;
    case 'dom': {
      const dom = listing.meta?.daysOnMarket;
      return Number.isFinite(dom ?? null) ? Number(dom) : null;
    }
    case 'newest': {
      const raw =
        (listing.meta as any)?.listDate ??
        (listing.meta as any)?.listDateMs ??
        (listing as any).listDate;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string') {
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    }
    default:
      return null;
  }
};

const buildStableId = (listing: NormalizedListing): string => {
  const meta = (listing as any)?.meta ?? {};
  return String(
    listing.mlsId ??
      listing.id ??
      meta.listingId ??
      meta.providerId ??
      listing.address?.full ??
      'unknown',
  );
};

export const stableSortListings = (listings: NormalizedListing[], sort?: SortKey) => {
  // Keep original order if no sort requested
  if (!sort) return listings.slice();

  let dir: 'asc' | 'desc' = 'asc';
  if (sort === 'price-desc' || sort === 'newest') dir = 'desc';
  if (sort === 'dom') dir = 'asc';

  const withId = listings.map((item) => ({
    item,
    id: buildStableId(item),
  }));

  withId.sort((a, b) => {
    const aVal = getSortValue(a.item, sort);
    const bVal = getSortValue(b.item, sort);
    const aMissing = aVal == null || Number.isNaN(aVal);
    const bMissing = bVal == null || Number.isNaN(bVal);

    if (aMissing && bMissing) {
      return a.id.localeCompare(b.id);
    }
    if (aMissing) return 1;
    if (bMissing) return -1;

    if (aVal === bVal) {
      return a.id.localeCompare(b.id);
    }

    return dir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  return withId.map((w) => w.item);
};
