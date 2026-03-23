import { expect, test } from '@playwright/test';

const EMPTY_LISTINGS = {
  results: [],
  pagination: { page: 1, limit: 50, pageCount: 1, hasMore: false },
};

test.describe('Smart submit hardwired AI search', () => {
  test('filter-like query uses AI and geocodes extracted zip', async ({ page }) => {
    let aiCalls = 0;
    let geoCalls = 0;
    const listingsUrls: string[] = [];

    await page.route('**/*/api/ai/parse-search', (route) => {
      aiCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'req-ai',
          proposedFilters: { zip: '49503', bedsMin: 3, maxPrice: 300000 },
          explanations: [],
          confidence: 0.9,
          warnings: [],
          ignoredInputReasons: [],
        }),
      });
    });

    await page.route('**/*/api/geo/geocode', (route) => {
      geoCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          result: {
            bbox: '-85.69000,42.94000,-85.62000,42.98000',
            center: { lat: 42.96, lng: -85.65 },
            displayName: 'Grand Rapids, MI 49503',
          },
        }),
      });
    });

    await page.route('**/*/api/listings**', (route) => {
      listingsUrls.push(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_LISTINGS),
      });
    });

    await page.goto('/search');
    const input = page.getByPlaceholder('City, ZIP, Address');
    await input.click();
    await input.fill('49503 under 300k');
    await input.press('Enter');

    await expect
      .poll(() => page.url(), { timeout: 12000 })
      .toContain('postalCodes=49503');
    const url = new URL(page.url());
    expect(url.searchParams.get('maxPrice')).toBe('300000');
    expect(url.searchParams.get('beds')).toBe('3');
    expect(url.searchParams.get('bbox')).toBe('-85.69000,42.94000,-85.62000,42.98000');
    expect(url.searchParams.get('searchToken')).not.toBeNull();

    await expect
      .poll(() =>
        listingsUrls.some((u) => {
          try {
            const params = new URL(u).searchParams;
            return (
              params.get('bbox') === '-85.69000,42.94000,-85.62000,42.98000' &&
              !params.has('q')
            );
          } catch {
            return false;
          }
        }),
      { timeout: 10000 },
      )
      .toBeTruthy();

    expect(aiCalls).toBeGreaterThan(0);
    expect(geoCalls).toBeGreaterThan(0);

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('pure location query skips AI and geocodes location', async ({ page }) => {
    let aiCalls = 0;
    let geoCalls = 0;
    const listingsUrls: string[] = [];

    await page.route('**/*/api/ai/parse-search', (route) => {
      aiCalls += 1;
      route.abort();
    });

    await page.route('**/*/api/geo/geocode', (route) => {
      geoCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          result: {
            bbox: '-83.28700,42.25500,-82.91000,42.45000',
            center: { lat: 42.3314, lng: -83.0458 },
            displayName: 'Detroit, MI',
          },
        }),
      });
    });

    await page.route('**/*/api/listings**', (route) => {
      listingsUrls.push(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_LISTINGS),
      });
    });

    await page.goto('/search');
    const input = page.getByPlaceholder('City, ZIP, Address');
    await input.click();
    await input.fill('Detroit, MI');
    await input.press('Enter');

    await expect
      .poll(() => new URL(page.url()).searchParams.get('bbox'), { timeout: 10000 })
      .toBe('-83.28700,42.25500,-82.91000,42.45000');
    expect(aiCalls).toBe(0);
    expect(geoCalls).toBeGreaterThan(0);

    await expect
      .poll(() =>
        listingsUrls.some((u) => {
          try {
            const params = new URL(u).searchParams;
            return (
              params.get('bbox') === '-83.28700,42.25500,-82.91000,42.45000' &&
              !params.has('q')
            );
          } catch {
            return false;
          }
        }),
      { timeout: 10000 },
      )
      .toBeTruthy();

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('AI parse failure falls back to zip extraction and logs warning', async ({ page }) => {
    let aiCalls = 0;
    const consoleWarnings: string[] = [];
    const listingsUrls: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    await page.route('**/*/api/ai/parse-search', (route) => {
      aiCalls += 1;
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      });
    });

    await page.route('**/*/api/geo/geocode', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          result: {
            bbox: '-85.69000,42.94000,-85.62000,42.98000',
            center: { lat: 42.96, lng: -85.65 },
            displayName: 'Grand Rapids, MI 49503',
          },
        }),
      });
    });

    await page.route('**/*/api/listings**', (route) => {
      listingsUrls.push(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_LISTINGS),
      });
    });

    await page.goto('/search');
    const input = page.getByPlaceholder('City, ZIP, Address');
    await input.click();
    await input.fill('49503 under 300k');
    await input.press('Enter');

    // Should still navigate — zip fallback extracts 49503 and geocodes it
    await expect
      .poll(() => page.url(), { timeout: 12000 })
      .toContain('searchToken');

    // AI was called but failed
    expect(aiCalls).toBeGreaterThan(0);

    // The URL should have bbox from zip fallback and postalCodes
    const url = new URL(page.url());
    expect(url.searchParams.get('bbox')).toBe('-85.69000,42.94000,-85.62000,42.98000');
    expect(url.searchParams.get('postalCodes')).toBe('49503');

    // Warnings should have been logged
    await expect
      .poll(() => consoleWarnings.some((w) => w.includes('smartSubmit') || w.includes('non-success')), { timeout: 5000 })
      .toBeTruthy();

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('AI returns empty proposedFilters and logs warning', async ({ page }) => {
    let aiCalls = 0;
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    await page.route('**/*/api/ai/parse-search', (route) => {
      aiCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'req-empty',
          proposedFilters: {},
          explanations: [],
          confidence: 0.1,
          warnings: [],
          ignoredInputReasons: [],
        }),
      });
    });

    await page.route('**/*/api/geo/geocode', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false }),
      });
    });

    await page.route('**/*/api/listings**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_LISTINGS),
      });
    });

    await page.goto('/search');
    const input = page.getByPlaceholder('City, ZIP, Address');
    await input.click();
    await input.fill('something unusual with no filters');
    await input.press('Enter');

    // Should still navigate with searchToken
    await expect
      .poll(() => page.url(), { timeout: 12000 })
      .toContain('searchToken');

    expect(aiCalls).toBeGreaterThan(0);

    // Warning about empty proposedFilters should be logged
    await expect
      .poll(() => consoleWarnings.some((w) => w.includes('proposedFilters is empty')), { timeout: 5000 })
      .toBeTruthy();
  });
});
