// supabase/functions/_shared/booking.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { bookingErrorResponse } from './booking.ts';

const CORS = {
  'Access-Control-Allow-Origin': 'https://example.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

async function checkResponse(
  res: Response,
  expectedStatus: number,
  expectedBody: unknown,
) {
  assertEquals(res.status, expectedStatus);
  assertEquals(await res.json(), expectedBody);
  for (const [key, value] of Object.entries(CORS)) {
    assertEquals(res.headers.get(key), value);
  }
}

Deno.test(
  'bookingErrorResponse: postgres unique violation is slot_taken',
  async () => {
    const res = bookingErrorResponse({ code: '23P01' }, CORS);
    await checkResponse(res, 409, { code: 'slot_taken' });
  },
);

Deno.test(
  'bookingErrorResponse: message slot_taken maps the same way',
  async () => {
    const res = bookingErrorResponse(
      { message: 'duplicate key value: slot_taken' },
      CORS,
    );
    await checkResponse(res, 409, { code: 'slot_taken' });
  },
);

Deno.test('bookingErrorResponse: message date_unavailable', async () => {
  const res = bookingErrorResponse({ message: 'date_unavailable' }, CORS);
  await checkResponse(res, 422, {
    code: 'date_unavailable',
    error: 'This date is not available.',
  });
});

Deno.test('bookingErrorResponse: message slot_mismatch', async () => {
  const res = bookingErrorResponse({ message: 'slot_mismatch' }, CORS);
  await checkResponse(res, 422, {
    code: 'slot_mismatch',
    error: 'That time is for a different program.',
  });
});

Deno.test('bookingErrorResponse: message lead_closed', async () => {
  const res = bookingErrorResponse({ message: 'lead_closed' }, CORS);
  await checkResponse(res, 422, {
    code: 'lead_closed',
    error: 'Reopen this lead before booking a visit.',
  });
});

Deno.test('bookingErrorResponse: message booking_not_found', async () => {
  const res = bookingErrorResponse({ message: 'booking_not_found' }, CORS);
  await checkResponse(res, 404, { code: 'booking_not_found' });
});

Deno.test('bookingErrorResponse: message invalid_booking_request', async () => {
  const res = bookingErrorResponse(
    { message: 'invalid_booking_request' },
    CORS,
  );
  await checkResponse(res, 400, {
    code: 'invalid_booking_request',
    error: 'That booking request was incomplete.',
  });
});

Deno.test(
  'bookingErrorResponse: unknown error is a 500 with cors headers',
  async () => {
    const originalError = console.error;
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      calls.push(args);
    };
    try {
      const res = bookingErrorResponse(new Error('something unexpected'), CORS);
      assertEquals(res.status, 500);
      assertEquals(await res.text(), 'Booking failed');
      for (const [key, value] of Object.entries(CORS)) {
        assertEquals(res.headers.get(key), value);
      }
      assertEquals(calls.length, 1);
    } finally {
      console.error = originalError;
    }
  },
);
