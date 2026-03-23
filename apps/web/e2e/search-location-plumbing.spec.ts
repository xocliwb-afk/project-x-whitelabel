import { expect, test } from '@playwright/test';

const BBOX = '-86.74854,42.3342,-84.58548,43.58561';

function last10(urls: string[]) {
  return urls.slice(-10).join('\n') || 'none';
}

async function attachLast10(urls: string[]) {
  await test.info().attach('last_api_listings_urls', {
    body: last10(urls),
    contentType: 'text/plain',
  });
}

test.skip('location plumbing: cities + postalCodes propagate to list (50) and pins (500)', async ({ page }) => {
  // Track /api/listings URLs
  let listingsUrls: string[] = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/api/listings')) listingsUrls.push(u);
  });

  // 1) Load search with bbox + searchToken seed so a fetch MUST occur
  await page.goto(`/search?bbox=${encodeURIComponent(BBOX)}&searchToken=seed`);
  await page.waitForLoadState('domcontentloaded');

  // 2) Wait for the first list response (limit=50). If it times out, attach URLs and fail.
  let initialJson: any;
  try {
    const resp = await page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().includes('/api/listings') &&
        r.url().includes('limit=50'),
      { timeout: 30000 },
    );
    initialJson = await resp.json();
  } catch (e) {
    await attachLast10(listingsUrls);
    throw e;
  }

  // 3) Extract REAL city + zip from first result. If missing/invalid, attach URLs and fail.
  const first = initialJson?.results?.[0];
  const city = first?.address?.city;
  const zip = first?.address?.zip;

  if (typeof city !== 'string' || city.trim().length === 0) {
    await attachLast10(listingsUrls);
    throw new Error('Missing city in initial results; cannot run deterministic test.');
  }
  if (typeof zip !== 'string' || !/^\d{5}$/.test(zip.trim())) {
    await attachLast10(listingsUrls);
    throw new Error('Missing valid 5-digit zip in initial results; cannot run deterministic test.');
  }

  // Reset tracking so we only measure AFTER applying filters
  listingsUrls = [];

  // 4) Navigate to city-filtered URL (bump searchToken), then REQUIRE both list+pin requests contain cities and limits.
  const cityToken = Date.now().toString();
  await page.goto(
    `/search?bbox=${encodeURIComponent(BBOX)}&searchToken=${cityToken}&cities=${encodeURIComponent(city)}`,
  );
  await page.waitForLoadState('domcontentloaded');

  try {
    await expect
      .poll(() => listingsUrls.some((u) => u.includes('cities=') && u.includes('limit=50')), { timeout: 20000 })
      .toBeTruthy();
    await expect
      .poll(() => listingsUrls.some((u) => u.includes('cities=') && u.includes('limit=500')), { timeout: 20000 })
      .toBeTruthy();
  } catch (e) {
    await attachLast10(listingsUrls);
    throw e;
  }

  // 5) Validate list results for city: first 10 results must match city exactly.
  let cityJson: any;
  try {
    const resp = await page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().includes('/api/listings') &&
        r.url().includes('cities=') &&
        r.url().includes('limit=50'),
      { timeout: 30000 },
    );
    cityJson = await resp.json();
  } catch (e) {
    await attachLast10(listingsUrls);
    throw e;
  }

  const cityResults: any[] = cityJson?.results ?? [];
  const mismatchCity = cityResults.slice(0, 10).find((r) => r?.address?.city !== city);
  if (mismatchCity) {
    await attachLast10(listingsUrls);
    throw new Error(`City filter mismatch: expected first results city === "${city}"`);
  }

  // Reset tracking for zip phase
  listingsUrls = [];

  // 6) Navigate to zip-filtered URL (bump searchToken), then REQUIRE both list+pin requests contain postalCodes and limits.
  const zipToken = (Date.now() + 1).toString();
  await page.goto(
    `/search?bbox=${encodeURIComponent(BBOX)}&searchToken=${zipToken}&postalCodes=${encodeURIComponent(zip)}`,
  );
  await page.waitForLoadState('domcontentloaded');

  try {
    await expect
      .poll(() => listingsUrls.some((u) => u.includes('postalCodes=') && u.includes('limit=50')), { timeout: 20000 })
      .toBeTruthy();
    await expect
      .poll(() => listingsUrls.some((u) => u.includes('postalCodes=') && u.includes('limit=500')), { timeout: 20000 })
      .toBeTruthy();
  } catch (e) {
    await attachLast10(listingsUrls);
    throw e;
  }

  // 7) Validate list results for zip: first 10 results must match zip exactly.
  let zipJson: any;
  try {
    const resp = await page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().includes('/api/listings') &&
        r.url().includes('postalCodes=') &&
        r.url().includes('limit=50'),
      { timeout: 30000 },
    );
    zipJson = await resp.json();
  } catch (e) {
    await attachLast10(listingsUrls);
    throw e;
  }

  const zipResults: any[] = zipJson?.results ?? [];
  const mismatchZip = zipResults.slice(0, 10).find((r) => r?.address?.zip !== zip);
  if (mismatchZip) {
    await attachLast10(listingsUrls);
    throw new Error(`Zip filter mismatch: expected first results zip === "${zip}"`);
  }

  // Always attach last 10 for evidence
  await attachLast10(listingsUrls);
});
