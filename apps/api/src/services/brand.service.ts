import type {
  AdminBrandResponse,
  BrandAssetOverrides,
  BrandConfig,
  BrandValidateResponse,
  PatchAdminBrandRequest,
  PutAdminBrandRequest,
} from '@project-x/shared-types';
import {
  validateBrandConfig,
} from '../utils/brand-config-schema';
import {
  createValidationHttpError,
} from '../utils/http-error';
import * as brandRepo from '../repositories/brand.repository';

type BrandUnavailableReason = 'BRAND_NOT_FOUND' | 'BRAND_INACTIVE';

const brandCache = new Map<string, { data: BrandConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_BRAND_CACHE_ENTRIES = 250;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function logInvalidBrandConfig(tenantId: string, errors: string[]) {
  console.error(`[brand] Invalid brand config for tenant ${tenantId}:`, errors);
}

function getBrandAssets(brand: {
  logoUrl: string | null;
  faviconUrl: string | null;
}): BrandAssetOverrides {
  return {
    logoUrl: brand.logoUrl ?? null,
    faviconUrl: brand.faviconUrl ?? null,
  };
}

function getUnavailableReason(brand: { active: boolean } | null): BrandUnavailableReason {
  if (!brand) {
    return 'BRAND_NOT_FOUND';
  }

  return brand.active ? 'BRAND_NOT_FOUND' : 'BRAND_INACTIVE';
}

function validateStoredConfig(
  raw: unknown,
  tenantId: string,
): { valid: true; config: BrandConfig } | { valid: false } {
  if (!isPlainObject(raw)) {
    logInvalidBrandConfig(tenantId, ['config: Brand config must be an object']);
    return { valid: false };
  }

  const validation = validateBrandConfig(cloneJson(raw));
  if (!validation.valid) {
    logInvalidBrandConfig(tenantId, validation.errors);
    return { valid: false };
  }

  return { valid: true, config: validation.config };
}

function evictExpiredCacheEntries() {
  if (brandCache.size < MAX_BRAND_CACHE_ENTRIES) {
    return;
  }

  const now = Date.now();
  for (const [tenantId, entry] of brandCache) {
    if (entry.expiresAt <= now) {
      brandCache.delete(tenantId);
    }

    if (brandCache.size < MAX_BRAND_CACHE_ENTRIES) {
      return;
    }
  }

  if (brandCache.size >= MAX_BRAND_CACHE_ENTRIES) {
    const oldestKey = brandCache.keys().next().value;
    if (oldestKey) {
      brandCache.delete(oldestKey);
    }
  }
}

function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (Array.isArray(patch)) {
    return cloneJson(patch);
  }

  if (!isPlainObject(patch)) {
    return patch;
  }

  const base = isPlainObject(target) ? cloneJson(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete base[key];
      continue;
    }

    if (Array.isArray(value)) {
      base[key] = cloneJson(value);
      continue;
    }

    if (isPlainObject(value)) {
      base[key] = applyMergePatch(base[key], value);
      continue;
    }

    base[key] = value;
  }

  return base;
}

function applyPublicBrandOverrides(
  rawConfig: Record<string, unknown>,
  assets: BrandAssetOverrides,
): Record<string, unknown> {
  const mergedConfig = cloneJson(rawConfig);

  if (
    typeof assets.logoUrl === 'string'
    && assets.logoUrl.trim()
    && isPlainObject(mergedConfig.logo)
  ) {
    mergedConfig.logo.url = assets.logoUrl;
  }

  if (typeof assets.faviconUrl === 'string' && assets.faviconUrl.trim()) {
    mergedConfig.favicon = assets.faviconUrl;
  }

  return mergedConfig;
}

async function findBrandRecord(tenantId: string): Promise<
  | {
      found: true;
      rawConfig: unknown;
      assets: BrandAssetOverrides;
    }
  | {
      found: false;
      reason: BrandUnavailableReason;
    }
> {
  const brand = await brandRepo.findByTenant(tenantId);
  if (!brand || !brand.active) {
    return { found: false, reason: getUnavailableReason(brand) };
  }

  return {
    found: true,
    rawConfig: cloneJson(brand.config),
    assets: getBrandAssets(brand),
  };
}

