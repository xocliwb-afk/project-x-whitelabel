import { expect, test } from '@playwright/test';

const SMALL_BBOX = '-85.73302,42.92583,-85.60318,43.00095';
const CITY = 'Grand Rapids';

const last10 = (urls: string[]) => urls.slice(-10).join('\n') || 'none';
const normalizeUrl = (raw: string) => decodeURIComponent(raw).replace(/\+/g, ' ');

test.describe('More Filters panel (plumbing)', () => {
  test('city param is forwarded in listings requests', async ({ page }) => {
    let listingsUrls: string[] = [];

    await page.route('**/api/listings**', async (route) => {
      const url = route.request().url();
      listingsUrls.push(url);
      const limit = Number(new URL(url).searchParams.get('limit') ?? 50);
      const body = {
        results: [],
        pagination: {
          page: 1,
          limit,
          pageCount: 0,
          hasMore: false,
        },
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto(
      `/search?bbox=${encodeURIComponent(SMALL_BBOX)}&searchToken=seed&cities=${encodeURIComponent(CITY)}`,
    );
    await page.waitForLoadState('domcontentloaded');

    try {
      await page.waitForResponse(
        (res) => res.url().includes('/api/listings') && res.request().method() === 'GET',
        { timeout: 15000 },
      );
    } catch (err) {
      await test.info().attach('last_api_listings_urls', {
        body: last10(listingsUrls),
        contentType: 'text/plain',
      });
      throw err;
    }

    const decodedUrl = normalizeUrl(page.url());
    try {
      await expect.poll(() => normalizeUrl(page.url()), { timeout: 5000 }).toContain(`cities=${CITY}`);
      await expect
        .poll(
          () =>
            listingsUrls.some(
              (u) => normalizeUrl(u).includes(`cities=${CITY}`) && u.includes('limit=50'),
            ),
          { timeout: 10000 },
        )
        .toBeTruthy();
    } catch (err) {
      await test.info().attach('url_after_apply', { body: decodedUrl, contentType: 'text/plain' });
      await test.info().attach('last_api_listings_urls', {
        body: last10(listingsUrls),
        contentType: 'text/plain',
      });
      throw err;
    }

    await test.info().attach('last_api_listings_urls', {
      body: last10(listingsUrls),
      contentType: 'text/plain',
    });
  });
});
