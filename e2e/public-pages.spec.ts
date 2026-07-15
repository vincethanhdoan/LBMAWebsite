import { test, expect } from '@playwright/test';

test('locked home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /LOS BANOS/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /contact/i })).toBeVisible();
});

test('an unknown public route redirects home', async ({ page }) => {
  await page.goto('/programs');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /LOS BANOS/i })).toBeVisible();
});
