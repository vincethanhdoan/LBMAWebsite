import { test, expect } from '@playwright/test';

test('the portal route shows the login gate', async ({ page }) => {
  await page.goto('/portal');
  await expect(
    page.getByRole('heading', { name: 'Member Portal Login' }),
  ).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page).toHaveURL(/\/portal$/);
});
