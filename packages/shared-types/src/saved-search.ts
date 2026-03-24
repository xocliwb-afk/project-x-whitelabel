import type { ListingSearchParams } from './index';

export type SavedSearchFilters = Omit<
  ListingSearchParams,
  'page' | 'limit' | 'clientLimit'
>;

export interface OffsetPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface SavedSearchRecord {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  notifyNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchRequest {
  name: string;
  filters: SavedSearchFilters;
  notifyNew?: boolean;
}

export interface UpdateSavedSearchRequest {
  name?: string;
  filters?: SavedSearchFilters;
  notifyNew?: boolean;
}

export interface CreateSavedSearchResponse {
  savedSearch: SavedSearchRecord;
  created: boolean;
}

export interface ListSavedSearchesResponse {
  savedSearches: SavedSearchRecord[];
  pagination: OffsetPagination;
}
