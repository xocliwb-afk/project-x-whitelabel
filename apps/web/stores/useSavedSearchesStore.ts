'use client';

import { create } from 'zustand';
import type {
  CreateSavedSearchRequest,
  CreateSavedSearchResponse,
  SavedSearchRecord,
  UpdateSavedSearchRequest,
} from '@project-x/shared-types';
import {
  createSavedSearch,
  deleteSavedSearch,
  getSavedSearches,
  updateSavedSearch,
  type AuthenticatedRequestOptions,
} from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

type SavedSearchesState = {
  items: SavedSearchRecord[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  hydrate: (page?: number, limit?: number) => Promise<void>;
  create: (input: CreateSavedSearchRequest) => Promise<CreateSavedSearchResponse>;
  update: (id: string, patch: UpdateSavedSearchRequest) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

async function getAuthenticatedRequestOptions(): Promise<AuthenticatedRequestOptions> {
  const authUser = useAuthStore.getState().user;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!authUser?.tenantId || !session?.access_token) {
    throw new Error('Authentication required');
  }

  return {
    accessToken: session.access_token,
    tenantId: authUser.tenantId,
  };
}

function currentUserKey(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `${user.id}:${user.tenantId}` : null;
}

function sortByUpdatedAtDesc(items: SavedSearchRecord[]): SavedSearchRecord[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

function upsertSavedSearch(
  items: SavedSearchRecord[],
  savedSearch: SavedSearchRecord,
): SavedSearchRecord[] {
  const withoutMatch = items.filter((item) => item.id !== savedSearch.id);
  return sortByUpdatedAtDesc([savedSearch, ...withoutMatch]);
}

export const useSavedSearchesStore = create<SavedSearchesState>((set, get) => ({
  items: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  hydrate: async (page = 1, limit = 20) => {
    if (!useAuthStore.getState().user) {
      get().reset();
      return;
    }

    const userKey = currentUserKey();
    set({ isLoading: true, error: null });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      const result = await getSavedSearches(auth, page, limit);
      if (currentUserKey() !== userKey) {
        return;
      }

      set({
        items: result.savedSearches,
        isLoaded: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to load saved searches.';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  create: async (input) => {
    const userKey = currentUserKey();
    set({ isLoading: true, error: null });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        throw new Error('User context changed');
      }

      const result = await createSavedSearch(input, auth);
      if (currentUserKey() !== userKey) {
        return result;
      }

      set((state) => ({
        items: upsertSavedSearch(state.items, result.savedSearch),
        isLoaded: true,
        isLoading: false,
        error: null,
      }));
      return result;
    } catch (error) {
      if (currentUserKey() !== userKey) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to save search.';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  update: async (id, patch) => {
    const userKey = currentUserKey();
    set({ isLoading: true, error: null });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      const result = await updateSavedSearch(id, patch, auth);
      if (currentUserKey() !== userKey) {
        return;
      }

      set((state) => ({
        items: upsertSavedSearch(state.items, result.savedSearch),
        isLoading: false,
        isLoaded: true,
        error: null,
      }));
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to update saved search.';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  remove: async (id) => {
    const userKey = currentUserKey();
    set({ isLoading: true, error: null });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      await deleteSavedSearch(id, auth);
      if (currentUserKey() !== userKey) {
        return;
      }

      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to delete saved search.';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  reset: () =>
    set({
      items: [],
      isLoading: false,
      isLoaded: false,
      error: null,
    }),
}));

let savedSearchesAuthSubscriptionInstalled = false;

if (!savedSearchesAuthSubscriptionInstalled) {
  savedSearchesAuthSubscriptionInstalled = true;
  useAuthStore.subscribe((state, previousState) => {
    const currentUserKey = state.user ? `${state.user.id}:${state.user.tenantId}` : null;
    const previousUserKey = previousState.user
      ? `${previousState.user.id}:${previousState.user.tenantId}`
      : null;

    if (currentUserKey !== previousUserKey) {
      useSavedSearchesStore.getState().reset();
    }
  });
}
