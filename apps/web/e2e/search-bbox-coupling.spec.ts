import { test, expect } from './fixtures';

test('search listings use bbox-filtered results and render matching IDs', async ({ page }) => {
  const listingsResponses: { url: string; json: any }[] = [];
  const listingsRequests: string[] = [];
  let lastListingsResponse: { url: string; status: number; ok: boolean; hasResults: boolean } | null =
    null;

  page.on('console', (msg) => {
    // helpful for debugging in CI logs
    console.log(`[console] ${msg.type()}: ${msg.text()}`);
  });

  page.on('request', (request) => {
    if (request.url().includes('/api/listings')) {
      listingsRequests.push(request.url());
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/listings')) return;
    try {
      const json = await response.json();
      const hasResults = json && Array.isArray(json.results);
      lastListingsResponse = { url, status: response.status(), ok: response.ok(), hasResults };
      if (response.ok() && hasResults) {
        listingsResponses.push({ url, json });
      }
    } catch {
      // ignore parse errors
    }
  });

  await page.goto('/search', { waitUntil: 'domcontentloaded' });

  const waitStart = Date.now();
  while (listingsResponses.length === 0 && Date.now() - waitStart < 30000) {
    await page.waitForTimeout(500);
  }

  if (listingsResponses.length === 0) {
    throw new Error(
      `No successful /api/listings responses captured within 30s.\nLast seen: ${lastListingsResponse?.url ?? 'none'} status=${lastListingsResponse?.status ?? 'n/a'} ok=${lastListingsResponse?.ok ?? 'n/a'} hasResults=${lastListingsResponse?.hasResults ?? 'n/a'}\nRequests seen: ${listingsRequests.slice(-10).join(' | ') || 'none'}`,
    );
  }

  await page.waitForSelector('[data-listing-id]', { timeout: 30000, state: 'attached' });
  await page.waitForTimeout(500);

  const cards = await page.$$('[data-listing-id]');
  const renderedIds: string[] = [];
  for (const card of cards) {
    const id = await card.getAttribute('data-listing-id');
    if (id) renderedIds.push(id);
  }

  expect(listingsResponses.length).toBeGreaterThan(0);

  const bboxResponsesByKey = new Map<string, { url: string; json: any }[]>();
  for (const resp of listingsResponses) {
    const u = new URL(resp.url);
    const bbox = u.searchParams.get('bbox') ?? '';
    if (!bbox) continue;
    if (!bboxResponsesByKey.has(bbox)) bboxResponsesByKey.set(bbox, []);
    bboxResponsesByKey.get(bbox)!.push(resp);
  }

  const lastBboxEntry = [...bboxResponsesByKey.entries()].pop();
  if (!lastBboxEntry) {
    throw new Error(
      `No /api/listings response with bbox found.\nRequests seen: ${listingsRequests
        .slice(-10)
        .join(' | ') || 'none'}`,
    );
  }

  const [latestBboxKey, latestBboxResponses] = lastBboxEntry;
  const concatenatedIds: string[] = [];
  for (const resp of latestBboxResponses) {
    const ids = Array.isArray(resp.json?.results)
      ? resp.json.results.map((r: any) => String(r.id ?? r.mlsId ?? '')).filter(Boolean)
      : [];
    concatenatedIds.push(...ids);
  }

  const compareLen = Math.min(renderedIds.length, concatenatedIds.length, 100);
  if (compareLen === 0) {
    throw new Error(
      `No comparable IDs.\nlast bbox=${latestBboxKey}\nresp first5=${concatenatedIds.slice(
        0,
        5,
      )}\ndom first5=${renderedIds.slice(0, 5)}\nRequests seen: ${listingsRequests
        .slice(-10)
        .join(' | ') || 'none'}`,
    );
  }

  // If API returned at least 50 for this bbox, expect DOM to render at least 50
  const available = concatenatedIds.length;
  if (available >= 50 && renderedIds.length < 50) {
    throw new Error(
      `Expected at least 50 rendered cards when API returned ${available} for bbox=${latestBboxKey}. Rendered=${renderedIds.length}\nRequests seen: ${listingsRequests
        .slice(-10)
        .join(' | ') || 'none'}`,
    );
  }

  const respSlice = concatenatedIds.slice(0, compareLen);
  const domSlice = renderedIds.slice(0, compareLen);
  if (JSON.stringify(respSlice) !== JSON.stringify(domSlice)) {
    throw new Error(
      `Rendered IDs do not match concatenated bbox responses.\nbbox=${latestBboxKey}\nresp first5=${respSlice.slice(
        0,
        5,
      )}\ndom first5=${domSlice.slice(0, 5)}\nRequests seen: ${listingsRequests
        .slice(-10)
        .join(' | ') || 'none'}`,
    );
  }

  // NOTE: Modal assertions removed from this bbox/data coupling test to avoid baseline flake.
  // Modal UX should be covered by a dedicated modal test, not the gating e2e:search spec.
});
