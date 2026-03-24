import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@project-x/database';
import { resolveRequiredTenant } from '../middleware/tenant';
import type { BrandConfig } from '@project-x/shared-types';

const router = Router();

/** In-memory brand cache — mirrors tenant cache pattern */
const brandCache = new Map<string, { data: BrandConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BRAND_CACHE_ENTRIES = 250;

export function clearBrandCache() {
  brandCache.clear();
}

async function getBrandForTenant(tenantId: string): Promise<{ config: BrandConfig; found: true } | { found: false; reason: 'BRAND_NOT_FOUND' | 'BRAND_INACTIVE' }> {
  // Check cache
  const cached = brandCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return { config: cached.data, found: true };
  }

  const brand = await prisma.brand.findUnique({
    where: { tenantId },
  });

  if (!brand) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  if (!brand.active) {
    return { found: false, reason: 'BRAND_INACTIVE' };
  }

  // Deep-clone to avoid mutating the Prisma result, then merge overrides
  const config = JSON.parse(JSON.stringify(brand.config)) as BrandConfig | null;
  if (!config || typeof config !== 'object' || !config.theme || !config.brandName) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  if (brand.logoUrl && config.logo && typeof config.logo === 'object') {
    config.logo.url = brand.logoUrl;
  }
  if (brand.faviconUrl) {
    config.favicon = brand.faviconUrl;
  }

  // Evict expired entries if cache is full
  if (!brandCache.has(tenantId) && brandCache.size >= MAX_BRAND_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of brandCache) {
      if (entry.expiresAt <= now) {
        brandCache.delete(key);
      }
      if (brandCache.size < MAX_BRAND_CACHE_ENTRIES) {
        break;
      }
    }
    if (brandCache.size >= MAX_BRAND_CACHE_ENTRIES) {
      const oldestKey = brandCache.keys().next().value;
      if (oldestKey) {
        brandCache.delete(oldestKey);
      }
    }
  }

  brandCache.set(tenantId, { data: config, expiresAt: Date.now() + CACHE_TTL_MS });
  return { config, found: true };
}

/**
 * GET /api/brand
 * Returns the tenant-specific brand config from the database.
 * Requires explicit tenant resolution via x-tenant-id.
 */
router.get('/', resolveRequiredTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: true, message: 'No tenant context', code: 'NO_TENANT_AVAILABLE', status: 400 });
    }

    const result = await getBrandForTenant(tenantId);

    if (!result.found) {
      const message = result.reason === 'BRAND_NOT_FOUND'
        ? 'No brand configuration found for this tenant'
        : 'Brand configuration is inactive';
      return res.status(404).json({ error: true, message, code: result.reason, status: 404 });
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('Vary', 'x-tenant-id');
    return res.json(result.config);
  } catch (error) {
    return next(error);
  }
});

export default router;
