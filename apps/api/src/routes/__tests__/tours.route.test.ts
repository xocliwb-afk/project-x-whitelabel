import type { Server } from 'node:http';

import express from 'express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  planTour: vi.fn(),
  getTourById: vi.fn(),
  updateTour: vi.fn(),
  deleteTour: vi.fn(),
  listTours: vi.fn(),
}));

describe('tours routes', () => {
  let router: express.Router;

  beforeAll(async () => {
    vi.doMock('../../middleware/tenant', () => ({
      resolveRequiredTenant: (req: any, _res: any, next: any) => {
        req.tenantId = 'tenant-1';
        next();
      },
    }));

    vi.doMock('../../middleware/auth', () => ({
      requireAuth: (req: any, res: any, next: any) => {
        if (!req.headers.authorization) {
          return res.status(401).json({
            error: true,
            message: 'Authentication required',
          });
        }

        req.user = {
          id: 'user-1',
          supabaseId: 'supabase-user-1',
          tenantId: 'tenant-1',
          email: 'user@example.com',
          displayName: null,
          phone: null,
          role: 'CONSUMER',
          createdAt: '2026-03-23T00:00:00.000Z',
          updatedAt: '2026-03-23T00:00:00.000Z',
        };
        next();
      },
    }));

    vi.doMock('../../services/tour.service', () => ({
      planTour: mocks.planTour,
      getTourById: mocks.getTourById,
      updateTour: mocks.updateTour,
      deleteTour: mocks.deleteTour,
      listTours: mocks.listTours,
    }));

    router = (await import('../tours.route')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function startServer() {
    const app = express();
    app.use(express.json());
    app.use('/api/tours', router);

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

  it.each([
    ['GET', '/'],
    ['POST', '/'],
    ['GET', '/tour-123'],
    ['PUT', '/tour-123'],
    ['DELETE', '/tour-123'],
  ])('returns 401 for unauthenticated %s %s requests', async (method, path) => {
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours${path}`, {
        method,
        headers: method === 'POST' || method === 'PUT'
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body:
          method === 'POST'
            ? JSON.stringify({
                date: '2026-03-23',
                startTime: '10:00',
                defaultDurationMinutes: 30,
                defaultBufferMinutes: 15,
                stops: [{ listingId: 'listing-1', address: '1 Main St', lat: 1, lng: 1 }],
              })
            : method === 'PUT'
              ? JSON.stringify({})
              : undefined,
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: true,
        message: 'Authentication required',
      });
    } finally {
      await server.close();
    }
  });
});
