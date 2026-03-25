import { Router } from 'express';
import type {
  BrandAssetOverrides,
  BrandAssetType,
  PatchAdminBrandRequest,
  PutAdminBrandRequest,
} from '@project-x/shared-types';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/require-role';
import { resolveRequiredTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/async-handler';
import {
  createHttpError,
  createValidationHttpError,
} from '../utils/http-error';
import { validateBrandConfig } from '../utils/brand-config-schema';
import {
  getAdminBrandForTenant,
  patchAdminBrand,
  replaceAdminBrand,
  validateAdminBrandDraft,
} from '../services/brand.service';
import { createBrandAssetUploadInit } from '../services/brand-asset.service';
import { validateBrandAssetUploadRequest } from '../utils/upload-policy';

const router = Router();
const MAX_ASSET_REFERENCE_LENGTH = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toBrandUnavailableMessage(reason: 'BRAND_NOT_FOUND' | 'BRAND_INACTIVE'): string {
  return reason === 'BRAND_NOT_FOUND'
    ? 'No brand configuration found for this tenant'
    : 'Brand configuration is inactive';
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
  subject: string,
): void {
  const allowed = new Set(allowedKeys);
  const unexpectedKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpectedKeys.length > 0) {
    throw createValidationHttpError(
      `Invalid ${subject}`,
      unexpectedKeys.map((key) => `${subject}.${key}: Unsupported field`),
    );
  }
}

function parseAssetValue(value: unknown, path: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw createValidationHttpError('Invalid admin brand request', [
      `${path}: Must be a string or null`,
    ]);
  }

  if (value.length === 0) {
    throw createValidationHttpError('Invalid admin brand request', [
      `${path}: Must not be empty`,
    ]);
  }

  if (value.length > MAX_ASSET_REFERENCE_LENGTH) {
    throw createValidationHttpError('Invalid admin brand request', [
      `${path}: Must be ${MAX_ASSET_REFERENCE_LENGTH} characters or fewer`,
    ]);
  }

  return value;
}

function parseAssets(
  value: unknown,
  options: { partial: boolean },
): BrandAssetOverrides | Partial<BrandAssetOverrides> {
  if (!isPlainObject(value)) {
    throw createValidationHttpError('Invalid admin brand request', [
      'assets: Must be an object',
    ]);
  }

  assertAllowedKeys(value, ['logoUrl', 'faviconUrl'], 'assets');

  if (!options.partial) {
    const missingKeys = ['logoUrl', 'faviconUrl'].filter((key) => !(key in value));
    if (missingKeys.length > 0) {
      throw createValidationHttpError(
        'Invalid admin brand request',
        missingKeys.map((key) => `assets.${key}: Field is required`),
      );
    }
  }

  const parsed: Partial<BrandAssetOverrides> = {};

  if ('logoUrl' in value) {
    parsed.logoUrl = parseAssetValue(value.logoUrl, 'assets.logoUrl');
  }

  if ('faviconUrl' in value) {
    parsed.faviconUrl = parseAssetValue(value.faviconUrl, 'assets.faviconUrl');
  }

  return options.partial ? parsed : (parsed as BrandAssetOverrides);
}

function parseDraftBody(body: unknown): { config: unknown; assets: BrandAssetOverrides } {
  if (!isPlainObject(body)) {
    throw createValidationHttpError('Invalid admin brand request', [
      'body: Must be an object',
    ]);
  }

  assertAllowedKeys(body, ['config', 'assets'], 'body');

  const errors: string[] = [];
  if (!('config' in body)) {
    errors.push('config: Field is required');
  }
  if (!('assets' in body)) {
    errors.push('assets: Field is required');
  }
  if (errors.length > 0) {
    throw createValidationHttpError('Invalid admin brand request', errors);
  }

  if (!isPlainObject(body.config)) {
    throw createValidationHttpError('Invalid admin brand request', [
      'config: Must be an object',
    ]);
  }

  return {
    config: body.config,
    assets: parseAssets(body.assets, { partial: false }) as BrandAssetOverrides,
  };
}

function parsePutBody(body: unknown): PutAdminBrandRequest {
  const parsed = parseDraftBody(body);
  const validation = validateBrandConfig(parsed.config);
  if (!validation.valid) {
    throw createValidationHttpError('Invalid brand config', validation.errors);
  }

  return {
    config: validation.config,
    assets: parsed.assets,
  };
}

function parsePatchBody(body: unknown): PatchAdminBrandRequest {
  if (!isPlainObject(body)) {
    throw createValidationHttpError('Invalid admin brand request', [
      'body: Must be an object',
    ]);
  }

  assertAllowedKeys(body, ['config', 'assets'], 'body');

  const parsed: PatchAdminBrandRequest = {};

  if ('config' in body) {
    if (!isPlainObject(body.config)) {
      throw createValidationHttpError('Invalid admin brand request', [
        'config: Must be an object',
      ]);
    }

    parsed.config = body.config as PatchAdminBrandRequest['config'];
  }

  if ('assets' in body) {
    parsed.assets = parseAssets(body.assets, { partial: true });
  }

  return parsed;
}

function parseAssetUploadInitBody(assetType: BrandAssetType, body: unknown) {
  const validation = validateBrandAssetUploadRequest(assetType, body);
  if (!validation.valid) {
    throw createValidationHttpError(validation.message, validation.errors, validation.code);
  }

  return validation.request;
}

router.use((_, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization, x-tenant-id');
  next();
});
router.use(resolveRequiredTenant);
router.use(requireAuth);
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await getAdminBrandForTenant(req.tenantId!);
    if (!result.found) {
      throw createHttpError(404, toBrandUnavailableMessage(result.reason), result.reason);
    }

    return res.status(200).json(result.brand);
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const result = await replaceAdminBrand(req.tenantId!, parsePutBody(req.body));
    if (!result.found) {
      throw createHttpError(404, toBrandUnavailableMessage(result.reason), result.reason);
    }

    return res.status(200).json(result.brand);
  }),
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const result = await patchAdminBrand(req.tenantId!, parsePatchBody(req.body));
    if (!result.found) {
      throw createHttpError(404, toBrandUnavailableMessage(result.reason), result.reason);
    }

    return res.status(200).json(result.brand);
  }),
);

router.post(
  '/logo',
  asyncHandler(async (req, res) => {
    const result = await createBrandAssetUploadInit(
      req.tenantId!,
      parseAssetUploadInitBody('logo', req.body),
    );
    if (!result.found) {
      throw createHttpError(404, toBrandUnavailableMessage(result.reason), result.reason);
    }

    return res.status(200).json(result.upload);
  }),
);

router.post(
  '/favicon',
  asyncHandler(async (req, res) => {
    const result = await createBrandAssetUploadInit(
      req.tenantId!,
      parseAssetUploadInitBody('favicon', req.body),
    );
    if (!result.found) {
      throw createHttpError(404, toBrandUnavailableMessage(result.reason), result.reason);
    }

    return res.status(200).json(result.upload);
  }),
);

router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const draft = parseDraftBody(req.body);
    return res.status(200).json(validateAdminBrandDraft(draft));
  }),
);

export default router;
