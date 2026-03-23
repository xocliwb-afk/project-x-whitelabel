import { Request, Response, NextFunction } from 'express';
import { prisma } from '@project-x/database';

/** Simple TTL cache for tenant validation */
const tenantCache = new Map<string, { valid: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let defaultTenantId: string | null = null;
let defaultTenantExpiresAt = 0;

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
  const headerTenantId = req.headers['x-tenant-id'];
  const tenantId = typeof headerTenantId === 'string' ? headerTenantId.trim() : null;

  if (tenantId) {
    const valid = await isValidTenant(tenantId);
    if (!valid) {
      return res.status(400).json({ error: true, message: 'Invalid or inactive tenant' });
    }
    req.tenantId = tenantId;
    return next();
  }

  // No header — resolve default
  const fallback = await resolveDefaultTenantId();
  if (!fallback) {
    return res.status(400).json({ error: true, message: 'No tenant available' });
  }

  req.tenantId = fallback;
  next();
}
