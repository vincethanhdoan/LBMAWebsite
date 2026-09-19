import { supabase } from './client';
import type { AppointmentSlot } from '../types';

// A leaf module: only `client.ts` and plain types below it, no `selects.ts` or
// the rest of `queries.ts`. It exists so the public booking graph
// (TrialVisitStep, VisitPicker) can reach these two reads without pulling the
// whole portal read layer into the eager entry bundle. `queries.ts`
// re-exports both so every existing portal import keeps working unchanged.

export async function getAppointmentSlots(
  programType?: 'little_dragons' | 'youth',
): Promise<AppointmentSlot[]> {
  let query = supabase
    .from('appointment_slots')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week');

  if (programType) {
    query = query.in('program_type', [programType, 'all']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingBookableDates(
  slotId: string,
  weeksAhead = 20,
  includeToday = false,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_upcoming_bookable_dates', {
    p_slot_id: slotId,
    p_weeks_ahead: weeksAhead,
    p_include_today: includeToday,
  });
  if (error) throw error;
  return (data ?? []).map(
    (row: { available_date: string }) => row.available_date,
  );
}
