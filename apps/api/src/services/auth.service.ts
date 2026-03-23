import { supabaseAdmin } from '../lib/supabase-admin';
import * as userRepo from '../repositories/user.repository';
import type { User } from '@project-x/database';
import type {
  AuthUser,
  AuthResponse,
  AuthTokens,
  UserRole,
} from '@project-x/shared-types';

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
 * Register a new user.
 * 1. Creates Supabase auth user
 * 2. Creates local User row
 * 3. Returns AuthResponse with tokens
 */
export async function register(
  email: string,
  password: string,
  tenantId: string,
  displayName?: string,
  phone?: string,
): Promise<AuthResponse> {
  // Create user in Supabase Auth
  const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    const message = signUpError.message;
    if (message.includes('already registered') || message.includes('already exists')) {
      const err = new Error('User already exists') as Error & { status: number };
      err.status = 409;
      throw err;
    }
    throw new Error(`Supabase signup failed: ${message}`);
  }

  if (!signUpData.user || !signUpData.session) {
    throw new Error('Supabase signup returned no user or session');
  }

  // Create local User row
  const dbUser = await userRepo.create({
    supabaseId: signUpData.user.id,
    tenantId,
    email,
    displayName: displayName ?? null,
    phone: phone ?? null,
  });

  return {
    accessToken: signUpData.session.access_token,
    refreshToken: signUpData.session.refresh_token,
    expiresAt: signUpData.session.expires_at ?? null,
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
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    const err = new Error('Invalid credentials') as Error & { status: number };
    err.status = 401;
    throw err;
  }

  if (!signInData.user || !signInData.session) {
    throw new Error('Supabase login returned no user or session');
  }

  // Find or lazily create local User
  let dbUser = await userRepo.findBySupabaseId(signInData.user.id);
  if (!dbUser) {
    dbUser = await userRepo.create({
      supabaseId: signInData.user.id,
      tenantId,
      email: signInData.user.email ?? email,
    });
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
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    const err = new Error('Invalid or expired refresh token') as Error & { status: number };
    err.status = 401;
    throw err;
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
  };
}

/**
 * Log out a user. Supabase handles session invalidation;
 * we just confirm success.
 */
export async function logout(jwt: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.signOut(jwt);
  if (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
}
