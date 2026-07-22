import { test, expect } from '@playwright/test';

test('empty submit shows a field error and stays on the form', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#parentName')).toBeVisible();
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#parent-name-error')).toBeVisible();
  // Still on the form: the success status region has not appeared.
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('a valid submission reaches the success state', async ({ page }) => {
  await page.goto('/');
  await page.locator('#parentName').fill('E2E Smoke Parent');
  await page.locator('#phone').fill('(209) 555-0123');
  await page.locator('#parentEmail').fill(`e2e-${Date.now()}@example.com`);
  await page.locator('#child-name-0').fill('Smoke Child');
  await page.locator('#child-age-0').fill('8');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 });
});
