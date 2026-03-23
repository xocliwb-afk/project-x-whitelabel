import { Router } from 'express';
import { getListingProvider } from '../utils/provider.factory';
import { ListingSearchParams, NormalizedListing, ApiError } from '@project-x/shared-types';
import {
  clampLimit,
  hasAnyNonPagingFilter,
  parseBbox,
  stableSortListings,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from '../utils/listingSearch.util';
import { ListingsCache } from '../services/listingsCache.service';

const router = Router();

const parseStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === 'string') {
    const cleaned = value.split(/[,;]+/).map((v) => v.trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  }
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
};

const normalizeScalar = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str === '' ? undefined : str;
};

const normalizeArray = (values?: (string | number)[]): string | undefined => {
  if (!values) return undefined;
  const cleaned = values
    .map((v) => String(v).trim())
    .filter(Boolean)
    .sort();
  return cleaned.length ? cleaned.join(',') : undefined;
};

const buildSearchCacheKey = ({
  page,
  limit,
  sort,
  bbox,
  params,
}: {
  page: number;
  limit: number;
  sort?: ListingSearchParams['sort'];
  bbox?: string;
  params: ListingSearchParams;
}) => {
  const entries: [string, string][] = [];
  const add = (key: string, value: string | undefined) => {
    if (value === undefined) return;
    entries.push([key, value]);
  };

  add('page', normalizeScalar(page));
  add('limit', normalizeScalar(limit));
  add('sort', normalizeScalar(sort));
  add('bbox', normalizeScalar(bbox));
  add('q', normalizeScalar(params.q));
  add('keywords', normalizeScalar(params.keywords));
  add('minPrice', normalizeScalar(params.minPrice));
  add('maxPrice', normalizeScalar(params.maxPrice));
  add('beds', normalizeScalar(params.beds));
  add('maxBeds', normalizeScalar(params.maxBeds));
  add('baths', normalizeScalar(params.baths));
  add('maxBaths', normalizeScalar(params.maxBaths));
  add('propertyType', normalizeScalar(params.propertyType));
  add('status', normalizeArray(params.status));
  add('minSqft', normalizeScalar(params.minSqft));
  add('maxSqft', normalizeScalar(params.maxSqft));
  add('minYearBuilt', normalizeScalar(params.minYearBuilt));
  add('maxYearBuilt', normalizeScalar(params.maxYearBuilt));
  add('maxDaysOnMarket', normalizeScalar(params.maxDaysOnMarket));
  add('cities', normalizeArray(params.cities));
  add('postalCodes', normalizeArray(params.postalCodes));
  add('counties', normalizeArray(params.counties));
  add('neighborhoods', normalizeArray(params.neighborhoods));
  add('features', normalizeArray(params.features));
  add('subtype', normalizeArray(params.subtype));
  add('agent', normalizeArray(params.agent));
  add('brokers', normalizeArray(params.brokers));

  entries.sort(([aKey, aVal], [bKey, bVal]) => {
    if (aKey === bKey) return aVal.localeCompare(bVal);
    return aKey.localeCompare(bKey);
  });

  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
};

const getCacheConfig = () => {
  const enabledEnv = process.env.LISTINGS_CACHE_ENABLED;
  const enabled =
    typeof enabledEnv === 'string' && enabledEnv.length > 0
      ? enabledEnv === 'true'
      : process.env.NODE_ENV === 'production';
  const ttlSeconds = Number(process.env.LISTINGS_CACHE_TTL_SECONDS) || 30;
  const maxEntries = Number(process.env.LISTINGS_CACHE_MAX_ENTRIES) || 1000;
  const ttlMs = ttlSeconds * 1000;
  return { enabled, ttlMs, maxEntries };
};

let cacheStore:
  | {
      search: ListingsCache<any>;
      byId: ListingsCache<any>;
      maxEntries: number;
    }
  | null = null;

const getCaches = (maxEntries: number) => {
  if (!cacheStore || cacheStore.maxEntries !== maxEntries) {
    cacheStore = {
      search: new ListingsCache(maxEntries),
      byId: new ListingsCache(maxEntries),
      maxEntries,
    };
  }
  return cacheStore;
};

