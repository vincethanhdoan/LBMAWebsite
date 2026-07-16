// Shared lead-status recalculation used by every booking edge function.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type BookingStatus = { status: string };

// Recomputes enrollment_leads.status from a lead's program bookings, counting
// only ACTIVE (non-cancelled) bookings. A cancelled booking must not drag a
// lead back to 'approved' while another visit is still live. Returns true when
// the lead is fully booked (every active booking is scheduled or confirmed);
// callers use that to send the booking-confirmation email.
//
// Pass `bookings` to reuse an already-fetched, up-to-date set and skip the
// query — the caller is responsible for reflecting any writes it just made.
export async function recalculateLeadStatus(
  supabase: SupabaseClient,
  leadId: string,
  bookings?: BookingStatus[],
): Promise<boolean> {
  let rows = bookings;
  if (!rows) {
    const { data } = await supabase
      .from('enrollment_lead_program_bookings')
      .select('status')
      .eq('lead_id', leadId);
    rows = data ?? [];
  }

  if (rows.length === 0) return false;

  const active = rows.filter((b) => b.status !== 'cancelled');
  const allScheduledOrConfirmed =
    active.length > 0 &&
    active.every((b) => b.status === 'scheduled' || b.status === 'confirmed');
  const allConfirmed =
    active.length > 0 && active.every((b) => b.status === 'confirmed');

  const leadStatus = allConfirmed
    ? 'appointment_confirmed'
    : allScheduledOrConfirmed
      ? 'appointment_scheduled'
      : 'approved';

  await supabase
    .from('enrollment_leads')
    .update({ status: leadStatus })
    .eq('lead_id', leadId);

  return allScheduledOrConfirmed;
}
