import type {
  CreateSavedSearchRequest,
  CreateSavedSearchResponse,
  ListSavedSearchesResponse,
  SavedSearchRecord,
  SavedSearchFilters,
  UpdateSavedSearchRequest,
} from '@project-x/shared-types';
import type { SavedSearch } from '@project-x/database';
import { Prisma } from '@project-x/database';
import * as savedSearchRepo from '../repositories/saved-search.repository';
import { clampLimit, DEFAULT_LIMIT } from '../utils/listingSearch.util';
import {
  hashFilters,
  validateFilters,
} from '../utils/saved-search-filters';
import { createHttpError } from '../utils/http-error';

const MAX_NAME_LENGTH = 80;

function normalizePage(page?: number): number {
  if (!page || !Number.isFinite(page) || page <= 0) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeName(name: string): string {
  const normalized = name
    .normalize('NFC')
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g,
      '',
    )
    .trim();
  if (normalized.length === 0) {
    throw createHttpError(400, 'Saved search name is required', 'VALIDATION_ERROR');
  }
  if (normalized.length > MAX_NAME_LENGTH) {
    throw createHttpError(400, `Saved search name must be ${MAX_NAME_LENGTH} characters or fewer`, 'VALIDATION_ERROR');
  }

  return normalized;
}

function ensureFilters(filters: unknown): SavedSearchFilters {
  const validation = validateFilters(filters);
  if (!validation.valid) {
    const code = validation.error.includes('4096 bytes') ? 'PAYLOAD_TOO_LARGE' : 'VALIDATION_ERROR';
    throw createHttpError(400, validation.error, code);
  }

  if (Object.keys(validation.filters).length === 0) {
    throw createHttpError(400, 'At least one filter is required', 'VALIDATION_ERROR');
  }

  return validation.filters;
}

function toSavedSearchRecord(savedSearch: SavedSearch): SavedSearchRecord {
  let filters: SavedSearchFilters;

  if (
    savedSearch.filters &&
    typeof savedSearch.filters === 'object' &&
    !Array.isArray(savedSearch.filters)
  ) {
    filters = savedSearch.filters as SavedSearchFilters;
  } else {
    filters = {} as SavedSearchFilters;
  }

  return {
    id: savedSearch.id,
    name: savedSearch.name,
    filters,
    notifyNew: savedSearch.notifyNew,
    createdAt: savedSearch.createdAt.toISOString(),
    updatedAt: savedSearch.updatedAt.toISOString(),
  };
}

export async function list(
  userId: string,
  tenantId: string,
  page?: number,
  limit?: number,
): Promise<ListSavedSearchesResponse> {
  const safePage = normalizePage(page);
  const safeLimit = clampLimit(limit ?? DEFAULT_LIMIT);
  const { items, total } = await savedSearchRepo.findByUser(userId, tenantId, safePage, safeLimit);

  return {
    savedSearches: items.map(toSavedSearchRecord),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    },
  };
}

export async function getById(
  id: string,
  userId: string,
  tenantId: string,
): Promise<SavedSearchRecord | null> {
  const savedSearch = await savedSearchRepo.findById(id, userId, tenantId);
  return savedSearch ? toSavedSearchRecord(savedSearch) : null;
}

export async function create(
  userId: string,
  tenantId: string,
  input: CreateSavedSearchRequest,
): Promise<CreateSavedSearchResponse> {
  const name = normalizeName(input.name);
  const filters = ensureFilters(input.filters);
  const filtersHash = hashFilters(filters);

  const existing = await savedSearchRepo.findByHash(userId, tenantId, filtersHash);
  if (existing) {
    return {
      savedSearch: toSavedSearchRecord(existing),
      created: false,
    };
  }

  try {
    const createdRecord = await savedSearchRepo.create({
      userId,
      tenantId,
      name,
      filters: filters as unknown as Prisma.InputJsonValue,
      filtersHash,
      notifyNew: input.notifyNew ?? false,
    });

    return {
      savedSearch: toSavedSearchRecord(createdRecord),
      created: true,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingOnConflict = await savedSearchRepo.findByHash(userId, tenantId, filtersHash);
      if (existingOnConflict) {
        return {
          savedSearch: toSavedSearchRecord(existingOnConflict),
          created: false,
        };
      }
    }

    throw error;
  }
}

export async function update(
  id: string,
  userId: string,
  tenantId: string,
  input: UpdateSavedSearchRequest,
): Promise<SavedSearchRecord> {
  const existing = await savedSearchRepo.findById(id, userId, tenantId);
  if (!existing) {
    throw createHttpError(404, 'Saved search not found', 'SAVED_SEARCH_NOT_FOUND');
  }

  const nextName = input.name !== undefined ? normalizeName(input.name) : undefined;
  const nextFilters = input.filters !== undefined ? ensureFilters(input.filters) : undefined;
  const nextFiltersHash = nextFilters ? hashFilters(nextFilters) : undefined;

  const updated = await savedSearchRepo.update(id, userId, tenantId, {
    ...(nextName !== undefined ? { name: nextName } : {}),
    ...(nextFilters !== undefined
      ? {
          filters: nextFilters as unknown as Prisma.InputJsonValue,
          filtersHash: nextFiltersHash,
        }
      : {}),
    ...(input.notifyNew !== undefined ? { notifyNew: input.notifyNew } : {}),
  });

  if (!updated) {
    throw createHttpError(404, 'Saved search not found', 'SAVED_SEARCH_NOT_FOUND');
  }

  return toSavedSearchRecord(updated);
}

export async function deleteSavedSearch(
  id: string,
  userId: string,
  tenantId: string,
): Promise<void> {
  await savedSearchRepo.deleteById(id, userId, tenantId);
}
