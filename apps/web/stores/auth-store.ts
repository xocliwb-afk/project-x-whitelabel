'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/getApiBaseUrl';
import type { AuthUser } from '@project-x/shared-types';

const API_BASE_URL = getApiBaseUrl();

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; phone?: string }) => Promise<void>;
}

async function apiFetch(path: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        try {
          const user = await apiFetch('/api/auth/me', session.access_token);
          set({ user });
        } catch {
          // User exists in Supabase but not in local DB — treat as logged out
        }
      }
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // Listen for auth state changes (e.g. token refresh, sign out in another tab)
    const supabase = createClient();
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session.access_token) {
          try {
            const user = await apiFetch('/api/auth/me', session.access_token);
            set({ user });
          } catch {
            // ignore — user may not exist in local DB yet
          }
        }
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('No session returned');

      const user = await apiFetch('/api/auth/me', data.session.access_token);
      set({ user });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, displayName, phone) => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('No session returned');

      // Create local user via API
      const result = await apiFetch('/api/auth/register', data.session.access_token, {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName, phone }),
      });
      set({ user: result.user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const updated = await apiFetch('/api/auth/me', session.access_token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    set({ user: updated });
  },
}));
