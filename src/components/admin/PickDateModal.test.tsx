/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PickDateModal } from './PickDateModal';
import type {
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../lib/types';

vi.mock('../../lib/supabase/queries', () => ({
  getAppointmentSlots: vi.fn().mockResolvedValue([
    {
      slot_id: 'slot-1',
      day_of_week: 6,
      start_time: '10:00:00',
      end_time: '10:30:00',
      duration_minutes: 30,
      label: null,
      week_of_month: null,
      program_type: 'youth',
      is_active: true,
    },
  ]),
}));

vi.mock('../shared/BookingCalendar', () => ({
  BookingCalendar: ({
    onConfirm,
  }: {
    onConfirm: (slotId: string, date: string) => void;
  }) => (
    <button onClick={() => onConfirm('slot-1', '2026-09-05')}>
      calendar-pick-sep-5
    </button>
  ),
}));

function makeBooking(
  partial: Partial<EnrollmentLeadProgramBooking> = {},
): EnrollmentLeadProgramBooking {
  return {
    booking_id: 'b1',
    lead_id: 'lead-1',
    program_type: 'youth',
    booking_token: 'token-1',
    appointment_slot_id: 'slot-1',
    appointment_date: '2026-08-15',
    appointment_time: '10:00:00',
    status: 'scheduled',
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
    status: 'appointment_scheduled',
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

afterEach(cleanup);

describe('PickDateModal with a booked program', () => {
  it('shows the current date with a change-date option instead of the calendar', async () => {
    render(
      <PickDateModal
        lead={makeLead()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Change date/i)).toBeTruthy();
    expect(screen.queryByText('calendar-pick-sep-5')).toBeNull();
  });

  it('submits a newly picked date for the booked program through onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <PickDateModal
        lead={makeLead()}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const confirmButton = (await screen.findByText(
      /^Confirm/,
    )) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    fireEvent.click(screen.getByText(/Change date/i));
    fireEvent.click(await screen.findByText('calendar-pick-sep-5'));
    expect(confirmButton.disabled).toBe(false);

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith([
      {
        programBookingId: 'b1',
        slotId: 'slot-1',
        appointmentDate: '2026-09-05',
      },
    ]);
  });
});
