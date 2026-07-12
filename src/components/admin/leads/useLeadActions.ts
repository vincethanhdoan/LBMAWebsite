import { useState } from 'react';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  edgeFunctionUserAuthHeaders,
  supabase,
} from '../../../lib/supabase/client';
import { queryKeys } from '../../../lib/queryKeys';
import type { EnrollmentLead } from '../../../lib/types';
import { PROGRAM_LABELS } from './leadDisplay';

export function useLeadActions({
  onError,
}: {
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [busyLeadIds, setBusyLeadIds] = useState<Set<string>>(new Set());
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(
    null,
  );

  function markBusy(leadId: string) {
    setBusyLeadIds((s) => {
      const next = new Set(s);
      next.add(leadId);
      return next;
    });
  }

  function clearBusy(leadId: string) {
    setBusyLeadIds((s) => {
      const next = new Set(s);
      next.delete(leadId);
      return next;
    });
  }

  async function approve(lead: EnrollmentLead) {
    if (busyLeadIds.has(lead.lead_id)) return;
    markBusy(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return;
      }
      const { error } = await supabase.functions.invoke(
        'approve-enrollment-lead',
        {
          body: { leadId: lead.lead_id },
          headers: fnHeaders,
        },
      );
      if (error) {
        onError('Failed to send approval');
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Approval sent');
    } finally {
      clearBusy(lead.lead_id);
    }
  }

  async function resendBookingLink(lead: EnrollmentLead) {
    if (busyLeadIds.has(lead.lead_id)) return;
    markBusy(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return;
      }
      const { error } = await supabase.functions.invoke('resend-booking-link', {
        body: { leadId: lead.lead_id },
        headers: fnHeaders,
      });
      if (error) {
        onError('Failed to resend booking link');
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast.success('Booking link resent');
    } finally {
      clearBusy(lead.lead_id);
    }
  }

  async function deny(leadId: string, message: string): Promise<boolean> {
    markBusy(leadId);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return false;
      }
      const { error } = await supabase.functions.invoke(
        'deny-enrollment-lead',
        {
          body: { leadId, message },
          headers: fnHeaders,
        },
      );
      if (error) {
        onError('Failed to send denial');
        return false;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      return true;
    } finally {
      clearBusy(leadId);
    }
  }

  async function bookAppointments(
    lead: EnrollmentLead,
    bookings: Array<{
      programBookingId: string;
      slotId: string;
      appointmentDate: string;
    }>,
  ): Promise<boolean> {
    markBusy(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return false;
      }

      let failedProgram: string | null = null;
      let slotTakenProgram: string | null = null;
      let successCount = 0;
      for (const b of bookings) {
        const { data, error } = await supabase.functions.invoke(
          'admin-book-appointment',
          {
            body: {
              programBookingId: b.programBookingId,
              slotId: b.slotId,
              appointmentDate: b.appointmentDate,
            },
            headers: fnHeaders,
          },
        );
        if (error || !data) {
          const programType = lead.programBookings.find(
            (pb) => pb.booking_id === b.programBookingId,
          )?.program_type;
          if (error instanceof FunctionsHttpError) {
            const body = await error.context.json().catch(() => null);
            if (body?.code === 'slot_taken') {
              slotTakenProgram = programType
                ? PROGRAM_LABELS[programType]
                : 'this program';
              break;
            }
          }
          failedProgram = programType ? PROGRAM_LABELS[programType] : 'This';
          break;
        }
        successCount += 1;
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });

      if (slotTakenProgram) {
        onError(
          successCount > 0
            ? `That time was just taken. The other bookings were saved. Pick a new date for ${slotTakenProgram}.`
            : 'That time was just taken. Please pick another date.',
        );
        return true;
      }

      if (failedProgram) {
        onError(
          `${failedProgram} appointment could not be booked — the other bookings were saved. Please try again.`,
        );
        return false;
      }

      toast.success('Appointment(s) booked');
      return true;
    } finally {
      clearBusy(lead.lead_id);
    }
  }

  async function markConfirmed(lead: EnrollmentLead): Promise<boolean> {
    if (busyLeadIds.has(lead.lead_id)) return false;
    markBusy(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return false;
      }
      const { error } = await supabase.functions.invoke(
        'admin-confirm-appointment',
        {
          body: { leadId: lead.lead_id },
          headers: fnHeaders,
        },
      );
      if (error) {
        onError('Failed to confirm appointment');
        return false;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
      toast('Appointment confirmed', {
        action: {
          label: 'Undo',
          onClick: () => {
            unconfirm(lead);
          },
        },
      });
      return true;
    } finally {
      clearBusy(lead.lead_id);
    }
  }

  async function unconfirm(lead: EnrollmentLead): Promise<boolean> {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) {
      onError('Session expired. Please sign in again.');
      return false;
    }
    const { error } = await supabase.functions.invoke(
      'admin-confirm-appointment',
      {
        body: { leadId: lead.lead_id, action: 'unconfirm' },
        headers: fnHeaders,
      },
    );
    if (error) {
      onError('Failed to undo');
      return false;
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });
    return true;
  }

  async function sendReminder(lead: EnrollmentLead) {
    setSendingReminderId(lead.lead_id);
    try {
      const fnHeaders = await edgeFunctionUserAuthHeaders();
      if (!fnHeaders) {
        onError('Session expired. Please sign in again.');
        return;
      }
      const { error } = await supabase.functions.invoke(
        'send-appointment-reminder',
        {
          body: { leadId: lead.lead_id },
          headers: fnHeaders,
        },
      );
      if (error) {
        const status = (error as { context?: { status?: number } }).context
          ?.status;
        if (status === 409) {
          onError('A confirmation email is already on its way');
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

  return {
    approve,
    resendBookingLink,
    deny,
    bookAppointments,
    markConfirmed,
    unconfirm,
    sendReminder,
    busyLeadIds,
    sendingReminderId,
  };
}
