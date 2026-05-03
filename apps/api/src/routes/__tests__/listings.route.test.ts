import type { Server } from 'node:http';
import type { NormalizedListing } from '@project-x/shared-types';

import express from 'express';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  getById: vi.fn(),
  checkDailyLimit: vi.fn(),
  takeToken: vi.fn(),
}));

vi.mock('../../utils/provider.factory', () => ({
  getListingProvider: () => ({
    search: mocks.search,
    getById: mocks.getById,
  }),
}));

vi.mock('../../services/rateLimiter.service', () => ({
  checkDailyLimit: (...args: any[]) => mocks.checkDailyLimit(...args),
  takeToken: (...args: any[]) => mocks.takeToken(...args),
}));

describe('listings route', () => {
  let router: express.Router;
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  beforeAll(async () => {
    router = (await import('../listings.route')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('LISTINGS_CACHE_ENABLED', 'false');
    vi.stubEnv('LISTINGS_RATE_LIMIT_ENABLED', 'true');
    mocks.checkDailyLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.takeToken.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.search.mockResolvedValue([makeListing('listing-1')]);
    mocks.getById.mockResolvedValue(makeListing('listing-1'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (serverInfo) {
      await serverInfo.close();
      serverInfo = null;
    }
  });

  async function startServer() {
    const app = express();
    app.use('/api/listings', router);
    app.use('/api/listing', router);

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

  it('allows listing search requests under the configured limit', async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listings?bbox=-84,42,-83,43&limit=1`, {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [expect.objectContaining({ id: 'listing-1' })],
      pagination: expect.objectContaining({ page: 1, limit: 1 }),
    });
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });

  it('returns RATE_LIMITED when listing search exceeds the RPM limit', async () => {
    mocks.takeToken.mockReturnValue({ allowed: false, retryAfterSeconds: 7 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listings?bbox=-84,42,-83,43`, {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('7');
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: 'Too many requests',
      code: 'RATE_LIMITED',
      status: 429,
    });
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it('returns RATE_LIMITED when listing search exceeds the daily limit', async () => {
    mocks.checkDailyLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 60 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listings?bbox=-84,42,-83,43`, {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    await expect(response.json()).resolves.toMatchObject({
      error: true,
      code: 'RATE_LIMITED',
      status: 429,
    });
    expect(mocks.takeToken).not.toHaveBeenCalled();
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it('limits listing detail requests before provider lookup', async () => {
    mocks.takeToken.mockReturnValue({ allowed: false, retryAfterSeconds: 5 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listings/listing-1`, {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('5');
    await expect(response.json()).resolves.toMatchObject({
      error: true,
      code: 'RATE_LIMITED',
      status: 429,
    });
    expect(mocks.getById).not.toHaveBeenCalled();
  });

  it('limits the singular listing detail alias before provider lookup', async () => {
    mocks.takeToken.mockReturnValue({ allowed: false, retryAfterSeconds: 5 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listing/listing-1`, {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('5');
    expect(mocks.getById).not.toHaveBeenCalled();
  });

  it('does not block listing requests when rate limiting is disabled', async () => {
    vi.stubEnv('LISTINGS_RATE_LIMIT_ENABLED', 'false');
    mocks.checkDailyLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 60 });
    mocks.takeToken.mockReturnValue({ allowed: false, retryAfterSeconds: 7 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/listings?bbox=-84,42,-83,43`);

    expect(response.status).toBe(200);
    expect(mocks.checkDailyLimit).not.toHaveBeenCalled();
    expect(mocks.takeToken).not.toHaveBeenCalled();
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });
});

function makeListing(id: string): NormalizedListing {
  return {
    id,
    mlsId: id,
    listPrice: 250000,
    listPriceFormatted: '$250,000',
    address: {
      full: '1 Main St, Detroit, MI 48226',
      street: '1 Main St',
      city: 'Detroit',
      state: 'MI',
      zip: '48226',
      lat: 42.3314,
      lng: -83.0458,
    },
    media: {
      photos: [],
      thumbnailUrl: null,
    },
    details: {
      beds: 3,
      baths: 2,
      sqft: 1500,
      lotSize: null,
      yearBuilt: null,
      hoaFees: null,
      basement: null,
      propertyType: 'House',
      status: 'Active',
    },
    meta: {
      daysOnMarket: null,
      mlsName: null,
    },
    description: null,
  };
}
