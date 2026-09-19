// supabase/functions/_shared/pacificTime.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { pacificToUtc } from './pacificTime.ts';

Deno.test('pacificToUtc: PDT (summer, UTC-7)', () => {
  assertEquals(
    pacificToUtc('2026-09-29', '17:20:00').toISOString(),
    '2026-09-30T00:20:00.000Z',
  );
});

Deno.test('pacificToUtc: PST (winter, UTC-8)', () => {
  assertEquals(
    pacificToUtc('2026-12-01', '17:20:00').toISOString(),
    '2026-12-02T01:20:00.000Z',
  );
});

Deno.test(
  'pacificToUtc: settles correctly on the Sunday daylight saving ends',
  () => {
    assertEquals(
      pacificToUtc('2026-11-01', '09:00:00').toISOString(),
      '2026-11-01T17:00:00.000Z',
    );
  },
);
