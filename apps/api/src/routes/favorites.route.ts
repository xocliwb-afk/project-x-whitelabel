import { Router } from 'express';
import type { CreateFavoriteRequest } from '@project-x/shared-types';
import { requireAuth } from '../middleware/auth';
import { resolveRequiredTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/async-handler';
import { createHttpError } from '../utils/http-error';
import * as favoriteService from '../services/favorite.service';

const router = Router();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePaginationParam(value: unknown, field: 'page' | 'limit'): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw createHttpError(400, `${field} must be a positive integer`, 'VALIDATION_ERROR');
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${field} must be a positive integer`, 'VALIDATION_ERROR');
  }

  return parsed;
}

function parseCreateBody(body: unknown): CreateFavoriteRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid favorite body', 'VALIDATION_ERROR');
  }

  const allowedKeys = new Set(['listingId']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw createHttpError(400, `Unsupported field: ${key}`, 'VALIDATION_ERROR');
    }
  }

  if (typeof body.listingId !== 'string') {
    throw createHttpError(400, 'listingId must be a string', 'VALIDATION_ERROR');
  }

  return { listingId: body.listingId };
}

router.use((_, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization, x-tenant-id');
  next();
});
router.use(resolveRequiredTenant);
router.use(requireAuth);

router.get(
  '/ids',
  asyncHandler(async (req, res) => {
    const result = await favoriteService.listIds(req.user!.id, req.user!.tenantId);
    return res.status(200).json(result);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = parsePaginationParam(req.query.page, 'page');
    const limit = parsePaginationParam(req.query.limit, 'limit');
    const result = await favoriteService.list(req.user!.id, req.user!.tenantId, page, limit);
    return res.status(200).json(result);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await favoriteService.add(
      req.user!.id,
      req.user!.tenantId,
      parseCreateBody(req.body).listingId,
    );

    return res.status(result.created ? 201 : 200).json(result);
  }),
);

router.delete(
  '/:listingId',
  asyncHandler(async (req, res) => {
    await favoriteService.remove(req.user!.id, req.user!.tenantId, req.params.listingId);
    return res.status(204).send();
  }),
);

export default router;
