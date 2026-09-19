import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Families and the public book up to three weeks ahead; staff keep the longer
// window. The SQL function trusts these values, so they are set here and never
// read from the request.
export const FAMILY_HORIZON_DAYS = 21;
export const STAFF_HORIZON_DAYS = 140;

export type BookingResult = {
  status: 'scheduled' | 'confirmed';
  appointment_date: string;
  appointment_time: string;
  lead_id: string;
};

export async function bookProgramAppointment(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    slotId: string;
    appointmentDate: string;
    allowToday: boolean;
    horizonDays: number;
    actor: string | null;
  },
): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('book_program_appointment', {
    p_booking_id: input.bookingId,
    p_slot_id: input.slotId,
    p_date: input.appointmentDate,
    p_allow_today: input.allowToday,
    p_horizon_days: input.horizonDays,
    p_actor: input.actor,
  });
  if (error) throw error;
  return data as BookingResult;
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Maps the named errors raised by book_program_appointment to HTTP responses.
export function bookingErrorResponse(
  error: unknown,
  cors: Record<string, string>,
): Response {
  const { code, message } = (error ?? {}) as {
    code?: string;
    message?: string;
  };
  if (code === '23P01' || message?.includes('slot_taken'))
    return json({ code: 'slot_taken' }, 409, cors);
  if (message?.includes('date_unavailable'))
    return json(
      { code: 'date_unavailable', error: 'This date is not available.' },
      422,
      cors,
    );
  if (message?.includes('slot_mismatch'))
    return json(
      { code: 'slot_mismatch', error: 'That time is for a different program.' },
      422,
      cors,
    );
  if (message?.includes('lead_closed'))
    return json(
      {
        code: 'lead_closed',
        error: 'Reopen this lead before booking a visit.',
      },
      422,
      cors,
    );
  if (message?.includes('booking_not_found'))
    return json({ code: 'booking_not_found' }, 404, cors);
  if (message?.includes('invalid_booking_request'))
    return json(
      {
        code: 'invalid_booking_request',
        error: 'That booking request was incomplete.',
      },
      400,
      cors,
    );
  console.error('[booking] unexpected error:', error);
  return new Response('Booking failed', { status: 500, headers: cors });
}
