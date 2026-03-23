import { test, expect } from './fixtures';

const CENTER = { lat: 42.9634, lng: -85.6681 };
const CLUSTER_BBOX = '-85.72,42.94,-85.62,42.99';

const makeListings = (count: number) =>
  Array.from({ length: count }).map((_, i) => ({
    id: `mock-${i + 1}`,
    mlsId: `mls-${i + 1}`,
    listPrice: 300000 + i * 1000,
    address: {
      full: `${100 + i} Main St, Grand Rapids, MI 49503`,
      city: 'Grand Rapids',
      state: 'MI',
      zip: '49503',
      lat: CENTER.lat,
      lng: CENTER.lng,
    },
    details: {
      beds: 3,
      baths: 2,
      status: 'FOR_SALE',
    },
    media: {
      photos: [],
      thumbnailUrl: '',
    },
    attribution: {
      officeName: 'Test Office',
      brokerName: 'Test Broker',
    },
    meta: {},
  }));

test('map lens opens and closes via openImmediate hook', async ({ page }) => {
  const listingsRequests: string[] = [];

  await page.addInitScript(() => {
    (window as any).__PX_E2E = true;
  });

  const attachDebug = async () => {
    await test.info().attach('last_api_listings_urls', {
      body: listingsRequests.slice(-10).join('\n') || 'none',
      contentType: 'text/plain',
    });
    await test.info().attach('page_url', { body: page.url(), contentType: 'text/plain' });
  };

  await page.route('**/api/listings**', async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get('limit') ?? 50);
    listingsRequests.push(route.request().url());
    const count = Math.max(6, Math.min(20, limit));
    const results = makeListings(count);
    const body = {
      results,
      pagination: {
        page: Number(url.searchParams.get('page') ?? 1),
        limit,
        pageCount: 1,
        hasMore: false,
      },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.goto(`/search?bbox=${encodeURIComponent(CLUSTER_BBOX)}&searchToken=seed`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.locator('.mapboxgl-map')).toBeVisible({ timeout: 30000 });
  const mapCanvas = page.locator('.mapboxgl-canvas');
  await expect(mapCanvas).toBeVisible({ timeout: 30000 });

  await expect
    .poll(
      () => page.evaluate(() => Boolean((window as any).__PX_TEST__?.openLensAtCenter)),
      { timeout: 20000 },
    )
    .toBeTruthy();

  await expect
    .poll(
      () => page.evaluate(() => (window as any).__PX_TEST__?.openLensAtCenter?.() ?? false),
      { timeout: 20000 },
    )
    .toBeTruthy()
    .catch(async (err) => {
      await attachDebug();
      throw err;
    });

  const lens = page.locator('[data-testid="map-lens"]');

  try {
    await expect(lens).toBeVisible({ timeout: 10000 });
  } catch (err) {
    await attachDebug();
    throw err;
  }

  await lens.click({ force: true });
  await page.keyboard.press('Escape');
  try {
    await expect(lens).toBeHidden({ timeout: 15000 });
  } catch (err) {
    await attachDebug();
    throw err;
  }
});
