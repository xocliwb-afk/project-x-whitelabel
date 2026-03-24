import { Router } from 'express';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
} from '@project-x/shared-types';
import * as authService from '../services/auth.service';
import { requireAuth, requireVerifiedToken } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/async-handler';
import { createHttpError } from '../utils/http-error';

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalStringField(
  body: Record<string, unknown>,
  field: 'displayName' | 'phone',
): string | undefined {
  const value = body[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw createHttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRegisterBody(body: unknown): RegisterRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid registration body');
  }

  const allowedKeys = new Set(['displayName', 'phone']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw createHttpError(400, `Unsupported field: ${key}`);
    }
  }

  return {
    displayName: readOptionalStringField(body, 'displayName'),
    phone: readOptionalStringField(body, 'phone'),
  };
}

function parseLoginBody(body: unknown): LoginRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid login body');
  }

  const { email, password } = body;
  if (typeof email !== 'string' || email.trim().length === 0) {
    throw createHttpError(400, 'Email is required');
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw createHttpError(400, 'Password is required');
  }

  return {
    email: email.trim(),
    password,
  };
}

function parseProfileBody(body: unknown): UpdateProfileRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid profile body');
  }

  const allowedKeys = new Set(['displayName', 'phone']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw createHttpError(400, `Unsupported field: ${key}`);
    }
  }

  return {
    displayName: readOptionalStringField(body, 'displayName'),
    phone: readOptionalStringField(body, 'phone'),
  };
}

function parseRefreshBody(body: unknown): RefreshTokenRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid refresh body');
  }

  const { refreshToken } = body;
  if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    throw createHttpError(400, 'Refresh token is required');
  }

  return { refreshToken };
}

/**
 * POST /api/auth/register
 * Provision the local DB user from verified JWT claims.
 */
router.post(
  '/register',
  resolveTenant,
  requireVerifiedToken,
  asyncHandler(async (req, res) => {
    const { displayName, phone } = parseRegisterBody(req.body);
    const result: RegisterResponse = await authService.createOrProvisionLocalUser(
      req.auth!.supabaseId,
      req.auth!.email,
      req.tenantId!,
      displayName,
      phone,
    );

    return res.status(200).json(result);
  }),
);

/**
 * POST /api/auth/login
 * Authenticate an existing user.
 */
router.post(
  '/login',
  resolveTenant,
  asyncHandler(async (req, res) => {
    const { email, password } = parseLoginBody(req.body);
    const result = await authService.login(email, password, req.tenantId!);
    return res.status(200).json(result);
  }),
);

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile.
 */
router.get(
  '/me',
  resolveTenant,
  requireAuth,
  asyncHandler(async (req, res) => res.status(200).json(req.user)),
);

/**
 * PATCH /api/auth/me
 * Update the current user's profile.
 */
router.patch(
  '/me',
  resolveTenant,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { displayName, phone } = parseProfileBody(req.body);
    const updated = await authService.updateProfile(req.user!.id, {
      displayName,
      phone,
    });

    return res.status(200).json(updated);
  }),
);

/**
 * POST /api/auth/refresh
 * Refresh an access token using a refresh token.
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = parseRefreshBody(req.body);
    const tokens = await authService.refresh(refreshToken);
    return res.status(200).json(tokens);
  }),
);

/**
 * POST /api/auth/logout
 * Log out the current user.
 */
router.post(
  '/logout',
  resolveTenant,
  requireAuth,
  asyncHandler(async (_req, res) => res.status(200).json({ success: true })),
);

export default router;
