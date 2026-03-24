import type { OffsetPagination } from './saved-search';

export interface FavoriteRecord {
  id: string;
  listingId: string;
  createdAt: string;
}

export interface CreateFavoriteRequest {
  listingId: string;
}

export interface CreateFavoriteResponse {
  favorite: FavoriteRecord;
  created: boolean;
}

export interface FavoriteIdsResponse {
  listingIds: string[];
  capped: boolean;
}

export interface ListFavoritesResponse {
  favorites: FavoriteRecord[];
  pagination: OffsetPagination;
}
