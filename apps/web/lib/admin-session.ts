import { cache } from 'react';

import type { AuthUser } from '@project-x/shared-types';

import { createClient } from '@/lib/supabase/server';

type ServerAdminState =
  | { status: 'unauthenticated' }
  | { status: 'forbidden'; user: AuthUser }
  | {
      status: 'authorized';
      user: AuthUser;
      accessToken: string;
      tenantId: string;
    };

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveTenantId(accessToken: string): string {
  const envTenantId = process.env.NEXT_PUBLIC_TENANT_ID?.trim();
  if (envTenantId) {
    return envTenantId;
  }

  const claims = decodeJwtPayload(accessToken);
  const tenantId =
    typeof claims?.tenant_id === 'string'
      ? claims.tenant_id
      : typeof claims?.tenantId === 'string'
        ? claims.tenantId
        : undefined;

  if (!tenantId?.trim()) {
    throw new Error(
      'Missing tenant configuration for admin routes. Set NEXT_PUBLIC_TENANT_ID or authenticate to a tenant-scoped session.',
    );
  }

  return tenantId.trim();
}

function resolveServerApiBaseUrl(): string {
  const explicit =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  return 'http://127.0.0.1:3002';
}

export const getServerAdminState = cache(async (): Promise<ServerAdminState> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { status: 'unauthenticated' };
  }

  const tenantId = resolveTenantId(session.access_token);
  const response = await fetch(`${resolveServerApiBaseUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'x-tenant-id': tenantId,
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    return { status: 'unauthenticated' };
  }

  if (!response.ok) {
    throw new Error(`Failed to resolve server admin session: ${response.status}`);
  }

  const user = (await response.json()) as AuthUser;
  if (user.role !== 'ADMIN') {
    return { status: 'forbidden', user };
  }

  return {
    status: 'authorized',
    user,
    accessToken: session.access_token,
    tenantId,
  };
});