export function clearBrandCache() {
  brandCache.clear();
}

export function clearBrandCacheForTenant(tenantId: string) {
  brandCache.delete(tenantId);
}

export async function getPublicBrandForTenant(
  tenantId: string,
): Promise<{ found: true; config: BrandConfig } | { found: false; reason: BrandUnavailableReason }> {
  const cached = brandCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return { found: true, config: cached.data };
  }

  const brand = await findBrandRecord(tenantId);
  if (!brand.found) {
    return brand;
  }

  if (!isPlainObject(brand.rawConfig)) {
    logInvalidBrandConfig(tenantId, ['config: Brand config must be an object']);
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  const mergedConfig = applyPublicBrandOverrides(brand.rawConfig, brand.assets);
  const validation = validateBrandConfig(mergedConfig);
  if (!validation.valid) {
    logInvalidBrandConfig(tenantId, validation.errors);
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  evictExpiredCacheEntries();
  brandCache.set(tenantId, {
    data: validation.config,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { found: true, config: validation.config };
}

export async function getAdminBrandForTenant(
  tenantId: string,
): Promise<{ found: true; brand: AdminBrandResponse } | { found: false; reason: BrandUnavailableReason }> {
  const brand = await findBrandRecord(tenantId);
  if (!brand.found) {
    return brand;
  }

  const configValidation = validateStoredConfig(brand.rawConfig, tenantId);
  if (!configValidation.valid) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  return {
    found: true,
    brand: {
      config: configValidation.config,
      assets: brand.assets,
    },
  };
}

export async function replaceAdminBrand(
  tenantId: string,
  input: PutAdminBrandRequest,
): Promise<{ found: true; brand: AdminBrandResponse } | { found: false; reason: BrandUnavailableReason }> {
  const existing = await findBrandRecord(tenantId);
  if (!existing.found) {
    return existing;
  }

  const updated = await brandRepo.updateByTenant(tenantId, {
    config: input.config,
    logoUrl: input.assets.logoUrl,
    faviconUrl: input.assets.faviconUrl,
  });

  if (!updated) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  clearBrandCacheForTenant(tenantId);

  return {
    found: true,
    brand: {
      config: input.config,
      assets: getBrandAssets(updated),
    },
  };
}

export async function patchAdminBrand(
  tenantId: string,
  input: PatchAdminBrandRequest,
): Promise<{ found: true; brand: AdminBrandResponse } | { found: false; reason: BrandUnavailableReason }> {
  const existing = await getAdminBrandForTenant(tenantId);
  if (!existing.found) {
    return existing;
  }

  const hasAssetUpdates = Boolean(
    input.assets && (input.assets.logoUrl !== undefined || input.assets.faviconUrl !== undefined),
  );
  if (input.config === undefined && !hasAssetUpdates) {
    return {
      found: true,
      brand: {
        config: existing.brand.config,
        assets: existing.brand.assets,
      },
    };
  }

  const mergedConfig = input.config !== undefined
    ? applyMergePatch(existing.brand.config, input.config)
    : existing.brand.config;

  const validation = validateBrandConfig(mergedConfig);
  if (!validation.valid) {
    throw createValidationHttpError('Invalid brand patch', validation.errors);
  }

  const mergedAssets: BrandAssetOverrides = {
    logoUrl:
      input.assets?.logoUrl !== undefined
        ? input.assets.logoUrl
        : existing.brand.assets.logoUrl,
    faviconUrl:
      input.assets?.faviconUrl !== undefined
        ? input.assets.faviconUrl
        : existing.brand.assets.faviconUrl,
  };

  const updated = await brandRepo.updateByTenant(tenantId, {
    config: validation.config,
    logoUrl: mergedAssets.logoUrl,
    faviconUrl: mergedAssets.faviconUrl,
  });

  if (!updated) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  clearBrandCacheForTenant(tenantId);

  return {
    found: true,
    brand: {
      config: validation.config,
      assets: getBrandAssets(updated),
    },
  };
}

export function validateAdminBrandDraft(input: {
  config: unknown;
}): BrandValidateResponse {
  const validation = validateBrandConfig(input.config);
  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
