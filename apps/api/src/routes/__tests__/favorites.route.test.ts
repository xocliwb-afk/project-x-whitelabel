import type { Server } from 'node:http';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listIds: vi.fn(),
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  tenantFindUnique: vi.fn(),
}));

vi.mock('@project-x/database', () => ({
  prisma: {
    tenant: {
      findUnique: (...args: any[]) => mocks.tenantFindUnique(...args),
    },
  },
}));

describe('favorites routes', () => {
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

    vi.doMock('../../services/favorite.service', () => ({
      listIds: mocks.listIds,
      list: mocks.list,
      add: mocks.add,
      remove: mocks.remove,
    }));

    router = (await import('../favorites.route')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantFindUnique.mockResolvedValue({ active: true });
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
    app.use('/api/favorites', router);
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = Number(err?.status ?? err?.statusCode ?? 500);
      res.status(status).json({
        error: true,
        message: err?.message ?? 'Request failed',
        ...(typeof err?.code === 'string' ? { code: err.code } : {}),
        status,
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

  it('creates a new favorite on POST /', async () => {
    mocks.add.mockResolvedValue({
      favorite: {
        id: 'favorite-1',
        listingId: 'listing-1',
        createdAt: '2026-03-24T00:00:00.000Z',
      },
      created: true,
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({ listingId: 'listing-1' }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      favorite: expect.objectContaining({ id: 'favorite-1', listingId: 'listing-1' }),
      created: true,
    });
    expect(mocks.add).toHaveBeenCalledWith('user-1', 'tenant-1', 'listing-1');
  });

  it('returns an existing favorite for duplicate POST requests', async () => {
    mocks.add.mockResolvedValue({
      favorite: {
        id: 'favorite-1',
        listingId: 'listing-1',
        createdAt: '2026-03-24T00:00:00.000Z',
      },
      created: false,
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({ listingId: 'listing-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      favorite: expect.objectContaining({ id: 'favorite-1', listingId: 'listing-1' }),
      created: false,
    });
  });

  it('returns favorite listing IDs on GET /ids', async () => {
    mocks.listIds.mockResolvedValue({ listingIds: ['listing-1', 'listing-2'] });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites/ids`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      listingIds: ['listing-1', 'listing-2'],
    });
    expect(mocks.listIds).toHaveBeenCalledWith('user-1', 'tenant-1');
  });

  it('returns paginated favorites on GET /', async () => {
    mocks.list.mockResolvedValue({
      favorites: [
        {
          id: 'favorite-1',
          listingId: 'listing-1',
          createdAt: '2026-03-24T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites?userId=other-user`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      favorites: expect.any(Array),
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });
    expect(mocks.list).toHaveBeenCalledWith('user-1', 'tenant-1', undefined, undefined);
  });

  it('returns 204 when deleting a favorite', async () => {
    mocks.remove.mockResolvedValue(undefined);

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites/listing-1`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith('user-1', 'tenant-1', 'listing-1');
  });

  it('returns 204 when deleting a nonexistent favorite', async () => {
    mocks.remove.mockResolvedValue(undefined);

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites/listing-missing`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith('user-1', 'tenant-1', 'listing-missing');
  });

  it.each([
    ['GET', '/ids'],
    ['GET', '/'],
    ['POST', '/', JSON.stringify({ listingId: 'listing-1' })],
    ['DELETE', '/listing-1'],
  ])('returns 401 for unauthenticated %s %s requests', async (method, path, body) => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        'x-tenant-id': 'tenant-1',
      },
      body,
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Authentication required',
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('returns 400 TENANT_REQUIRED when x-tenant-id is missing', async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites`, {
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

  it('does not allow another user scope to override the authenticated user', async () => {
    mocks.list.mockResolvedValue({
      favorites: [],
      pagination: { page: 1, limit: 20, total: 0, hasMore: false },
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/favorites?userId=user-2`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith('user-1', 'tenant-1', undefined, undefined);
  });
});
