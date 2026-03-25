'use client';

import { create } from 'zustand';
import type { AdminBrandResponse } from '@project-x/shared-types';

import {
  AdminBrandApiError,
  getAdminBrand,
  type AdminBrandRequestOptions,
} from '@/lib/admin-brand-api';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

type AdminBrandStoreState = {
  original: AdminBrandResponse | null;
  draft: AdminBrandResponse | null;
  isLoading: boolean;
  isLoaded: boolean;
  isDirty: boolean;
  error: string | null;
  errorCode: string | null;
  validationErrors: string[];
  hydrate: (brand: AdminBrandResponse) => void;
  replaceDraft: (brand: AdminBrandResponse) => void;
  loadCurrentBrand: () => Promise<void>;
  reset: () => void;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function brandsMatch(
  left: AdminBrandResponse | null,
  right: AdminBrandResponse | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

async function getAuthenticatedRequestOptions(): Promise<AdminBrandRequestOptions> {
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

const initialState = {
  original: null,
  draft: null,
  isLoading: false,
  isLoaded: false,
  isDirty: false,
  error: null,
  errorCode: null,
  validationErrors: [],
};

export const useAdminBrandStore = create<AdminBrandStoreState>((set, get) => ({
  ...initialState,

  hydrate: (brand) => {
    const original = cloneJson(brand);
    const draft = cloneJson(brand);

    set({
      original,
      draft,
      isLoaded: true,
      isLoading: false,
      isDirty: false,
      error: null,
      errorCode: null,
      validationErrors: [],
    });
  },

  replaceDraft: (brand) =>
    set((state) => {
      const draft = cloneJson(brand);
      return {
        draft,
        isDirty: !brandsMatch(state.original, draft),
      };
    }),

  loadCurrentBrand: async () => {
    if (!useAuthStore.getState().user) {
      get().reset();
      return;
    }

    const userKey = currentUserKey();
    set({
      isLoading: true,
      error: null,
      errorCode: null,
      validationErrors: [],
    });

    try {
      const auth = await getAuthenticatedRequestOptions();
      if (currentUserKey() !== userKey) {
        return;
      }

      const brand = await getAdminBrand(auth);
      if (currentUserKey() !== userKey) {
        return;
      }

      get().hydrate(brand);
    } catch (error) {
      if (currentUserKey() !== userKey) {
        return;
      }

      set({
        isLoading: false,
        isLoaded: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load admin brand settings.',
        errorCode: error instanceof AdminBrandApiError ? error.code ?? null : null,
        validationErrors:
          error instanceof AdminBrandApiError ? error.validationErrors ?? [] : [],
      });
      throw error;
    }
  },

  reset: () =>
    set({
      ...initialState,
    }),
}));

let adminBrandAuthSubscriptionInstalled = false;

if (!adminBrandAuthSubscriptionInstalled) {
  adminBrandAuthSubscriptionInstalled = true;
  useAuthStore.subscribe((state, previousState) => {
    const currentKey = state.user ? `${state.user.id}:${state.user.tenantId}` : null;
    const previousKey = previousState.user
      ? `${previousState.user.id}:${previousState.user.tenantId}`
      : null;

    if (currentKey !== previousKey) {
      useAdminBrandStore.getState().reset();
    }
  });
}
