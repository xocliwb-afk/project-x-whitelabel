import type { Server } from 'node:http';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpError } from '../../utils/http-error';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteSavedSearch: vi.fn(),
  tenantFindUnique: vi.fn(),
}));

vi.mock('@project-x/database', () => ({
  prisma: {
    tenant: {
      findUnique: (...args: any[]) => mocks.tenantFindUnique(...args),
    },
  },
}));

describe('saved-searches routes', () => {
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

    vi.doMock('../../services/saved-search.service', () => ({
      list: mocks.list,
      getById: mocks.getById,
      create: mocks.create,
      update: mocks.update,
      deleteSavedSearch: mocks.deleteSavedSearch,
    }));

    router = (await import('../saved-searches.route')).default;
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
    app.use('/api/saved-searches', router);
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

  it('creates a new saved search on POST /', async () => {
    mocks.create.mockResolvedValue({
      savedSearch: {
        id: 'saved-1',
        name: 'Grand Rapids 3 Beds',
        filters: { cities: ['Grand Rapids'], beds: 3 },
        notifyNew: false,
        createdAt: '2026-03-24T00:00:00.000Z',
        updatedAt: '2026-03-24T00:00:00.000Z',
      },
      created: true,
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        name: 'Grand Rapids 3 Beds',
        filters: { cities: ['Grand Rapids'], beds: 3 },
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      savedSearch: expect.objectContaining({ id: 'saved-1' }),
      created: true,
    });
    expect(mocks.create).toHaveBeenCalledWith('user-1', 'tenant-1', {
      name: 'Grand Rapids 3 Beds',
      filters: { cities: ['Grand Rapids'], beds: 3 },
      notifyNew: undefined,
    });
  });

  it('returns an existing saved search for duplicate filters', async () => {
    mocks.create.mockResolvedValue({
      savedSearch: {
        id: 'saved-1',
        name: 'Grand Rapids 3 Beds',
        filters: { cities: ['Grand Rapids'], beds: 3 },
        notifyNew: false,
        createdAt: '2026-03-24T00:00:00.000Z',
        updatedAt: '2026-03-24T00:00:00.000Z',
      },
      created: false,
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        name: 'Grand Rapids 3 Beds',
        filters: { cities: ['Grand Rapids'], beds: 3 },
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      savedSearch: expect.objectContaining({ id: 'saved-1' }),
      created: false,
    });
  });

  it('returns VALIDATION_ERROR when the saved search name is empty', async () => {
    mocks.create.mockRejectedValue(
      createHttpError(400, 'Saved search name is required', 'VALIDATION_ERROR'),
    );

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        name: '',
        filters: { cities: ['Grand Rapids'] },
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Saved search name is required',
      code: 'VALIDATION_ERROR',
      status: 400,
    });
  });

  it('returns PAYLOAD_TOO_LARGE when filters exceed the size limit', async () => {
    mocks.create.mockRejectedValue(
      createHttpError(400, 'Filters payload exceeds 4096 bytes', 'PAYLOAD_TOO_LARGE'),
    );

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        name: 'Huge Search',
        filters: { features: Array.from({ length: 2000 }, (_, index) => `feature-${index}`) },
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Filters payload exceeds 4096 bytes',
      code: 'PAYLOAD_TOO_LARGE',
      status: 400,
    });
  });

  it('lists only the current user scope', async () => {
    mocks.list.mockResolvedValue({
      savedSearches: [
        {
          id: 'saved-1',
          name: 'Grand Rapids 3 Beds',
          filters: { cities: ['Grand Rapids'], beds: 3 },
          notifyNew: false,
          createdAt: '2026-03-24T00:00:00.000Z',
          updatedAt: '2026-03-24T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches?userId=other-user`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      savedSearches: expect.any(Array),
      pagination: { page: 1, limit: 20, total: 1, hasMore: false },
    });
    expect(mocks.list).toHaveBeenCalledWith('user-1', 'tenant-1', undefined, undefined);
  });

  it('returns 404 for a saved search outside the current user scope', async () => {
    mocks.getById.mockResolvedValue(null);

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches/saved-other`, {
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Saved search not found',
      code: 'SAVED_SEARCH_NOT_FOUND',
      status: 404,
    });
  });

  it('updates a saved search on PATCH /:id', async () => {
    mocks.update.mockResolvedValue({
      id: 'saved-1',
      name: 'Updated Name',
      filters: { cities: ['Grand Rapids'], beds: 4 },
      notifyNew: true,
      createdAt: '2026-03-24T00:00:00.000Z',
      updatedAt: '2026-03-24T01:00:00.000Z',
    });

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches/saved-1`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
      body: JSON.stringify({
        name: 'Updated Name',
        filters: { cities: ['Grand Rapids'], beds: 4 },
        notifyNew: true,
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      savedSearch: expect.objectContaining({
        id: 'saved-1',
        name: 'Updated Name',
        notifyNew: true,
      }),
    });
    expect(mocks.update).toHaveBeenCalledWith('saved-1', 'user-1', 'tenant-1', {
      name: 'Updated Name',
      filters: { cities: ['Grand Rapids'], beds: 4 },
      notifyNew: true,
    });
  });

  it('returns 204 on DELETE /:id', async () => {
    mocks.deleteSavedSearch.mockResolvedValue(undefined);

    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches/saved-1`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer token',
        'x-tenant-id': 'tenant-1',
      },
    });

    expect(response.status).toBe(204);
    expect(mocks.deleteSavedSearch).toHaveBeenCalledWith('saved-1', 'user-1', 'tenant-1');
  });

  it.each([
    ['GET', '/'],
    ['POST', '/', JSON.stringify({ name: 'Test', filters: { cities: ['Grand Rapids'] } })],
    ['GET', '/saved-1'],
    ['PATCH', '/saved-1', JSON.stringify({ name: 'Updated' })],
    ['DELETE', '/saved-1'],
  ])('returns 401 for unauthenticated %s %s requests', async (method, path, body) => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/saved-searches${path}`, {
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
    const response = await fetch(`${baseUrl}/api/saved-searches`, {
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
});
