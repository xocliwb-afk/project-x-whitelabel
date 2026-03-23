import { expect, test } from '@playwright/test';

const SMALL_BBOX = '-85.73302,42.92583,-85.60318,43.00095';

const waitForListingsResponse = async (page: any, predicate: (url: string) => boolean) => {
  const resp = await page.waitForResponse(
    (r: any) => r.url().includes('/api/listings') && r.request().method() === 'GET' && predicate(r.url()),
    { timeout: 15000 },
  );
  const json = await resp.json();
  return { url: resp.url(), json } as { url: string; json: any };
};

test.describe('Location chips trigger filters', () => {
  test('clicking city chip sets URL and triggers filtered fetch', async ({ page }) => {
    let listingsUrls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/listings')) {
        listingsUrls.push(req.url());
      }
    });

    await page.goto(`/search?bbox=${encodeURIComponent(SMALL_BBOX)}&searchToken=seed-clicks`);
    await page.waitForLoadState('domcontentloaded');

    const initial = await waitForListingsResponse(page, (u) => u.includes('limit=50'));
    const first = initial.json?.results?.[0];
    const city: string | undefined = first?.address?.city;
    if (!city) {
      test.fail(true, 'No city found in initial results');
      return;
    }

    listingsUrls = [];

    const cityChip = page.getByTestId('chip-city').first();
    await expect(cityChip).toBeAttached({ timeout: 10000 });
    await cityChip.evaluate((el: HTMLElement) => el.click());
    const urlBefore = page.url();

    await expect.poll(() => page.url(), { timeout: 8000 }).not.toBe(urlBefore);
    await expect.poll(() => page.url(), { timeout: 8000 }).toContain('cities=');
    await expect
      .poll(
        () => listingsUrls.some((u) => u.includes('cities=') && u.includes('limit=50')),
        { timeout: 12000 },
      )
      .toBeTruthy();

    const cityResp = await waitForListingsResponse(page, (u) => u.includes('cities=') && u.includes('limit=50'));
    const cityResults: any[] = cityResp.json?.results ?? [];
    const mismatch = cityResults.slice(0, 10).find((r) => r?.address?.city !== city);
    if (mismatch) {
      const last10 = listingsUrls.slice(-10).join('\n') || 'none';
      await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
      throw new Error(`City filter mismatch: expected ${city}`);
    }

    const last10 = listingsUrls.slice(-10).join('\n') || 'none';
    await test.info().attach('last_api_listings_urls', { body: last10, contentType: 'text/plain' });
  });
});
