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

// Most parents open this form on a phone. The calendar is the widest thing on
// the page, so it is what would push the page sideways; this books nothing.
test('the calendar fits a 360px phone screen without scrolling sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await page.locator('#child-age-0').fill('8');
  await expect(page.getByRole('grid')).toBeVisible({ timeout: 15_000 });

  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.inner);
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

  // Capture the booking RPC's own request and response, both registered
  // before the click. The request carries the same supabaseUrl/anon key the
  // cleanup call below needs, straight from what the app actually sent. The
  // response carries every booked visit's token: cleanup reads it from here,
  // not from the confirmation panel, so a UI assertion failing after the
  // booking has already committed server-side can never suppress cleanup.
  const [rpcRequest, rpcResponse] = await Promise.all([
    page.waitForRequest((req) =>
      req.url().includes('/rest/v1/rpc/submit_trial_booking'),
    ),
    page.waitForResponse((res) =>
      res.url().includes('/rest/v1/rpc/submit_trial_booking'),
    ),
    page.locator('button[type="submit"]').click(),
  ]);
  const supabaseUrl = rpcRequest.url().split('/rest/v1/rpc/')[0];
  const anonKey = rpcRequest.headers()['apikey'] ?? '';

  const bookingTokens: string[] = [];
  try {
    const body = (await rpcResponse.json()) as {
      visits?: Array<{ booking_token?: unknown }>;
    };
    for (const visit of body.visits ?? []) {
      if (typeof visit.booking_token === 'string' && visit.booking_token) {
        bookingTokens.push(visit.booking_token);
      }
    }
  } catch {
    // Non-2xx or unparseable response body: leave bookingTokens empty.
    // Cleanup below warns rather than throwing, so the real test failure
    // (if any) still surfaces.
  }

  try {
    await expect(
      page.getByRole('heading', { name: "You're booked" }),
    ).toBeVisible({ timeout: 15_000 });

    const changeLink = page
      .getByRole('link', { name: /View or change this visit/ })
      .first();
    await expect(changeLink).toBeVisible();
  } finally {
    if (bookingTokens.length > 0 && supabaseUrl && anonKey) {
      for (const token of bookingTokens) {
        try {
          const res = await page.request.post(
            `${supabaseUrl}/functions/v1/book-appointment`,
            {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
              },
              data: { token, action: 'cancel' },
            },
          );
          if (!res.ok()) {
            console.warn(
              `cleanup: book-appointment cancel returned ${res.status()} for token ${token}`,
            );
          }
        } catch (err) {
          console.warn(
            `cleanup: failed to cancel the booked visit for token ${token}`,
            err,
          );
        }
      }
    } else {
      console.warn(
        'cleanup: no booking tokens or supabase credentials captured; the slot(s) were not freed',
      );
    }
  }
});
