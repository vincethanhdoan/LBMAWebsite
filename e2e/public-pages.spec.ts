import { test, expect } from '@playwright/test';

test('home page renders the trial form', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /special offer trial/i }),
  ).toBeVisible();
  await expect(page.locator('#parentName')).toBeVisible();
});

test('the old contact path redirects home', async ({ page }) => {
  await page.goto('/contact');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#parentName')).toBeVisible();
});

test('an unknown public route redirects home', async ({ page }) => {
  await page.goto('/programs');
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: /special offer trial/i }),
  ).toBeVisible();
});
