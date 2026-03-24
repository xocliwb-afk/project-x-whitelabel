import type { Server } from 'node:http';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createOrProvisionLocalUser: vi.fn(),
  login: vi.fn(),
  updateProfile: vi.fn(),
  refresh: vi.fn(),
}));

describe('auth routes', () => {
  let router: express.Router;

  beforeAll(async () => {
    vi.doMock('../../middleware/tenant', () => ({
      resolveTenant: (req: any, _res: any, next: any) => {
        req.tenantId = 'tenant-1';
        next();
      },
    }));

    vi.doMock('../../middleware/auth', () => ({
      requireVerifiedToken: (req: any, _res: any, next: any) => {
        req.auth = {
          supabaseId: 'supabase-user-1',
          email: 'consumer@example.com',
          tenantId: 'tenant-1',
          accessTokenClaims: {},
        };
        next();
      },
      requireAuth: (_req: any, _res: any, next: any) => next(),
    }));

    vi.doMock('../../services/auth.service', () => ({
      createOrProvisionLocalUser: mocks.createOrProvisionLocalUser,
      login: mocks.login,
      updateProfile: mocks.updateProfile,
      refresh: mocks.refresh,
    }));

    router = (await import('../auth.route')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function startServer() {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', router);

    const server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server port');
    }

    return {
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
  }

  it('provisions a local user from verified token claims on POST /register', async () => {
    mocks.createOrProvisionLocalUser.mockResolvedValue({
      user: {
        id: 'user-1',
        supabaseId: 'supabase-user-1',
        tenantId: 'tenant-1',
        email: 'consumer@example.com',
        displayName: 'Consumer One',
        phone: '555-2222',
        role: 'CONSUMER',
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
      },
    });

    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Consumer One',
          phone: '555-2222',
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        user: expect.objectContaining({
          id: 'user-1',
          supabaseId: 'supabase-user-1',
          tenantId: 'tenant-1',
          email: 'consumer@example.com',
        }),
      });

      expect(mocks.createOrProvisionLocalUser).toHaveBeenCalledWith(
        'supabase-user-1',
        'consumer@example.com',
        'tenant-1',
        'Consumer One',
        '555-2222',
      );
    } finally {
      await server.close();
    }
  });
});
