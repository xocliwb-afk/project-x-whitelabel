import type { Server } from 'node:http';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockBrand = {
  id: 'brand-1',
  tenantId: 'tenant-1',
  config: {
    brandName: 'Test Brand',
    contact: { email: 'test@example.com' },
    logo: { url: '/logo.png', height: 40, alt: 'Test' },
    theme: {
      colors: { primary: '#000' },
      typography: { fontFamily: 'sans-serif' },
      radius: { card: 8, button: 4, input: 4 },
    },
  },
  logoUrl: null,
  faviconUrl: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFindUnique = vi.fn();

vi.mock('@project-x/database', () => ({
  prisma: {
    brand: { findUnique: (...args: any[]) => mockFindUnique(...args) },
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ active: true }),
      findFirst: vi.fn().mockResolvedValue({ id: 'tenant-1' }),
    },
  },
}));

describe('brand route', () => {
  let router: express.Router;
  let clearBrandCache: () => void;
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  beforeAll(async () => {
    const brandRouteModule = await import('../brand.route');
    router = brandRouteModule.default;
    clearBrandCache = brandRouteModule.clearBrandCache;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    clearBrandCache();
  });

  afterEach(async () => {
    if (serverInfo) {
      await serverInfo.close();
      serverInfo = null;
    }
  });

  async function startServer() {
    const app = express();
    app.use(express.json());
    app.use('/api/brand', router);

    const server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server port');
    }

    const info = {
      baseUrl: `http://127.0.0.1:${address.port}`,
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    };
    serverInfo = info;
    return info;
  }

  it('returns 400 with TENANT_REQUIRED when x-tenant-id is missing', async () => {
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({
      error: true,
      message: 'x-tenant-id header is required',
      code: 'TENANT_REQUIRED',
      status: 400,
    });
  });

  it('returns brand config for valid tenant', async () => {
    mockFindUnique.mockResolvedValue(mockBrand);
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-1' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.brandName).toBe('Test Brand');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300, stale-while-revalidate=60');
    expect(res.headers.get('vary')).toContain('x-tenant-id');
  });

  it('keeps cache isolated per tenant', async () => {
    mockFindUnique.mockImplementation(async ({ where: { tenantId } }: { where: { tenantId: string } }) => {
      if (tenantId === 'tenant-1') {
        return mockBrand;
      }

      if (tenantId === 'tenant-2') {
        return {
          ...mockBrand,
          id: 'brand-2',
          tenantId: 'tenant-2',
          config: {
            ...mockBrand.config,
            brandName: 'Tenant Two Brand',
          },
        };
      }

      return null;
    });

    const { baseUrl } = await startServer();

    const tenantOneRes = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-1' },
    });
    const tenantOneData = await tenantOneRes.json();

    const tenantTwoRes = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-2' },
    });
    const tenantTwoData = await tenantTwoRes.json();

    expect(tenantOneData.brandName).toBe('Test Brand');
    expect(tenantTwoData.brandName).toBe('Tenant Two Brand');
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });

  it('overrides logo.url when logoUrl is set on Brand row', async () => {
    mockFindUnique.mockResolvedValue({ ...mockBrand, logoUrl: '/override-logo.png' });
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-logo-override' },
    });

    const data = await res.json();
    expect(data.logo.url).toBe('/override-logo.png');
  });

  it('overrides favicon when faviconUrl is set on Brand row', async () => {
    mockFindUnique.mockResolvedValue({ ...mockBrand, faviconUrl: '/override-favicon.ico' });
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-favicon-override' },
    });

    const data = await res.json();
    expect(data.favicon).toBe('/override-favicon.ico');
  });

  it('returns 404 with BRAND_NOT_FOUND when no brand exists', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-no-brand' },
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe('BRAND_NOT_FOUND');
    expect(data.error).toBe(true);
    expect(data.status).toBe(404);
  });

  it('returns refreshed brand data after the cache is cleared', async () => {
    const { baseUrl } = await startServer();

    mockFindUnique.mockResolvedValue(mockBrand);

    const firstRes = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-1' },
    });
    const firstData = await firstRes.json();
    expect(firstData.brandName).toBe('Test Brand');

    mockFindUnique.mockResolvedValue({
      ...mockBrand,
      config: {
        ...mockBrand.config,
        brandName: 'Updated Brand Name',
      },
    });
    clearBrandCache();

    const secondRes = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-1' },
    });
    const secondData = await secondRes.json();
    expect(secondData.brandName).toBe('Updated Brand Name');
  });

  it('returns 404 with BRAND_INACTIVE when brand is inactive', async () => {
    mockFindUnique.mockResolvedValue({ ...mockBrand, active: false });
    const { baseUrl } = await startServer();

    const res = await fetch(`${baseUrl}/api/brand`, {
      headers: { 'x-tenant-id': 'tenant-inactive' },
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe('BRAND_INACTIVE');
    expect(data.error).toBe(true);
    expect(data.status).toBe(404);
  });
});
