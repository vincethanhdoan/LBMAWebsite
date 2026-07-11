import { useState } from 'react';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { edgeFunctionUserAuthHeaders, supabase } from '../../../lib/supabase/client';
import { queryKeys } from '../../../lib/queryKeys';
import type { EnrollmentLead } from '../../../lib/types';
import { PROGRAM_LABELS } from './leadDisplay';

export function useLeadActions({ onError }: { onError: (msg: string) => void }) {
  const queryClient = useQueryClient();
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  async function approve(lead: EnrollmentLead) {
    if (busyLeadId) return;
    setBusyLeadId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { onError('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('approve-enrollment-lead', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) { onError('Failed to send approval'); return; }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Approval sent');
    } finally {
      setBusyLeadId(null);
    }
  }

  async function resendBookingLink(lead: EnrollmentLead) {
    if (busyLeadId) return;
    setBusyLeadId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { onError('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('resend-booking-link', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) { onError('Failed to resend booking link'); return; }
      toast.success('Booking link resent');
    } finally {
      setBusyLeadId(null);
    }
  }

  async function deny(leadId: string, message: string): Promise<boolean> {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { onError('Session expired. Please sign in again.'); return false; }
    const { error } = await supabase.functions.invoke('deny-enrollment-lead', {
      body: { leadId, message },
      headers: fnHeaders,
    });
    if (error) { onError('Failed to send denial'); return false; }
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    return true;
  }

  async function bookAppointments(
    lead: EnrollmentLead,
    bookings: Array<{ programBookingId: string; slotId: string; appointmentDate: string }>
  ): Promise<boolean> {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) { onError('Session expired. Please sign in again.'); return false; }

    let failedProgram: string | null = null;
    let slotTaken = false;
    for (const b of bookings) {
      const { data, error } = await supabase.functions.invoke('admin-book-appointment', {
        body: { programBookingId: b.programBookingId, slotId: b.slotId, appointmentDate: b.appointmentDate },
        headers: fnHeaders,
      });
      if (error || !data) {
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          if (body?.code === 'slot_taken') { slotTaken = true; break; }
        }
        const programType = lead.programBookings.find(pb => pb.booking_id === b.programBookingId)?.program_type;
        failedProgram = programType ? PROGRAM_LABELS[programType] : 'This';
        break;
      }
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });

    if (slotTaken) {
      onError('That time was just taken. Please pick another date.');
      return true;
    }

    if (failedProgram) {
      onError(`${failedProgram} appointment could not be booked — the other bookings were saved. Please try again.`);
      return false;
    }

    toast.success('Appointment(s) booked');
    return true;
  }

  async function sendReminder(lead: EnrollmentLead) {
    setSendingReminderId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) { onError('Session expired. Please sign in again.'); return; }
      const { error } = await supabase.functions.invoke('send-appointment-reminder', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 409) {
          onError('Confirmation email already sent or queued');
        } else {
          onError('Failed to send confirmation email');
        }
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Confirmation email sent');
    } finally {
      setSendingReminderId(null);
    }
  }

  return { approve, resendBookingLink, deny, bookAppointments, sendReminder, busyLeadId, sendingReminderId };
}
