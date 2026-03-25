import { randomUUID } from 'node:crypto';

import type {
  BrandAssetInitResponse,
} from '@project-x/shared-types';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import * as brandRepo from '../repositories/brand.repository';
import { createHttpError } from '../utils/http-error';
import type { ValidatedBrandAssetUploadRequest } from '../utils/upload-policy';

type BrandUnavailableReason = 'BRAND_NOT_FOUND' | 'BRAND_INACTIVE';

const BRAND_ASSET_BUCKET = 'brand-assets';
const FALLBACK_UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

function buildObjectPath(
  tenantId: string,
  request: ValidatedBrandAssetUploadRequest,
): string {
  return `${tenantId}/brand/${request.assetType}/${randomUUID()}${request.extension}`;
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function deriveExpiryFromSignedUrl(signedUrl: string): string {
  try {
    const token = new URL(signedUrl).searchParams.get('token');
    if (!token) {
      throw new Error('Missing upload token');
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Upload token is not a JWT');
    }

    const payloadJson = decodeBase64Url(tokenParts[1]!);
    if (!payloadJson) {
      throw new Error('Upload token payload is invalid');
    }

    const payload = JSON.parse(payloadJson) as { exp?: unknown };
    if (typeof payload.exp !== 'number') {
      throw new Error('Upload token has no exp claim');
    }

    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return new Date(Date.now() + FALLBACK_UPLOAD_URL_TTL_MS).toISOString();
  }
}

async function ensureTenantBrandIsActive(
  tenantId: string,
): Promise<{ found: true } | { found: false; reason: BrandUnavailableReason }> {
  const brand = await brandRepo.findByTenant(tenantId);
  if (!brand) {
    return { found: false, reason: 'BRAND_NOT_FOUND' };
  }

  if (!brand.active) {
    return { found: false, reason: 'BRAND_INACTIVE' };
  }

  return { found: true };
}

export async function createBrandAssetUploadInit(
  tenantId: string,
  request: ValidatedBrandAssetUploadRequest,
): Promise<
  | { found: true; upload: BrandAssetInitResponse }
  | { found: false; reason: BrandUnavailableReason }
> {
  const brandCheck = await ensureTenantBrandIsActive(tenantId);
  if (!brandCheck.found) {
    return brandCheck;
  }

  const objectPath = buildObjectPath(tenantId, request);

  try {
    const bucket = getSupabaseAdmin().storage.from(BRAND_ASSET_BUCKET);
    const { data, error } = await bucket.createSignedUploadUrl(objectPath);
    if (error || !data) {
      throw error ?? new Error('Failed to initialize upload');
    }

    const { data: publicUrlData } = bucket.getPublicUrl(objectPath);

    return {
      found: true,
      upload: {
        assetType: request.assetType,
        uploadUrl: data.signedUrl,
        assetUrl: publicUrlData.publicUrl,
        method: 'PUT',
        headers: {
          'content-type': request.contentType,
        },
        expiresAt: deriveExpiryFromSignedUrl(data.signedUrl),
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    throw createHttpError(502, 'Failed to initialize brand asset upload', 'UPLOAD_INIT_FAILED');
  }
}
