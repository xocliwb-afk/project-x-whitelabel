import type {
  AdminBrandResponse,
  BrandAssetInitRequest,
  BrandAssetInitResponse,
  BrandValidateRequest,
  BrandValidateResponse,
  PatchAdminBrandRequest,
  PutAdminBrandRequest,
} from '@project-x/shared-types';

import { getApiBaseUrl } from '@/lib/getApiBaseUrl';

const API_BASE_URL = getApiBaseUrl();

export type AdminBrandRequestOptions = {
  accessToken: string;
  tenantId: string;
};

type ApiErrorBody = {
  message?: string;
  code?: string;
  validationErrors?: string[];
};

export class AdminBrandApiError extends Error {
  status: number;
  code?: string;
  validationErrors?: string[];

  constructor(
    message: string,
    status: number,
    code?: string,
    validationErrors?: string[],
  ) {
    super(message);
    this.name = 'AdminBrandApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

type BrandAssetUploadInitInput = Omit<BrandAssetInitRequest, 'assetType'>;

async function adminBrandApiFetch<T>(
  path: string,
  auth: AdminBrandRequestOptions,
  init?: RequestInit,
): Promise<T> {
  if (!auth.tenantId.trim()) {
    throw new Error('Missing tenant configuration for admin brand request.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${auth.accessToken}`,
      'x-tenant-id': auth.tenantId,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new AdminBrandApiError(
      typeof body.message === 'string'
        ? body.message
        : `Admin brand request failed: ${response.status}`,
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
      Array.isArray(body.validationErrors)
        ? body.validationErrors.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
          )
        : undefined,
    );
  }

  return (await response.json()) as T;
}

export function getAdminBrand(auth: AdminBrandRequestOptions) {
  return adminBrandApiFetch<AdminBrandResponse>('/api/admin/brand', auth);
}

export function validateAdminBrand(
  input: BrandValidateRequest,
  auth: AdminBrandRequestOptions,
) {
  return adminBrandApiFetch<BrandValidateResponse>('/api/admin/brand/validate', auth, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function replaceAdminBrand(
  input: PutAdminBrandRequest,
  auth: AdminBrandRequestOptions,
) {
  return adminBrandApiFetch<AdminBrandResponse>('/api/admin/brand', auth, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function patchAdminBrand(
  input: PatchAdminBrandRequest,
  auth: AdminBrandRequestOptions,
) {
  return adminBrandApiFetch<AdminBrandResponse>('/api/admin/brand', auth, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function createLogoUploadInit(
  input: BrandAssetUploadInitInput,
  auth: AdminBrandRequestOptions,
) {
  return adminBrandApiFetch<BrandAssetInitResponse>('/api/admin/brand/logo', auth, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createFaviconUploadInit(
  input: BrandAssetUploadInitInput,
  auth: AdminBrandRequestOptions,
) {
  return adminBrandApiFetch<BrandAssetInitResponse>('/api/admin/brand/favicon', auth, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
