import { Request, Response, NextFunction } from 'express';
import {
  AuthTokenError,
  isAuthTokenError,
  verifySupabaseToken,
} from '../lib/jwt';
import { prisma } from '@project-x/database';
import type { AuthUser, UserRole } from '@project-x/shared-types';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function setRequestAuth(req: Request, claims: Awaited<ReturnType<typeof verifySupabaseToken>>) {
  req.auth = {
    supabaseId: claims.sub,
    email: claims.email,
    tenantId: claims.tenantId ?? null,
    accessTokenClaims: claims as unknown as Record<string, unknown>,
  };
}

function toAuthUser(user: {
  id: string;
  supabaseId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): AuthUser {
  return {
    id: user.id,
    supabaseId: user.supabaseId,
    tenantId: user.tenantId,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function respondAuthFailure(res: Response, error: unknown) {
  const message =
    error instanceof AuthTokenError ? error.message : 'Invalid or expired token';
  return res.status(401).json({ error: true, message });
}

function respondAccessFailure(
  res: Response,
  status: number,
  message: string,
  code: string,
) {
  return res.status(status).json({ error: true, message, code });
}

function hasTokenTenantMismatch(req: Request): boolean {
  return Boolean(
    req.tenantId &&
    req.auth?.tenantId &&
    req.auth.tenantId !== req.tenantId,
  );
}

function logAuthDrop(reason: string, details?: Record<string, unknown>) {
  if (details) {
    console.warn(`[auth] ${reason}`, details);
    return;
  }
  console.warn(`[auth] ${reason}`);
}

export async function requireVerifiedToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }

  try {
    const claims = await verifySupabaseToken(token);
    setRequestAuth(req, claims);
    if (hasTokenTenantMismatch(req)) {
      logAuthDrop('verified token rejected: tenant claim mismatch', {
        requestTenantId: req.tenantId,
        tokenTenantId: req.auth?.tenantId,
      });
      return respondAccessFailure(res, 403, 'Tenant mismatch', 'TENANT_MISMATCH');
    }
    return next();
  } catch (error) {
    if (isAuthTokenError(error)) {
      return respondAuthFailure(res, error);
    }
    return next(error);
  }
}

/**
 * Optional auth middleware — attaches user/auth info if a valid token is present,
 * but never returns 401. Use this for routes that work with or without auth.
 */
export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const claims = await verifySupabaseToken(token);
    setRequestAuth(req, claims);
    if (hasTokenTenantMismatch(req)) {
      logAuthDrop('optional auth skipped: tenant claim mismatch', {
        requestTenantId: req.tenantId,
        tokenTenantId: req.auth?.tenantId,
      });
      req.auth = undefined;
      return next();
    }
  } catch (error) {
    if (isAuthTokenError(error)) {
      logAuthDrop('optional auth skipped: invalid token');
      return next();
    }
    return next(error);
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: req.auth!.supabaseId },
    });

    if (!dbUser) {
      logAuthDrop('optional auth skipped: local user not provisioned', {
        supabaseId: req.auth!.supabaseId,
      });
      return next();
    }

    if (req.tenantId && dbUser.tenantId !== req.tenantId) {
      logAuthDrop('optional auth skipped: tenant mismatch', {
        requestTenantId: req.tenantId,
        userTenantId: dbUser.tenantId,
      });
      return next();
    }

    req.user = toAuthUser(dbUser);
  } catch (error) {
    return next(error);
  }

  next();
}

/**
 * Required auth middleware — returns 401 if no valid token or no local user found.
 * Use this for routes that require an authenticated user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }

  try {
    const claims = await verifySupabaseToken(token);
    setRequestAuth(req, claims);
    if (hasTokenTenantMismatch(req)) {
      logAuthDrop('required auth rejected: tenant claim mismatch', {
        requestTenantId: req.tenantId,
        tokenTenantId: req.auth?.tenantId,
      });
      return respondAccessFailure(res, 403, 'Tenant mismatch', 'TENANT_MISMATCH');
    }
  } catch (error) {
    if (isAuthTokenError(error)) {
      return respondAuthFailure(res, error);
    }
    return next(error);
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: req.auth!.supabaseId },
    });

    if (!dbUser) {
      return respondAccessFailure(
        res,
        401,
        'User not provisioned',
        'USER_NOT_PROVISIONED',
      );
    }

    if (req.tenantId && dbUser.tenantId !== req.tenantId) {
      logAuthDrop('required auth rejected: tenant mismatch', {
        requestTenantId: req.tenantId,
        userTenantId: dbUser.tenantId,
      });
      return respondAccessFailure(res, 403, 'Tenant mismatch', 'TENANT_MISMATCH');
    }

    req.user = toAuthUser(dbUser);
  } catch (error) {
    return next(error);
  }

  next();
}
