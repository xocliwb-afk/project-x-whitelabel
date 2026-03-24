import type {
  CreateFavoriteResponse,
  FavoriteIdsResponse,
  FavoriteRecord,
  ListFavoritesResponse,
} from '@project-x/shared-types';
import { Prisma } from '@project-x/database';
import * as favoriteRepo from '../repositories/favorite.repository';
import { clampLimit, DEFAULT_LIMIT } from '../utils/listingSearch.util';
import { createHttpError } from '../utils/http-error';

const MAX_LISTING_ID_LENGTH = 128;

function normalizePage(page?: number): number {
  if (!page || !Number.isFinite(page) || page <= 0) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeListingId(listingId: string): string {
  const normalized = listingId.trim();
  if (normalized.length === 0) {
    throw createHttpError(400, 'Listing ID is required', 'VALIDATION_ERROR');
  }
  if (normalized.length > MAX_LISTING_ID_LENGTH) {
    throw createHttpError(400, `Listing ID must be ${MAX_LISTING_ID_LENGTH} characters or fewer`, 'VALIDATION_ERROR');
  }

  return normalized;
}

function toFavoriteRecord(favorite: {
  id: string;
  listingId: string;
  createdAt: Date;
}): FavoriteRecord {
  return {
    id: favorite.id,
    listingId: favorite.listingId,
    createdAt: favorite.createdAt.toISOString(),
  };
}

export async function listIds(
  userId: string,
  tenantId: string,
): Promise<FavoriteIdsResponse> {
  const listingIds = await favoriteRepo.findIdsByUser(userId, tenantId);
  return { listingIds };
}

export async function list(
  userId: string,
  tenantId: string,
  page?: number,
  limit?: number,
): Promise<ListFavoritesResponse> {
  const safePage = normalizePage(page);
  const safeLimit = clampLimit(limit ?? DEFAULT_LIMIT);
  const { items, total } = await favoriteRepo.findByUser(userId, tenantId, safePage, safeLimit);

  return {
    favorites: items.map(toFavoriteRecord),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    },
  };
}

export async function add(
  userId: string,
  tenantId: string,
  listingId: string,
): Promise<CreateFavoriteResponse> {
  const normalizedListingId = normalizeListingId(listingId);
  const existing = await favoriteRepo.findByUserAndListing(userId, tenantId, normalizedListingId);
  if (existing) {
    return {
      favorite: toFavoriteRecord(existing),
      created: false,
    };
  }

  try {
    const createdFavorite = await favoriteRepo.create({
      userId,
      tenantId,
      listingId: normalizedListingId,
    });

    return {
      favorite: toFavoriteRecord(createdFavorite),
      created: true,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existingOnConflict = await favoriteRepo.findByUserAndListing(
        userId,
        tenantId,
        normalizedListingId,
      );

      if (existingOnConflict) {
        return {
          favorite: toFavoriteRecord(existingOnConflict),
          created: false,
        };
      }
    }

    throw error;
  }
}

export async function remove(
  userId: string,
  tenantId: string,
  listingId: string,
): Promise<void> {
  const normalizedListingId = normalizeListingId(listingId);
  await favoriteRepo.deleteByListingId(userId, tenantId, normalizedListingId);
}
