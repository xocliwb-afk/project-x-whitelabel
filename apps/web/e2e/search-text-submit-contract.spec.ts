import { expect, test } from '@playwright/test';

const EMPTY_LISTINGS = {
  results: [],
  pagination: { page: 1, limit: 50, pageCount: 1, hasMore: false },
};

// Shared route stubs used across tests
function stubRoutes(page: import('@playwright/test').Page, listingsUrls: string[]) {
  return Promise.all([
    page.route('**/*/api/ai/parse-search', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requestId: 'req-stub',
          proposedFilters: {},
          explanations: [],
          confidence: 0.9,
          warnings: [],
          ignoredInputReasons: [],
        }),
      });
    }),
    page.route('**/*/api/geo/geocode', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          result: {
            bbox: '-85.69000,42.94000,-85.62000,42.98000',
            center: { lat: 42.96, lng: -85.65 },
            displayName: 'Grand Rapids, MI',
          },
        }),
      });
    }),
    page.route('**/*/api/listings**', (route) => {
      listingsUrls.push(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_LISTINGS),
      });
    }),
  ]);
}

test.describe('Text-search submit contract', () => {
  test('mobile drawer: typing alone does NOT mutate URL q or trigger searchToken', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const listingsUrls: string[] = [];
    await stubRoutes(page, listingsUrls);

    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Record the URL after initial load settles
    await page.waitForTimeout(1500);
    const urlBeforeTyping = page.url();
    const listingsCountBefore = listingsUrls.length;

    // Open the filter drawer
    await page.getByRole('button', { name: 'Filters' }).click();
    const drawer = page.getByRole('dialog', { name: 'Filters' });
    await expect(drawer).toBeVisible();

    // Type in the omnibox inside the drawer but do NOT submit
    const input = drawer.getByTestId('search-pill-input');
    await input.click();
    await input.fill('Grand Rapids');

    // Wait longer than the old debounce (500ms) to ensure no async URL update fires
    await page.waitForTimeout(1200);

    // URL should NOT have changed
    const urlAfterTyping = page.url();
    expect(new URL(urlAfterTyping).searchParams.has('q')).toBe(false);

    // No new listings fetches triggered by typing alone
    const listingsCountAfter = listingsUrls.length;
    expect(listingsCountAfter).toBe(listingsCountBefore);

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('mobile drawer: explicit Search button triggers one meaningful submit', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const listingsUrls: string[] = [];
    await stubRoutes(page, listingsUrls);

    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Open the filter drawer
    await page.getByRole('button', { name: 'Filters' }).click();
    const drawer = page.getByRole('dialog', { name: 'Filters' });
    await expect(drawer).toBeVisible();

    const input = drawer.getByTestId('search-pill-input');
    await input.click();
    await input.fill('Grand Rapids');

    // Click the explicit search submit button
    const submitBtn = drawer.getByTestId('search-submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // URL should now contain q and searchToken
    await expect
      .poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 10000 })
      .toBe('Grand Rapids');
    expect(new URL(page.url()).searchParams.get('searchToken')).not.toBeNull();
    expect(new URL(page.url()).searchParams.get('bbox')).toBe(
      '-85.69000,42.94000,-85.62000,42.98000',
    );

    // At least one listings fetch should have fired after submit
    await expect
      .poll(
        () =>
          listingsUrls.some((u) => {
            try {
              return new URL(u).searchParams.get('bbox') === '-85.69000,42.94000,-85.62000,42.98000';
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

  test('desktop: Enter and Search button both use the same submit path', async ({ page }) => {
    const listingsUrls: string[] = [];
    await stubRoutes(page, listingsUrls);

    await page.goto('/search');
    const input = page.getByTestId('search-pill-input');

    // Submit via Enter
    await input.click();
    await input.fill('Grand Rapids');
    await input.press('Enter');

    await expect
      .poll(() => new URL(page.url()).searchParams.get('bbox'), { timeout: 10000 })
      .toBe('-85.69000,42.94000,-85.62000,42.98000');

    const urlAfterEnter = page.url();
    const tokenAfterEnter = new URL(urlAfterEnter).searchParams.get('searchToken');
    expect(tokenAfterEnter).not.toBeNull();

    // Clear and submit via button
    await input.click();
    await input.fill('Grand Rapids');
    const submitBtn = page.getByTestId('search-submit-btn');
    await submitBtn.click();

    await expect
      .poll(() => {
        const token = new URL(page.url()).searchParams.get('searchToken');
        return token !== null && token !== tokenAfterEnter;
      }, { timeout: 10000 })
      .toBeTruthy();

    // Both paths should produce bbox in the URL
    expect(new URL(page.url()).searchParams.get('bbox')).toBe(
      '-85.69000,42.94000,-85.62000,42.98000',
    );

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('direct URL load with ?q= and no searchToken performs one-time smartSubmit handoff', async ({
    page,
  }) => {
    const listingsUrls: string[] = [];
    await stubRoutes(page, listingsUrls);

    // Navigate directly with q= but no searchToken
    await page.goto('/search?q=Grand+Rapids');

    // The handoff should add bbox and searchToken
    await expect
      .poll(() => new URL(page.url()).searchParams.get('bbox'), { timeout: 12000 })
      .toBe('-85.69000,42.94000,-85.62000,42.98000');
    expect(new URL(page.url()).searchParams.get('searchToken')).not.toBeNull();

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });

  test('mobile drawer: closing after typing without submitting does NOT mutate URL', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const listingsUrls: string[] = [];
    await stubRoutes(page, listingsUrls);

    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const urlBefore = page.url();
    const countBefore = listingsUrls.length;

    // Open drawer, type, close without submitting
    await page.getByRole('button', { name: 'Filters' }).click();
    const drawer = page.getByRole('dialog', { name: 'Filters' });
    await expect(drawer).toBeVisible();
    await drawer.getByTestId('search-pill-input').fill('Byron Center');
    await page.waitForTimeout(800);

    // Close the drawer via the close button
    await page.getByRole('button', { name: 'Close filters' }).click();
    await expect(drawer).not.toBeVisible();

    await page.waitForTimeout(500);

    // URL unchanged
    expect(page.url()).toBe(urlBefore);
    // No new fetches
    expect(listingsUrls.length).toBe(countBefore);

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });
});
