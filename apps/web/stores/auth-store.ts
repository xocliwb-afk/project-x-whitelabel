'use client';

import type { Session, Subscription } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/getApiBaseUrl';
import type { AuthUser } from '@project-x/shared-types';

const API_BASE_URL = getApiBaseUrl();
const WEB_TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID?.trim() || undefined;
const USER_NOT_PROVISIONED_CODE = 'USER_NOT_PROVISIONED';

class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  pendingVerification: boolean;
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

type PendingProfile = {
  displayName?: string;
  phone?: string;
};

let initializePromise: Promise<void> | null = null;
let sessionSyncPromise: Promise<AuthUser | null> | null = null;
let authSubscription: Subscription | null = null;
let pendingProfile: PendingProfile | null = null;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tenantFromToken(accessToken: string): string | undefined {
  const claims = decodeJwtPayload(accessToken);
  if (!claims) {
    return undefined;
  }

  const tenantId =
    typeof claims.tenant_id === 'string'
      ? claims.tenant_id
      : typeof claims.tenantId === 'string'
        ? claims.tenantId
        : undefined;

  return tenantId?.trim() || undefined;
}

function resolveTenantId(accessToken: string, fallbackTenantId?: string | null): string {
  const tenantId =
    fallbackTenantId?.trim() ||
    WEB_TENANT_ID ||
    tenantFromToken(accessToken);

  if (!tenantId) {
    throw new Error(
      'Missing tenant configuration for authenticated request. Set NEXT_PUBLIC_TENANT_ID or sign in to a provisioned tenant first.',
    );
  }

  return tenantId;
}

function readPendingProfileFromMetadata(session: Session): PendingProfile {
  const metadata = session.user.user_metadata;
  const displayName =
    typeof metadata?.displayName === 'string'
      ? metadata.displayName.trim()
      : typeof metadata?.display_name === 'string'
        ? metadata.display_name.trim()
        : undefined;
  const phone =
    typeof metadata?.phone === 'string' ? metadata.phone.trim() : undefined;

  return {
    displayName: displayName || undefined,
    phone: phone || undefined,
  };
}

async function apiFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit & { tenantId?: string | null },
): Promise<T> {
  const tenantId = options?.tenantId ?? undefined;
  if (!tenantId) {
    throw new Error(
      'Missing tenant configuration for authenticated request. Set NEXT_PUBLIC_TENANT_ID or sign in to a provisioned tenant first.',
    );
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(
      body.message || `Request failed: ${res.status}`,
      res.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }

  return (await res.json()) as T;
}

async function syncSession(
  session: Session,
  fallbackProfile?: PendingProfile,
): Promise<AuthUser | null> {
  if (sessionSyncPromise) {
    return sessionSyncPromise;
  }

  const tenantId = resolveTenantId(
    session.access_token,
    useAuthStore.getState().user?.tenantId,
  );

  sessionSyncPromise = (async () => {
    try {
      const user = await apiFetch<AuthUser>('/api/auth/me', session.access_token, {
        tenantId,
      });
      pendingProfile = null;
      useAuthStore.setState({
        user,
        pendingVerification: false,
      });
      return user;
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.status === 401 &&
        error.code === USER_NOT_PROVISIONED_CODE
      ) {
        const profile = fallbackProfile ?? pendingProfile ?? readPendingProfileFromMetadata(session);
        const result = await apiFetch<{ user: AuthUser }>(
          '/api/auth/register',
          session.access_token,
          {
            method: 'POST',
            tenantId,
            body: JSON.stringify({
              ...(profile.displayName ? { displayName: profile.displayName } : {}),
              ...(profile.phone ? { phone: profile.phone } : {}),
            }),
          },
        );

        pendingProfile = null;
        useAuthStore.setState({
          user: result.user,
          pendingVerification: false,
        });
        return result.user;
      }

      if (error instanceof ApiRequestError && error.status === 401) {
        useAuthStore.setState({
          user: null,
          pendingVerification: false,
        });
        return null;
      }

      throw error;
    } finally {
      sessionSyncPromise = null;
    }
  })();

  return sessionSyncPromise;
}

function ensureAuthListener() {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  const supabase = createClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.access_token) {
      pendingProfile = null;
      useAuthStore.setState({
        user: null,
        pendingVerification: false,
        isLoading: false,
        isInitialized: true,
      });
      return;
    }

    void syncSession(session).catch((error) => {
      console.error('[auth] failed to sync session', error);
    });
  });

  authSubscription = data.subscription;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  pendingVerification: false,

  initialize: async () => {
    if (initializePromise) {
      return initializePromise;
    }
    if (get().isInitialized) {
      return;
    }

    initializePromise = (async () => {
      set({ isLoading: true });

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        ensureAuthListener();

        if (session?.access_token) {
          try {
            await syncSession(session);
          } catch (error) {
            console.error('[auth] failed to initialize session', error);
            set({
              user: null,
              pendingVerification: false,
            });
          }
        } else {
          set({
            user: null,
            pendingVerification: false,
          });
        }
      } finally {
        set({ isLoading: false, isInitialized: true });
        initializePromise = null;
      }
    })();

    return initializePromise;
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
      if (!data.session?.access_token) throw new Error('No session returned');

      await syncSession(data.session);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  register: async (email, password, displayName, phone) => {
    set({ isLoading: true });

    const profile: PendingProfile = {
      displayName: displayName?.trim() || undefined,
      phone: phone?.trim() || undefined,
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...(profile.displayName ? { displayName: profile.displayName } : {}),
            ...(profile.phone ? { phone: profile.phone } : {}),
          },
        },
      });

      if (error) throw new Error(error.message);

      pendingProfile = profile;

      if (data.session?.access_token) {
        await syncSession(data.session, profile);
        set({ pendingVerification: false });
        return;
      }

      if (data.user) {
        set({
          user: null,
          pendingVerification: true,
        });
        return;
      }

      throw new Error('Registration did not return a user');
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      pendingProfile = null;
      const supabase = createClient();
      await supabase.auth.signOut();
      set({ user: null, pendingVerification: false });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  updateProfile: async (data) => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = get().user;
    if (!session?.access_token || !currentUser) throw new Error('Not authenticated');

    const updated = await apiFetch<AuthUser>('/api/auth/me', session.access_token, {
      method: 'PATCH',
      tenantId: currentUser.tenantId,
      body: JSON.stringify(data),
    });

    set({ user: updated });
  },
}));
