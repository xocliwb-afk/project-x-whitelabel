import { getSupabaseAdmin } from '../lib/supabase-admin';
import * as userRepo from '../repositories/user.repository';
import type { User } from '@project-x/database';
import type {
  AuthUser,
  AuthResponse,
  AuthTokens,
  RegisterResponse,
  UserRole,
} from '@project-x/shared-types';
import { createHttpError } from '../utils/http-error';

/**
 * Convert a Prisma User row to the shared AuthUser DTO.
 */
function toAuthUser(dbUser: User): AuthUser {
  return {
    id: dbUser.id,
    supabaseId: dbUser.supabaseId,
    tenantId: dbUser.tenantId,
    email: dbUser.email,
    displayName: dbUser.displayName,
    phone: dbUser.phone,
    role: dbUser.role as UserRole,
    createdAt: dbUser.createdAt.toISOString(),
    updatedAt: dbUser.updatedAt.toISOString(),
  };
}

/**
 * Provision or return the local user row that corresponds to a verified
 * Supabase identity.
 */
export async function createOrProvisionLocalUser(
  supabaseId: string,
  email: string,
  tenantId: string,
  displayName?: string,
  phone?: string,
): Promise<RegisterResponse> {
  const dbUser = await userRepo.upsertBySupabaseId({
    supabaseId,
    tenantId,
    email,
    displayName: displayName ?? null,
    phone: phone ?? null,
  });

  if (dbUser.tenantId !== tenantId) {
    throw createHttpError(403, 'User belongs to a different tenant', 'TENANT_MISMATCH');
  }

  return {
    user: toAuthUser(dbUser),
  };
}

/**
 * Log in an existing user.
 * 1. Authenticates with Supabase
 * 2. Finds or lazily creates local User row
 * 3. Returns AuthResponse with tokens
 */
export async function login(
  email: string,
  password: string,
  tenantId: string,
): Promise<AuthResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw createHttpError(401, 'Invalid credentials');
  }

  if (!signInData.user || !signInData.session) {
    throw new Error('Supabase login returned no user or session');
  }

  const dbUser = await userRepo.upsertBySupabaseId({
    supabaseId: signInData.user.id,
    tenantId,
    email: signInData.user.email ?? email,
  });

  if (dbUser.tenantId !== tenantId) {
    throw createHttpError(403, 'User belongs to a different tenant', 'TENANT_MISMATCH');
  }

  return {
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    expiresAt: signInData.session.expires_at ?? null,
    user: toAuthUser(dbUser),
  };
}

/**
 * Get the current user's profile by Supabase ID.
 */
export async function getMe(supabaseId: string): Promise<AuthUser | null> {
  const dbUser = await userRepo.findBySupabaseId(supabaseId);
  return dbUser ? toAuthUser(dbUser) : null;
}

/**
 * Update a user's profile (displayName, phone).
 */
export async function updateProfile(
  userId: string,
  data: { displayName?: string; phone?: string },
): Promise<AuthUser> {
  const dbUser = await userRepo.update(userId, {
    displayName: data.displayName ?? undefined,
    phone: data.phone ?? undefined,
  });
  return toAuthUser(dbUser);
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw createHttpError(401, 'Invalid or expired refresh token');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
  };
}
