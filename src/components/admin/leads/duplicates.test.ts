import { describe, it, expect } from 'vitest';
import type { EnrollmentLead } from '../../../lib/types';
import { findDuplicateLeadIds } from './duplicates';

function lead(
  id: string,
  email: string | null,
  createdAt: string,
): EnrollmentLead {
  return {
    lead_id: id,
    parent_email: email,
    created_at: createdAt,
  } as EnrollmentLead;
}

describe('findDuplicateLeadIds', () => {
  it('flags later leads that share an email, never the first', () => {
    const ids = findDuplicateLeadIds([
      lead('a', 'Maria@Example.com ', '2026-07-01T00:00:00Z'),
      lead('b', 'maria@example.com', '2026-07-05T00:00:00Z'),
      lead('c', 'other@example.com', '2026-07-06T00:00:00Z'),
    ]);
    expect([...ids]).toEqual(['b']);
  });

  it('never treats leads without an email as duplicates of each other', () => {
    const ids = findDuplicateLeadIds([
      lead('a', null, '2026-07-01T00:00:00Z'),
      lead('b', null, '2026-07-05T00:00:00Z'),
    ]);
    expect(ids.size).toBe(0);
  });
});
