import { Router } from 'express';
import { resolveRequiredTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/async-handler';
import {
  clearBrandCache as clearBrandServiceCache,
  getPublicBrandForTenant,
} from '../services/brand.service';

const router = Router();

export function clearBrandCache() {
  clearBrandServiceCache();
}

/**
 * GET /api/brand
 * Returns the tenant-specific brand config from the database.
 * Requires explicit tenant resolution via x-tenant-id.
 */
router.get(
  '/',
  resolveRequiredTenant,
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        error: true,
        message: 'No tenant context',
        code: 'NO_TENANT_AVAILABLE',
        status: 400,
      });
    }

    const result = await getPublicBrandForTenant(tenantId);
    if (!result.found) {
      const message = result.reason === 'BRAND_NOT_FOUND'
        ? 'No brand configuration found for this tenant'
        : 'Brand configuration is inactive';
      return res.status(404).json({ error: true, message, code: result.reason, status: 404 });
    }

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.set('Vary', 'x-tenant-id');
    return res.json(result.config);
  }),
);

export default router;
