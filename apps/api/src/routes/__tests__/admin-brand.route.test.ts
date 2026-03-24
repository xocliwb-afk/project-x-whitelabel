import type { Server } from 'node:http';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  brandFindUnique: vi.fn(),
  brandUpdateMany: vi.fn(),
  brandRows: new Map<string, any>(),
}));

vi.mock('@project-x/database', () => ({
  prisma: {
    tenant: {
      findUnique: (...args: any[]) => mocks.tenantFindUnique(...args),
    },
    brand: {
      findUnique: (...args: any[]) => mocks.brandFindUnique(...args),
      updateMany: (...args: any[]) => mocks.brandUpdateMany(...args),
    },
  },
}));

const baseConfig = {
  brandName: 'Tenant One Brand',
  brandTagline: 'Trusted guidance',
  agentName: 'Admin Agent',
  contact: {
    email: 'admin@example.com',
    phone: '616-555-1111',
    address: '123 Main St',
  },
  logo: {
    url: '/config-logo.png',
    darkUrl: '/config-logo-dark.png',
    height: 44,
    alt: 'Tenant One Brand',
  },
  favicon: '/config-favicon.ico',
  theme: {
    colors: {
      primary: '#14243B',
      primaryForeground: '#FFFFFF',
      primaryAccent: '#C7855B',
      background: '#FFFFFF',
      surface: '#F5F1E8',
      surfaceMuted: '#EEE8DC',
      surfaceAccent: '#E4DACA',
      textMain: '#14243B',
      textSecondary: '#6B7280',
      textMuted: '#6B7280',
      border: '#E6E7E8',
      danger: '#DC2626',
      success: '#16A34A',
    },
    typography: {
      fontFamily: 'Montserrat, sans-serif',
      baseSizePx: 16,
      headingWeight: 600,
      bodyWeight: 400,
    },
    radius: {
      card: 16,
      button: 9999,
      input: 9999,
    },
  },
  navItems: [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
  ],
  neighborhoods: [
    { label: 'Grand Rapids', slug: 'grand-rapids' },
  ],
  search: {
    defaultCenter: { lat: 42.9634, lng: -85.6681 },
    defaultZoom: 12,
    defaultStatus: ['FOR_SALE'],
  },
  compliance: {
    mlsDisclaimer: 'Reliable but not guaranteed.',
    brokerLicense: '242300064',
    brokerageName: '616 Realty',
    brokerageUrl: 'https://616realty.com',
    brokerageEmail: 'office@616realty.com',
    equalHousingLogo: true,
  },
  features: {
    tourEngine: true,
    aiSearch: true,
    contactForm: true,
    scheduleShowing: true,
  },
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createBrandRow(tenantId: string, overrides: Partial<any> = {}) {
  return {
    id: `brand-${tenantId}`,
    tenantId,
    config: cloneJson(baseConfig),
    logoUrl: '/row-logo.png',
    faviconUrl: '/row-favicon.ico',
    active: true,
    createdAt: new Date('2026-03-24T00:00:00.000Z'),
    updatedAt: new Date('2026-03-24T00:00:00.000Z'),
    ...overrides,
  };
}

describe('admin brand routes', () => {
  let router: express.Router;
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  beforeAll(async () => {
    vi.doMock('../../middleware/auth', () => ({
      requireAuth: (req: any, res: any, next: any) => {
        if (!req.headers.authorization) {
          return res.status(401).json({
            error: true,
            message: 'Authentication required',
            code: 'UNAUTHENTICATED',
            status: 401,
          });
        }

        req.user = {
          id: 'user-1',
          supabaseId: 'supabase-user-1',
          tenantId: typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : 'tenant-1',
          email: 'admin@example.com',
          displayName: null,
          phone: null,
          role: typeof req.headers['x-test-role'] === 'string' ? req.headers['x-test-role'] : 'ADMIN',
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
        };

        return next();
      },
    }));

    router = (await import('../admin-brand.route')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.brandRows.clear();
    mocks.brandRows.set('tenant-1', createBrandRow('tenant-1'));
    mocks.brandRows.set(
      'tenant-2',
      createBrandRow('tenant-2', {
        config: {
          ...cloneJson(baseConfig),
          brandName: 'Tenant Two Brand',
        },
        logoUrl: '/tenant-two-logo.png',
        faviconUrl: '/tenant-two-favicon.ico',
      }),
    );

    mocks.tenantFindUnique.mockImplementation(async ({ where: { id } }: { where: { id: string } }) => {
      if (id === 'tenant-1' || id === 'tenant-2') {
        return { active: true };
      }

      return null;
    });

    mocks.brandFindUnique.mockImplementation(async ({ where: { tenantId } }: { where: { tenantId: string } }) => {
      const row = mocks.brandRows.get(tenantId);
      return row ? cloneJson(row) : null;
    });

    mocks.brandUpdateMany.mockImplementation(async ({ where, data }: any) => {
      const tenantId = where?.tenantId;
      const row = mocks.brandRows.get(tenantId);

      if (!row || (where?.active === true && !row.active)) {
        return { count: 0 };
      }

      mocks.brandRows.set(tenantId, {
        ...row,
        ...(data.config !== undefined ? { config: cloneJson(data.config) } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.faviconUrl !== undefined ? { faviconUrl: data.faviconUrl } : {}),
        updatedAt: new Date('2026-03-24T12:00:00.000Z'),
      });

      return { count: 1 };
    });
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
    app.use('/api/admin/brand', router);
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = Number(err?.status ?? err?.statusCode ?? 500);
      res.status(status).json({
        error: true,
        message: err?.message ?? 'Request failed',
        ...(typeof err?.code === 'string' ? { code: err.code } : {}),
        status,
        ...(Array.isArray(err?.validationErrors) ? { validationErrors: err.validationErrors } : {}),
      });
    });

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

  it('returns TENANT_REQUIRED before auth when x-tenant-id is missing', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      headers: {
        Authorization: 'Bearer token',
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'x-tenant-id header is required',
      code: 'TENANT_REQUIRED',
      status: 400,
    });
  });

  it('returns 401 when auth is missing', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      headers: {
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Authentication required',
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('returns 403 when the user is not an admin', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
        'x-test-role': 'AGENT',
      },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_ROLE',
      status: 403,
    });
  });

  it('returns the admin response shape for the current tenant', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      config: expect.objectContaining({
        brandName: 'Tenant One Brand',
        logo: expect.objectContaining({
          url: '/config-logo.png',
        }),
        favicon: '/config-favicon.ico',
      }),
      assets: {
        logoUrl: '/row-logo.png',
        faviconUrl: '/row-favicon.ico',
      },
    });
  });

  it('returns VALIDATION_ERROR for a malformed PUT body', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: cloneJson(baseConfig),
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Invalid admin brand request',
      code: 'VALIDATION_ERROR',
      status: 400,
      validationErrors: ['assets: Field is required'],
    });
  });

  it('returns VALIDATION_ERROR with validationErrors for an invalid PUT config', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: {
          ...cloneJson(baseConfig),
          theme: {
            ...cloneJson(baseConfig.theme),
            colors: {
              ...cloneJson(baseConfig.theme.colors),
              primary: 'not-a-hex-color',
            },
          },
        },
        assets: {
          logoUrl: '/row-logo.png',
          faviconUrl: '/row-favicon.ico',
        },
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.status).toBe(400);
    expect(data.validationErrors).toEqual(
      expect.arrayContaining(['theme.colors.primary: Must be a valid 6-digit hex color']),
    );
  });

  it('updates only the current tenant on PUT /api/admin/brand', async () => {
    const { baseUrl } = await startServer();
    const tenantTwoBefore = cloneJson(mocks.brandRows.get('tenant-2'));

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: {
          ...cloneJson(baseConfig),
          brandName: 'Updated Tenant One Brand',
        },
        assets: {
          logoUrl: '/updated-row-logo.png',
          faviconUrl: null,
        },
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      config: expect.objectContaining({
        brandName: 'Updated Tenant One Brand',
      }),
      assets: {
        logoUrl: '/updated-row-logo.png',
        faviconUrl: null,
      },
    });
    expect(mocks.brandUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', active: true },
      data: expect.objectContaining({
        logoUrl: '/updated-row-logo.png',
        faviconUrl: null,
      }),
    });
    expect(cloneJson(mocks.brandRows.get('tenant-2'))).toEqual(tenantTwoBefore);
  });

  it('applies PATCH deep-merge semantics, replaces arrays, and clears optional fields', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: {
          brandTagline: null,
          contact: {
            email: 'updated-admin@example.com',
            phone: null,
          },
          navItems: [
            { label: 'Buy', href: '/buy' },
          ],
        },
        assets: {
          logoUrl: null,
        },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      config: expect.objectContaining({
        brandName: 'Tenant One Brand',
        contact: expect.objectContaining({
          email: 'updated-admin@example.com',
        }),
        navItems: [{ label: 'Buy', href: '/buy' }],
      }),
      assets: {
        logoUrl: null,
        faviconUrl: '/row-favicon.ico',
      },
    });
    expect(data.config.brandTagline).toBeUndefined();
    expect(data.config.contact.phone).toBeUndefined();
  });

  it('returns 400 when PATCH removes a required field from the merged config', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/admin/brand`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: {
          brandName: null,
        },
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.status).toBe(400);
    expect(data.validationErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('brandName')]),
    );
  });

  it('returns 200 valid=false and does not persist on POST /validate', async () => {
    const { baseUrl } = await startServer();
    const tenantOneBefore = cloneJson(mocks.brandRows.get('tenant-1'));

    const response = await fetch(`${baseUrl}/api/admin/brand/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        config: {
          ...cloneJson(baseConfig),
          theme: {
            ...cloneJson(baseConfig.theme),
            colors: {
              ...cloneJson(baseConfig.theme.colors),
              primary: 'invalid',
            },
          },
        },
        assets: {
          logoUrl: '/draft-logo.png',
          faviconUrl: null,
        },
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: false,
      errors: ['theme.colors.primary: Must be a valid 6-digit hex color'],
    });
    expect(mocks.brandUpdateMany).not.toHaveBeenCalled();
    expect(cloneJson(mocks.brandRows.get('tenant-1'))).toEqual(tenantOneBefore);
  });
});