/**
 * GET /api/listings
 *
 * Returns a paginated set of listings using the ListingProvider abstraction.
 */
router.get('/', async (req, res) => {
  const requestId = res.locals?.requestId ?? 'unknown';
  const providerName = process.env.DATA_PROVIDER || 'unknown';
  const started = Date.now();
  try {
    const provider = getListingProvider();
    const cacheConfig = getCacheConfig();
    const caches = getCaches(cacheConfig.maxEntries);
    let cacheLabel: 'hit' | 'miss' | undefined;

    // req.query is an untyped object; cast carefully into ListingSearchParams
    const hasStatusKey = Object.prototype.hasOwnProperty.call(req.query, 'status');
    const parsedStatus = parseStringArray(req.query.status);
    const params: ListingSearchParams = {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      bbox: typeof req.query.bbox === 'string' ? req.query.bbox : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      beds: req.query.beds
        ? Number(req.query.beds)
        : req.query.minBeds
        ? Number(req.query.minBeds)
        : undefined,
      baths: req.query.baths
        ? Number(req.query.baths)
        : req.query.minBaths
        ? Number(req.query.minBaths)
        : undefined,
      propertyType: typeof req.query.propertyType === 'string' ? req.query.propertyType : undefined,
      sort: typeof req.query.sort === 'string' ? (req.query.sort as ListingSearchParams['sort']) : undefined,
      status: hasStatusKey ? parsedStatus : parsedStatus ?? ['FOR_SALE'],
      minSqft: req.query.minSqft ? Number(req.query.minSqft) : undefined,
      maxSqft: req.query.maxSqft ? Number(req.query.maxSqft) : undefined,
      minYearBuilt: req.query.minYearBuilt ? Number(req.query.minYearBuilt) : undefined,
      maxYearBuilt: req.query.maxYearBuilt ? Number(req.query.maxYearBuilt) : undefined,
      maxDaysOnMarket: req.query.maxDaysOnMarket ? Number(req.query.maxDaysOnMarket) : undefined,
      keywords: typeof req.query.keywords === 'string' ? req.query.keywords : undefined,
      cities: parseStringArray(req.query.cities ?? req.query.city),
      postalCodes: parseStringArray(
        req.query.postalCodes ?? req.query.postalcodes ?? req.query.zip ?? req.query.zips,
      ),
      counties: parseStringArray(req.query.counties ?? req.query.county),
      neighborhoods: parseStringArray(req.query.neighborhoods ?? req.query.neighborhood),
      features: parseStringArray(req.query.features),
      subtype: parseStringArray(req.query.subtype),
      agent: parseStringArray(req.query.agent),
      brokers: parseStringArray(req.query.brokers),
      maxBeds: parseNumber(req.query.maxBeds ?? req.query.maxbeds),
      maxBaths: parseNumber(req.query.maxBaths ?? req.query.maxbaths),
    };

    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const requestedLimit = clampLimit(params.limit);
    let limit = requestedLimit;

    // Validate bbox if provided; if missing, allow only when other filters exist
    let bboxString = params.bbox;
    try {
      if (bboxString) {
        const { minLng, minLat, maxLng, maxLat } = parseBbox(bboxString);
        bboxString = `${minLng},${minLat},${maxLng},${maxLat}`;
      } else {
        const hasFilters = hasAnyNonPagingFilter(params);
        if (!hasFilters && page > 1) {
          const error: ApiError = {
            error: true,
            message: 'bbox is required when paging without other filters',
            code: 'BAD_REQUEST',
            status: 400,
          };
          return res.status(400).json(error);
        }
        // Cap limit when bbox is missing regardless of page to protect providers
        if (limit > DEFAULT_LIMIT) {
          limit = DEFAULT_LIMIT;
        }
      }
    } catch (bboxErr: any) {
      const error: ApiError = {
        error: true,
        message: bboxErr?.message ?? 'Invalid bbox',
        code: 'BAD_REQUEST',
        status: 400,
      };
      return res.status(400).json(error);
    }

    const providerLimit = Math.min(limit + 1, MAX_LIMIT + 1);

    const executeSearch = async () => {
      const resultsRaw: NormalizedListing[] = await provider.search({
        ...params,
        bbox: bboxString,
        page,
        limit: providerLimit,
        clientLimit: limit,
      });

      const sorted = stableSortListings(resultsRaw, params.sort);
      const hasMore = sorted.length > limit;
      const results = sorted.slice(0, limit);

      return {
        results,
        pagination: {
          page,
          limit,
          pageCount: results.length,
          hasMore,
        },
      };
    };

    let payload;
    if (cacheConfig.enabled) {
      const cacheKey = buildSearchCacheKey({
        page,
        limit,
        sort: params.sort,
        bbox: bboxString,
        params,
      });
      const cached = caches.search.get(cacheKey);
      if (cached) {
        cacheLabel = 'hit';
        res.json(cached);
        console.log(
          JSON.stringify({
            event: 'api.listings.search',
            requestId,
            provider: providerName,
            durationMs: Date.now() - started,
            statusCode: 200,
            outcome: 'success',
            cache: cacheLabel,
          }),
        );
        return;
      }
      cacheLabel = 'miss';
      payload = await caches.search.getOrCreate(cacheKey, executeSearch, cacheConfig.ttlMs);
    } else {
      payload = await executeSearch();
    }

    res.json(payload);
    console.log(
      JSON.stringify({
        event: 'api.listings.search',
        requestId,
        provider: providerName,
        durationMs: Date.now() - started,
        statusCode: 200,
        outcome: 'success',
        cache: cacheLabel,
      }),
    );
  } catch (err: any) {
    const error: ApiError = {
      error: true,
      message: err?.message ?? 'Failed to fetch listings',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
    res.status(500).json(error);
    console.log(
      JSON.stringify({
        event: 'api.listings.search',
        requestId,
        provider: process.env.DATA_PROVIDER || 'unknown',
        durationMs: Date.now() - started,
        statusCode: res.statusCode || 500,
        outcome: 'error',
      }),
    );
  }
});

/**
 * GET /api/listings/:id
 *
 * Returns a single listing by ID or a 404 error if not found.
 */
const getListingById = async (req: any, res: any) => {
  const requestId = res.locals?.requestId ?? 'unknown';
  const providerName = process.env.DATA_PROVIDER || 'unknown';
  const started = Date.now();
  try {
    const cacheConfig = getCacheConfig();
    const caches = getCaches(cacheConfig.maxEntries);
    const provider = getListingProvider();
    const { id } = req.params;

    const cacheKey = `id:${id}`;
    if (cacheConfig.enabled) {
      const cached = caches.byId.get(cacheKey);
      if (cached && (cached as any).listing) {
        res.json(cached);
        console.log(
          JSON.stringify({
            event: 'api.listings.getById',
            requestId,
            provider: providerName,
            durationMs: Date.now() - started,
            statusCode: 200,
            outcome: 'success',
            cache: 'hit',
          }),
        );
        return;
      }
    }

    const listing: NormalizedListing | null = await provider.getById(id);

    if (!listing) {
      const error: ApiError = {
        error: true,
        message: 'Listing not found',
        code: 'NOT_FOUND',
        status: 404,
      };
      return res.status(404).json(error);
    }

    const payload = { listing };
    if (cacheConfig.enabled) {
      caches.byId.set(cacheKey, payload, cacheConfig.ttlMs);
    }

    res.json(payload);
    console.log(
      JSON.stringify({
        event: 'api.listings.getById',
        requestId,
        provider: providerName,
        durationMs: Date.now() - started,
        statusCode: 200,
        outcome: 'success',
        cache: cacheConfig.enabled ? 'miss' : undefined,
      }),
    );
  } catch (err: any) {
    const error: ApiError = {
      error: true,
      message: err?.message ?? 'Failed to fetch listing',
      code: 'INTERNAL_ERROR',
      status: 500,
    };
    res.status(500).json(error);
    console.log(
      JSON.stringify({
        event: 'api.listings.getById',
        requestId,
        provider: process.env.DATA_PROVIDER || 'unknown',
        durationMs: Date.now() - started,
        statusCode: res.statusCode || 500,
        outcome: 'error',
      }),
    );
  }
};

router.get('/:id', getListingById);

export default router;
