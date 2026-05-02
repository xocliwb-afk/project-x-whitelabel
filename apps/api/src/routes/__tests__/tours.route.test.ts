import type { Server } from 'node:http';

import express from 'express';
import { createHttpError } from '../../utils/http-error';
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

  const validCreatePayload = () => ({
    date: '2026-03-23',
    clientName: 'Ada Buyer',
    stops: [
      {
        listingId: 'listing-1',
        address: '1 Main St',
        lat: 42.3314,
        lng: -83.0458,
      },
    ],
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    timeZone: 'America/Detroit',
  });

  const plannedTour = {
    id: 'tour-123',
    title: "Ada Buyer's Tour",
    clientName: 'Ada Buyer',
    date: '2026-03-23',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    stops: [
      {
        id: 'stop-1',
        listingId: 'listing-1',
        order: 0,
        address: '1 Main St',
        lat: 42.3314,
        lng: -83.0458,
        thumbnailUrl: null,
        startTime: '2026-03-23T13:00:00.000Z',
        endTime: '2026-03-23T13:30:00.000Z',
      },
    ],
  };

  const validUpdatePayload = () => ({
    date: '2026-03-24',
    startTime: '10:15',
    timeZone: 'America/Detroit',
    defaultDurationMinutes: 45,
    defaultBufferMinutes: 15,
    stops: [
      {
        id: 'stop-1',
        listingId: 'listing-1',
        order: 0,
        address: '1 Main St',
        lat: 42.3314,
        lng: -83.0458,
        thumbnailUrl: null,
        startTime: '2026-03-23T13:00:00.000Z',
        endTime: '2026-03-23T13:30:00.000Z',
      },
    ],
  });

  async function startServer() {
    const app = express();
    app.use(express.json());
    app.use('/api/tours', router);
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

  async function expectValidationFailure(body: unknown, method: 'POST' | 'PUT' = 'POST') {
    const server = await startServer();

    try {
      const response = await fetch(
        `${server.baseUrl}/api/tours${method === 'PUT' ? '/tour-123' : ''}`,
        {
          method,
          headers: {
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toMatchObject({
        error: true,
        code: 'VALIDATION_ERROR',
        status: 400,
      });
      return data;
    } finally {
      await server.close();
    }
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
        code: 'UNAUTHENTICATED',
        status: 401,
      });
    } finally {
      await server.close();
    }
  });

  it('plans a valid tour payload', async () => {
    mocks.planTour.mockResolvedValue(plannedTour);
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validCreatePayload()),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(plannedTour);
      expect(mocks.planTour).toHaveBeenCalledWith(validCreatePayload(), {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'CONSUMER',
      });
    } finally {
      await server.close();
    }
  });

  it('updates a valid tour payload', async () => {
    const updatedTour = {
      ...plannedTour,
      date: '2026-03-24',
      startTime: '10:15',
      defaultDurationMinutes: 45,
      defaultBufferMinutes: 15,
    };
    mocks.updateTour.mockResolvedValue(updatedTour);
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours/tour-123`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validUpdatePayload()),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(updatedTour);
      expect(mocks.updateTour).toHaveBeenCalledWith('tour-123', {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'CONSUMER',
      }, validUpdatePayload());
    } finally {
      await server.close();
    }
  });

  it('uses the explicit omitted timeZone fallback contract without requiring a request field', async () => {
    mocks.planTour.mockResolvedValue(plannedTour);
    const { timeZone: _timeZone, ...payload } = validCreatePayload();
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      expect(mocks.planTour).toHaveBeenCalledWith(payload, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'CONSUMER',
      });
    } finally {
      await server.close();
    }
  });

  it.each([
    ['invalid date', { date: '2026-02-30' }],
    ['invalid startTime', { startTime: '24:00' }],
    ['invalid timeZone', { timeZone: 'Not/AZone' }],
    ['empty stops', { stops: [] }],
    ['too many stops', { stops: Array.from({ length: 51 }, (_, index) => ({
      listingId: `listing-${index}`,
      address: `${index} Main St`,
      lat: 42,
      lng: -83,
    })) }],
    ['missing listingId', { stops: [{ address: '1 Main St', lat: 42, lng: -83 }] }],
    ['empty listingId', { stops: [{ listingId: ' ', address: '1 Main St', lat: 42, lng: -83 }] }],
    ['missing address', { stops: [{ listingId: 'listing-1', lat: 42, lng: -83 }] }],
    ['empty address', { stops: [{ listingId: 'listing-1', address: '', lat: 42, lng: -83 }] }],
    ['invalid lat', { stops: [{ listingId: 'listing-1', address: '1 Main St', lat: 91, lng: -83 }] }],
    ['invalid lng', { stops: [{ listingId: 'listing-1', address: '1 Main St', lat: 42, lng: -181 }] }],
    ['invalid defaultDurationMinutes', { defaultDurationMinutes: 0 }],
    ['invalid defaultBufferMinutes', { defaultBufferMinutes: -1 }],
  ])('rejects create payload with %s', async (_caseName, override) => {
    await expectValidationFailure({
      ...validCreatePayload(),
      ...override,
    });
    expect(mocks.planTour).not.toHaveBeenCalled();
  });

  it('rejects invalid partial tour updates before calling the service', async () => {
    await expectValidationFailure({
      ...validUpdatePayload(),
      date: '2026/03/24',
    }, 'PUT');

    expect(mocks.updateTour).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/tour-123', () => mocks.getTourById.mockResolvedValue(undefined)],
    ['GET', '/tour-123/narrations', () => mocks.getTourById.mockResolvedValue(undefined)],
    ['PUT', '/tour-123', () => mocks.updateTour.mockResolvedValue(undefined)],
    ['DELETE', '/tour-123', () => mocks.deleteTour.mockResolvedValue(false)],
  ])('returns TOUR_NOT_FOUND for %s %s when the tour is missing', async (method, path, setup) => {
    setup();
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours${path}`, {
        method,
        headers: {
          Authorization: 'Bearer test-token',
          ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
        },
        body: method === 'PUT' ? JSON.stringify({}) : undefined,
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: true,
        message: 'Tour not found',
        code: 'TOUR_NOT_FOUND',
        status: 404,
      });
    } finally {
      await server.close();
    }
  });

  it('surfaces VALIDATION_ERROR codes raised by the tour service', async () => {
    mocks.planTour.mockRejectedValue(
      createHttpError(400, 'Invalid startTime provided', 'VALIDATION_ERROR'),
    );
    const server = await startServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/tours`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: '2026-03-23',
          startTime: '09:00',
          defaultDurationMinutes: 30,
          defaultBufferMinutes: 15,
          stops: [{ listingId: 'listing-1', address: '1 Main St', lat: 1, lng: 1 }],
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: true,
        message: 'Invalid startTime provided',
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    } finally {
      await server.close();
    }
  });
});
