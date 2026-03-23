import { test as base, expect } from '@playwright/test';

const makeRingBuffer = <T>(limit: number) => {
  const arr: T[] = [];
  return {
    push(item: T) {
      arr.push(item);
      if (arr.length > limit) arr.shift();
    },
    values() {
      return [...arr];
    },
  };
};

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({
      content: `
        * , *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; scroll-behavior: auto !important; }
      `,
    });

    const listingsRing = makeRingBuffer<string>(10);
    page.on('request', (request) => {
      if (request.url().includes('/api/listings')) {
        listingsRing.push(request.url());
      }
    });

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) {
      const urls = listingsRing.values();
      console.log(
        `[e2e] last /api/listings requests (${urls.length}): ${urls.join(' | ') || 'none'}`,
      );
    }
  },
});

export { expect };
