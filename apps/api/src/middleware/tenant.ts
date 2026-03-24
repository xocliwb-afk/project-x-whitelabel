import { Request, Response, NextFunction } from 'express';
import { prisma } from '@project-x/database';

/** Simple TTL cache for tenant validation */
const tenantCache = new Map<string, { valid: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TENANT_CACHE_ENTRIES = 250;

let defaultTenantId: string | null = null;
let defaultTenantExpiresAt = 0;

function getHeaderTenantId(req: Request): string | null {
  const headerTenantId = req.headers['x-tenant-id'];
  return typeof headerTenantId === 'string' ? headerTenantId.trim() : null;
}

async function isValidTenant(tenantId: string): Promise<boolean> {
  const cached = tenantCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.valid;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { active: true },
  });

  const valid = tenant?.active ?? false;
  if (!tenantCache.has(tenantId) && tenantCache.size >= MAX_TENANT_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [cachedTenantId, entry] of tenantCache) {
      if (entry.expiresAt <= now) {
        tenantCache.delete(cachedTenantId);
      }
      if (tenantCache.size < MAX_TENANT_CACHE_ENTRIES) {
        break;
      }
    }

    if (tenantCache.size >= MAX_TENANT_CACHE_ENTRIES) {
      const oldestKey = tenantCache.keys().next().value;
      if (oldestKey) {
        tenantCache.delete(oldestKey);
      }
    }
  }

  tenantCache.set(tenantId, { valid, expiresAt: Date.now() + CACHE_TTL_MS });
  return valid;
}

async function resolveDefaultTenantId(): Promise<string | null> {
  // Check env override first
  if (process.env.DEFAULT_TENANT_ID) {
    return process.env.DEFAULT_TENANT_ID;
  }

  // Use cached default if still fresh
  if (defaultTenantId && defaultTenantExpiresAt > Date.now()) {
    return defaultTenantId;
  }

  // Fall back to first active tenant in DB
  const tenant = await prisma.tenant.findFirst({
    where: { active: true },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  defaultTenantId = tenant?.id ?? null;
  defaultTenantExpiresAt = Date.now() + CACHE_TTL_MS;
  return defaultTenantId;
}

/**
 * Tenant resolution middleware.
 * Reads x-tenant-id header, validates it, or falls back to default tenant.
 * Attaches req.tenantId for downstream use.
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getHeaderTenantId(req);

    if (tenantId) {
      const valid = await isValidTenant(tenantId);
      if (!valid) {
        return res.status(400).json({ error: true, message: 'Invalid or inactive tenant', code: 'INVALID_TENANT' });
      }
      req.tenantId = tenantId;
      return next();
    }

    // No header — resolve default
    const fallback = await resolveDefaultTenantId();
    if (!fallback) {
      return res.status(400).json({ error: true, message: 'No tenant available', code: 'NO_TENANT_AVAILABLE' });
    }

    req.tenantId = fallback;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Strict tenant resolution middleware.
 * Reads x-tenant-id header and validates it without any fallback.
 * Used for routes where missing tenant context must fail closed.
 */
export async function resolveRequiredTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getHeaderTenantId(req);

    if (!tenantId) {
      return res.status(400).json({
        error: true,
        message: 'x-tenant-id header is required',
        code: 'TENANT_REQUIRED',
      });
    }

    const valid = await isValidTenant(tenantId);
    if (!valid) {
      return res
        .status(400)
        .json({ error: true, message: 'Invalid or inactive tenant', code: 'INVALID_TENANT' });
    }

    req.tenantId = tenantId;
    return next();
  } catch (error) {
    return next(error);
  }
}
