import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '../lib/jwt';
import { prisma } from '@project-x/database';
import type { AuthUser, UserRole } from '@project-x/shared-types';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
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

    req.auth = {
      supabaseId: claims.sub,
      email: claims.email,
      accessTokenClaims: claims as unknown as Record<string, unknown>,
    };

    // Look up local user by Supabase ID
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: claims.sub },
    });

    if (dbUser) {
      // Skip attaching user if tenant doesn't match (cross-tenant request)
      if (req.tenantId && dbUser.tenantId !== req.tenantId) {
        return next();
      }
      req.user = {
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
  } catch {
    // Invalid token — silently skip, this is optional auth
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

    req.auth = {
      supabaseId: claims.sub,
      email: claims.email,
      accessTokenClaims: claims as unknown as Record<string, unknown>,
    };

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: claims.sub },
    });

    if (!dbUser) {
      return res.status(401).json({ error: true, message: 'User not found' });
    }

    if (req.tenantId && dbUser.tenantId !== req.tenantId) {
      return res.status(403).json({ error: true, message: 'Tenant mismatch' });
    }

    req.user = {
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
  } catch {
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }

  next();
}
