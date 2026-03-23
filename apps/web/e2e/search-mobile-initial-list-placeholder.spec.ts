import { expect, test } from '@playwright/test';

test('mobile search loads list initially and shows filter search placeholder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/search');
  await page.waitForLoadState('domcontentloaded');

  await expect(page.getByTestId('listing-card-item').first()).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: 'Filters' }).click();
  const searchInput = page
    .getByRole('dialog', { name: 'Filters' })
    .getByTestId('search-pill-input');
  await expect(searchInput).toBeVisible();
  await expect(searchInput).toHaveAttribute('placeholder', 'City, ZIP, Address');
});
