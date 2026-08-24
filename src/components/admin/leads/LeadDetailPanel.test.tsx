/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LeadDetailPanel } from './LeadDetailPanel';
import type { useLeadActions } from './useLeadActions';
import type {
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../../lib/types';

vi.mock('../../../lib/hooks/leads', () => {
  const idle = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useUpdateLeadNotes: idle,
    useUpdateLeadStatus: idle,
    useCloseLead: idle,
    useRecordAttendance: idle,
  };
});

function makeBooking(
  partial: Partial<EnrollmentLeadProgramBooking> = {},
): EnrollmentLeadProgramBooking {
  return {
    booking_id: 'b1',
    lead_id: 'lead-1',
    program_type: 'youth',
    booking_token: 'token-1',
    appointment_slot_id: 'slot-1',
    appointment_date: '2026-07-18',
    appointment_time: '10:00:00',
    status: 'confirmed',
    created_at: '2026-07-10T00:00:00Z',
    ...partial,
  };
}

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
    status: 'no_show',
    approved_at: '2026-07-11T00:00:00Z',
    approval_email_sent_at: null,
    booking_token: null,
    appointment_date: null,
    appointment_time: null,
    denied_at: null,
    denial_message: null,
    admin_notes: null,
    created_at: '2026-07-01T00:00:00Z',
    deleted_at: null,
    attendance_recorded_at: '2026-07-19T00:00:00Z',
    attendance_recorded_by: 'admin-1',
    children: [
      {
        child_id: 'c1',
        lead_id: 'lead-1',
        name: 'Marco',
        age: 9,
        program_type: 'youth',
        created_at: '2026-07-01T00:00:00Z',
      },
    ],
    programBookings: [makeBooking()],
    reminderNotification: null,
    notificationHistory: [],
    ...partial,
  };
}

const stubActions = {
  approve: vi.fn(),
  resendBookingLink: vi.fn(),
  deny: vi.fn(),
  bookAppointments: vi.fn(),
  markConfirmed: vi.fn(),
  unconfirm: vi.fn(),
  sendReminder: vi.fn(),
  busyLeadIds: new Set<string>(),
  sendingReminderId: null,
} as unknown as ReturnType<typeof useLeadActions>;

function renderPanel(lead: EnrollmentLead, overrides = {}) {
  const handlers = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onDeny: vi.fn(),
    onPickDate: vi.fn(),
    onResend: vi.fn(),
    onRescheduleLink: vi.fn(),
    onDismiss: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<LeadDetailPanel lead={lead} actions={stubActions} {...handlers} />);
  return handlers;
}

afterEach(cleanup);

describe('LeadDetailPanel for a no_show lead', () => {
  it('offers Pick new date and routes it to onPickDate', () => {
    const handlers = renderPanel(makeLead());
    fireEvent.click(screen.getByText('Pick new date'));
    expect(handlers.onPickDate).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-1' }),
    );
  });

  it('offers Send reschedule link and routes it to onRescheduleLink', () => {
    const handlers = renderPanel(makeLead());
    fireEvent.click(screen.getByText('Send reschedule link'));
    expect(handlers.onRescheduleLink).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-1' }),
    );
  });

  it('does not offer the reschedule actions on other terminal statuses', () => {
    renderPanel(makeLead({ status: 'closed' }));
    expect(screen.queryByText('Pick new date')).toBeNull();
    expect(screen.queryByText('Send reschedule link')).toBeNull();
  });
});
