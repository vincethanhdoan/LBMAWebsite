import { test, expect } from '@playwright/test';

function randomDigits(count: number): string {
  let digits = '';
  for (let i = 0; i < count; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

// Area code 209 (Los Banos) plus seven random digits: a fresh, valid US
// phone number every run, so the server's per-phone rate limit and
// one-upcoming-visit-per-program rule never see a repeat.
function uniquePhone(): string {
  return `209${randomDigits(7)}`;
}

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${randomDigits(4)}@example.com`;
}

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

// A valid submission now books a visit, not just files an inquiry, so this
// test also has to pick a day and a time on the calendar and then undo the
// booking afterward. Otherwise every CI run against staging would
// permanently consume one slot, and eventually drain every open date.
//
// Cleanup cancels the program booking through the public book-appointment
// endpoint (the same one the "View or change this visit" link uses), which
// frees the slot for the next family. It does not delete the lead row
// itself: that needs a service-role key the e2e job does not have, so a
// cancelled-but-not-deleted lead is the expected trace this test leaves in
// staging.
test('a valid submission books a visit and frees the slot on cleanup', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#parentName').fill('E2E Smoke Parent');
  await page.locator('#phone').fill(uniquePhone());
  await page.locator('#parentEmail').fill(uniqueEmail());
  await page.locator('#child-name-0').fill('Smoke Child');
  await page.locator('#child-age-0').fill('8');

  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible({ timeout: 15_000 });

  let dayButtons = grid.getByRole('button', { disabled: false });
  if ((await dayButtons.count()) === 0) {
    await page.getByRole('button', { name: 'Go to the Next Month' }).click();
    dayButtons = grid.getByRole('button', { disabled: false });
  }
  await expect(dayButtons.first()).toBeVisible();
  await dayButtons.first().click();

  const timeButton = page.getByRole('button', { name: /^Arrive at/ }).first();
  await expect(timeButton).toBeVisible();
  await timeButton.click();

  // Capture the booking RPC's own request instead of hardcoding the staging
  // URL or key: it carries the same supabaseUrl/anon key the cleanup call
  // below needs, straight from what the app actually sent.
  const [rpcRequest] = await Promise.all([
    page.waitForRequest((req) =>
      req.url().includes('/rest/v1/rpc/submit_trial_booking'),
    ),
    page.locator('button[type="submit"]').click(),
  ]);
  const supabaseUrl = rpcRequest.url().split('/rest/v1/rpc/')[0];
  const anonKey = rpcRequest.headers()['apikey'] ?? '';

  let bookingToken = '';
  try {
    await expect(
      page.getByRole('heading', { name: "You're booked" }),
    ).toBeVisible({ timeout: 15_000 });

    const changeLink = page
      .getByRole('link', { name: /View or change this visit/ })
      .first();
    await expect(changeLink).toBeVisible();
    const href = await changeLink.getAttribute('href');
    bookingToken = href?.match(/\/book\/([^/?#]+)/)?.[1] ?? '';
    expect(bookingToken).not.toBe('');
  } finally {
    if (bookingToken && supabaseUrl && anonKey) {
      try {
        const res = await page.request.post(
          `${supabaseUrl}/functions/v1/book-appointment`,
          {
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
            data: { token: bookingToken, action: 'cancel' },
          },
        );
        if (!res.ok()) {
          console.warn(
            `cleanup: book-appointment cancel returned ${res.status()} for token ${bookingToken}`,
          );
        }
      } catch (err) {
        console.warn('cleanup: failed to cancel the booked visit', err);
      }
    } else {
      console.warn(
        'cleanup: no booking token or supabase credentials captured; the slot was not freed',
      );
    }
  }
});
