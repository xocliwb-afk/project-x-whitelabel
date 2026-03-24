import crypto from 'crypto';
import { SavedSearchFilters } from '@project-x/shared-types';

const MAX_FILTERS_PAYLOAD_BYTES = 4096;
const SORT_VALUES = new Set(['price-asc', 'price-desc', 'dom', 'newest']);
const STRING_KEYS = new Set<keyof SavedSearchFilters>([
  'q',
  'bbox',
  'propertyType',
  'sort',
  'keywords',
]);
const NUMBER_KEYS = new Set<keyof SavedSearchFilters>([
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
]);
const ARRAY_KEYS = new Set<keyof SavedSearchFilters>([
  'status',
  'cities',
  'postalCodes',
  'counties',
  'neighborhoods',
  'features',
  'subtype',
  'agent',
  'brokers',
]);
const ALLOWED_KEYS = new Set<keyof SavedSearchFilters>([
  ...STRING_KEYS,
  ...NUMBER_KEYS,
  ...ARRAY_KEYS,
]);

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const cleaned = Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return cleaned.length > 0 ? cleaned : null;
}

function validateNoUnknownKeys(raw: Record<string, unknown>): string[] {
  return Object.keys(raw).filter(
    (key) => !ALLOWED_KEYS.has(key as keyof SavedSearchFilters),
  );
}

export function canonicalizeFilters(raw: Record<string, unknown>): SavedSearchFilters {
  const canonical: Partial<SavedSearchFilters> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_KEYS.has(key as keyof SavedSearchFilters)) {
      continue;
    }

    if (value == null) {
      continue;
    }

    if (STRING_KEYS.has(key as keyof SavedSearchFilters)) {
      const normalized = normalizeString(value);
      if (!normalized) {
        continue;
      }

      if (key === 'sort' && !SORT_VALUES.has(normalized)) {
        continue;
      }

      canonical[key as keyof SavedSearchFilters] = normalized as never;
      continue;
    }

    if (NUMBER_KEYS.has(key as keyof SavedSearchFilters)) {
      const normalized = normalizeNumber(value);
      if (normalized == null) {
        continue;
      }

      canonical[key as keyof SavedSearchFilters] = normalized as never;
      continue;
    }

    if (ARRAY_KEYS.has(key as keyof SavedSearchFilters)) {
      const normalized = normalizeArray(value);
      if (!normalized) {
        continue;
      }

      canonical[key as keyof SavedSearchFilters] = normalized as never;
    }
  }

  return sortKeys(canonical) as SavedSearchFilters;
}

function serializeFilters(filters: SavedSearchFilters): string {
  return JSON.stringify(sortKeys(filters));
}

export function hashFilters(filters: SavedSearchFilters): string {
  return crypto.createHash('sha256').update(serializeFilters(filters)).digest('hex');
}

export function validateFilters(
  raw: unknown,
): { valid: true; filters: SavedSearchFilters } | { valid: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Filters must be an object' };
  }

  const unknownKeys = validateNoUnknownKeys(raw as Record<string, unknown>);
  if (unknownKeys.length > 0) {
    return {
      valid: false,
      error: `Unknown filter keys: ${unknownKeys.join(', ')}`,
    };
  }

  const canonical = canonicalizeFilters(raw as Record<string, unknown>);
  const serialized = serializeFilters(canonical);

  if (Buffer.byteLength(serialized, 'utf8') > MAX_FILTERS_PAYLOAD_BYTES) {
    return { valid: false, error: 'Filters payload exceeds 4096 bytes' };
  }

  return { valid: true, filters: canonical };
}
