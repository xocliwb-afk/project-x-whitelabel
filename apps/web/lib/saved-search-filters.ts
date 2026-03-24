import type { SavedSearchFilters } from '@project-x/shared-types';

const STRING_KEYS = ['q', 'bbox', 'propertyType', 'keywords'] as const;
const SORT_VALUES = new Set(['newest', 'price-asc', 'price-desc', 'dom']);
const NUMBER_KEYS = [
  'minPrice',
  'maxPrice',
  'beds',
  'baths',
  'minSqft',
  'maxSqft',
  'minYearBuilt',
  'maxYearBuilt',
  'maxDaysOnMarket',
  'maxBeds',
  'maxBaths',
] as const;
const ARRAY_KEYS = [
  'status',
  'cities',
  'postalCodes',
  'counties',
  'neighborhoods',
  'features',
  'subtype',
  'agent',
  'brokers',
] as const;

function toMutableSearchParams(
  searchParams: URLSearchParams | { toString(): string },
): URLSearchParams {
  return new URLSearchParams(searchParams.toString());
}

export function extractSavedSearchFilters(
  searchParams: URLSearchParams | { toString(): string },
): SavedSearchFilters {
  const params = toMutableSearchParams(searchParams);
  const filters: Partial<SavedSearchFilters> = {};

  for (const key of STRING_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      filters[key] = value as SavedSearchFilters[typeof key];
    }
  }

  const sort = params.get('sort')?.trim();
  if (sort && SORT_VALUES.has(sort)) {
    filters.sort = sort as SavedSearchFilters['sort'];
  }

  for (const key of NUMBER_KEYS) {
    const value = params.get(key);
    if (!value) {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      filters[key] = parsed as SavedSearchFilters[typeof key];
    }
  }

  for (const key of ARRAY_KEYS) {
    const values = params
      .getAll(key)
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean);

    if (values.length > 0) {
      filters[key] = Array.from(new Set(values)).sort() as SavedSearchFilters[typeof key];
    }
  }

  return filters as SavedSearchFilters;
}

export function hasSavedSearchFilters(filters: SavedSearchFilters): boolean {
  return Object.keys(filters).length > 0;
}

export function buildSearchParamsFromSavedFilters(
  filters: SavedSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of STRING_KEYS) {
    const value = filters[key];
    if (typeof value === 'string' && value.trim()) {
      params.set(key, value);
    }
  }

  if (filters.sort) {
    params.set('sort', filters.sort);
  }

  for (const key of NUMBER_KEYS) {
    const value = filters[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      params.set(key, String(value));
    }
  }

  for (const key of ARRAY_KEYS) {
    const value = filters[key];
    if (!Array.isArray(value) || value.length === 0) {
      continue;
    }

    for (const item of value) {
      const normalized = item.trim();
      if (normalized) {
        params.append(key, normalized);
      }
    }
  }

  return params;
}
