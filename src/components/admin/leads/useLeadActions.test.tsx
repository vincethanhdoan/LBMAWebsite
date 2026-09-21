/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  edgeFunctionUserAuthHeaders,
  supabase,
} from '../../../lib/supabase/client';
import { useLeadActions } from './useLeadActions';
import type { EnrollmentLead } from '../../../lib/types';

vi.mock('../../../lib/supabase/client', () => ({
  edgeFunctionUserAuthHeaders: vi.fn(),
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeLead(partial: Partial<EnrollmentLead> = {}): EnrollmentLead {
  return {
    lead_id: 'lead-1',
    parent_name: 'Eduardo Guerra',
    parent_email: 'eduardo@example.com',
    phone: '(209) 555-0123',
    student_name: null,
    student_age: null,
    message: '',
    source_page: 'contact',
    notification_status: 'sent',
    notified_at: null,
    status: 'approved',
    approved_at: null,
    approval_email_sent_at: null,
    booking_token: null,
    appointment_date: null,
    appointment_time: null,
    denied_at: null,
    denial_message: null,
    admin_notes: null,
    created_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
    attendance_recorded_at: null,
    attendance_recorded_by: null,
    preferred_language: 'en',
    children: [],
    programBookings: [],
    reminderNotification: null,
    notificationHistory: [],
    ...partial,
  };
}

function renderActions() {
  const queryClient = new QueryClient();
  return renderHook(() => useLeadActions({ onError: vi.fn() }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  vi.mocked(edgeFunctionUserAuthHeaders).mockResolvedValue({
    Authorization: 'Bearer test-token',
  });
  vi.mocked(supabase.functions.invoke).mockResolvedValue({
    data: { ok: true },
    error: null,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useLeadActions resend actions', () => {
  it('resendBookingLink sends no intent and shows the invite toast', async () => {
    const { result } = renderActions();
    await act(async () => {
      await result.current.resendBookingLink(makeLead());
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'resend-booking-link',
      {
        body: { leadId: 'lead-1' },
        headers: { Authorization: 'Bearer test-token' },
      },
    );
    expect(toast.success).toHaveBeenCalledWith('Booking link resent');
  });

  it('sendRescheduleLink sends intent: reschedule and shows the reschedule toast', async () => {
    const { result } = renderActions();
    await act(async () => {
      await result.current.sendRescheduleLink(makeLead());
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'resend-booking-link',
      {
        body: { leadId: 'lead-1', intent: 'reschedule' },
        headers: { Authorization: 'Bearer test-token' },
      },
    );
    expect(toast.success).toHaveBeenCalledWith('Reschedule link sent');
  });

  it('resendReceipt sends intent: receipt and shows the receipt toast', async () => {
    const { result } = renderActions();
    await act(async () => {
      await result.current.resendReceipt(makeLead());
    });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'resend-booking-link',
      {
        body: { leadId: 'lead-1', intent: 'receipt' },
        headers: { Authorization: 'Bearer test-token' },
      },
    );
    expect(toast.success).toHaveBeenCalledWith('Booking receipt sent again');
  });
});
