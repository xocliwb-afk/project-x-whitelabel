'use client';

import { create } from 'zustand';
import { addFavorite, getFavoriteIds, removeFavorite, type AuthenticatedRequestOptions } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

type FavoritePendingState = 'adding' | 'removing';

type FavoritesState = {
  ids: Set<string>;
  isLoading: boolean;
  isLoaded: boolean;
  pendingById: Record<string, FavoritePendingState>;
  hydrate: () => Promise<void>;
  toggle: (listingId: string) => Promise<void>;
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

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  isLoading: false,
  isLoaded: false,
  pendingById: {},

  hydrate: async () => {
    if (!useAuthStore.getState().user) {
      get().reset();
      return;
    }

    const userKey = currentUserKey();
    set({ isLoading: true });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      const result = await getFavoriteIds(auth);
      if (currentUserKey() !== userKey) {
        return;
      }

      set({
        ids: new Set(result.listingIds),
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      set({ isLoading: false });
      throw error;
    }
  },

  toggle: async (listingId: string) => {
    const normalizedListingId = listingId.trim();
    if (!normalizedListingId) {
      throw new Error('Listing ID is required');
    }

    if (get().pendingById[normalizedListingId]) {
      return;
    }

    const userKey = currentUserKey();
    const wasFavorited = get().ids.has(normalizedListingId);

    set((state) => {
      const nextIds = new Set(state.ids);
      if (wasFavorited) {
        nextIds.delete(normalizedListingId);
      } else {
        nextIds.add(normalizedListingId);
      }

      return {
        ids: nextIds,
        isLoaded: true,
        pendingById: {
          ...state.pendingById,
          [normalizedListingId]: wasFavorited ? 'removing' : 'adding',
        },
      };
    });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      if (wasFavorited) {
        await removeFavorite(normalizedListingId, auth);
      } else {
        await addFavorite(normalizedListingId, auth);
      }
      if (currentUserKey() !== userKey) {
        return;
      }
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      set((state) => {
        const rollbackIds = new Set(state.ids);
        if (wasFavorited) {
          rollbackIds.add(normalizedListingId);
        } else {
          rollbackIds.delete(normalizedListingId);
        }

        const nextPending = { ...state.pendingById };
        delete nextPending[normalizedListingId];

        return {
          ids: rollbackIds,
          pendingById: nextPending,
        };
      });
      throw error;
    }

    if (currentUserKey() !== userKey) {
      return;
    }

    set((state) => {
      const nextPending = { ...state.pendingById };
      delete nextPending[normalizedListingId];

      return {
        pendingById: nextPending,
      };
    });
  },

  reset: () =>
    set({
      ids: new Set<string>(),
      isLoading: false,
      isLoaded: false,
      pendingById: {},
    }),
}));

let favoritesAuthSubscriptionInstalled = false;

if (!favoritesAuthSubscriptionInstalled) {
  favoritesAuthSubscriptionInstalled = true;
  useAuthStore.subscribe((state, previousState) => {
    const currentUserKey = state.user ? `${state.user.id}:${state.user.tenantId}` : null;
    const previousUserKey = previousState.user
      ? `${previousState.user.id}:${previousState.user.tenantId}`
      : null;

    if (currentUserKey !== previousUserKey) {
      useFavoritesStore.getState().reset();
    }
  });
}
