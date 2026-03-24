import { Router } from 'express';
import type {
  CreateSavedSearchRequest,
  UpdateSavedSearchRequest,
} from '@project-x/shared-types';
import { requireAuth } from '../middleware/auth';
import { resolveRequiredTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/async-handler';
import { createHttpError } from '../utils/http-error';
import * as savedSearchService from '../services/saved-search.service';

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

function parseCreateBody(body: unknown): CreateSavedSearchRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid saved search body', 'VALIDATION_ERROR');
  }

  const allowedKeys = new Set(['name', 'filters', 'notifyNew']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw createHttpError(400, `Unsupported field: ${key}`, 'VALIDATION_ERROR');
    }
  }

  if (typeof body.name !== 'string') {
    throw createHttpError(400, 'name must be a string', 'VALIDATION_ERROR');
  }

  if (body.notifyNew !== undefined && typeof body.notifyNew !== 'boolean') {
    throw createHttpError(400, 'notifyNew must be a boolean', 'VALIDATION_ERROR');
  }

  return {
    name: body.name,
    filters: body.filters as CreateSavedSearchRequest['filters'],
    notifyNew: body.notifyNew as boolean | undefined,
  };
}

function parseUpdateBody(body: unknown): UpdateSavedSearchRequest {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'Invalid saved search body', 'VALIDATION_ERROR');
  }

  const allowedKeys = new Set(['name', 'filters', 'notifyNew']);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw createHttpError(400, `Unsupported field: ${key}`, 'VALIDATION_ERROR');
    }
  }

  if (body.name !== undefined && typeof body.name !== 'string') {
    throw createHttpError(400, 'name must be a string', 'VALIDATION_ERROR');
  }

  if (body.notifyNew !== undefined && typeof body.notifyNew !== 'boolean') {
    throw createHttpError(400, 'notifyNew must be a boolean', 'VALIDATION_ERROR');
  }

  return {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.filters !== undefined ? { filters: body.filters as UpdateSavedSearchRequest['filters'] } : {}),
    ...(body.notifyNew !== undefined ? { notifyNew: body.notifyNew } : {}),
  };
}

router.use((_, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization, x-tenant-id');
  next();
});
router.use(resolveRequiredTenant);
router.use(requireAuth);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = await savedSearchService.create(
      req.user!.id,
      req.user!.tenantId,
      parseCreateBody(req.body),
    );

    return res.status(result.created ? 201 : 200).json(result);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = parsePaginationParam(req.query.page, 'page');
    const limit = parsePaginationParam(req.query.limit, 'limit');
    const result = await savedSearchService.list(req.user!.id, req.user!.tenantId, page, limit);
    return res.status(200).json(result);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const savedSearch = await savedSearchService.getById(
      req.params.id,
      req.user!.id,
      req.user!.tenantId,
    );

    if (!savedSearch) {
      throw createHttpError(404, 'Saved search not found', 'SAVED_SEARCH_NOT_FOUND');
    }

    return res.status(200).json({ savedSearch });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const savedSearch = await savedSearchService.update(
      req.params.id,
      req.user!.id,
      req.user!.tenantId,
      parseUpdateBody(req.body),
    );

    return res.status(200).json({ savedSearch });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await savedSearchService.deleteSavedSearch(req.params.id, req.user!.id, req.user!.tenantId);
    return res.status(204).send();
  }),
);

export default router;
