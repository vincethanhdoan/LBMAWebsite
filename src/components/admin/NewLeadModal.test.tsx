/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { NewLeadModal } from './NewLeadModal';
import { createEnrollmentLead } from '../../lib/supabase/mutations';
import {
  getEnrollmentLeadById,
  findLeadsByEmail,
} from '../../lib/supabase/queries';
import {
  edgeFunctionUserAuthHeaders,
  supabase,
} from '../../lib/supabase/client';
import { toast } from 'sonner';
import type {
  EnrollmentLead,
  EnrollmentLeadProgramBooking,
} from '../../lib/types';

vi.mock('../../lib/supabase/mutations', () => ({
  createEnrollmentLead: vi.fn(),
}));

vi.mock('../../lib/supabase/queries', () => ({
  getEnrollmentLeadById: vi.fn(),
  findLeadsByEmail: vi.fn(),
}));

vi.mock('../../lib/supabase/client', () => ({
  edgeFunctionUserAuthHeaders: vi.fn(),
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('./PickDateModal', () => ({
  PickDateModal: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: (
      bookings: Array<{
        programBookingId: string;
        slotId: string;
        appointmentDate: string;
      }>,
    ) => void;
    onCancel: () => void;
  }) => (
    <div>
      <button
        onClick={() =>
          onConfirm([
            {
              programBookingId: 'b1',
              slotId: 's1',
              appointmentDate: '2099-01-05',
            },
          ])
        }
      >
        confirm-date
      </button>
      <button onClick={() => onCancel()}>cancel-date</button>
    </div>
  ),
}));

function makeBooking(
  partial: Partial<EnrollmentLeadProgramBooking> = {},
): EnrollmentLeadProgramBooking {
  return {
    booking_id: 'b1',
    lead_id: 'lead-1',
    program_type: 'little_dragons',
    booking_token: 'token-1',
    appointment_slot_id: 's1',
    appointment_date: '2099-01-05',
    appointment_time: '17:20:00',
    status: 'scheduled',
    created_at: '2026-07-10T00:00:00Z',
    ...partial,
  };
}

function makeLead(partial: Partial<EnrollmentLead> = {}): EnrollmentLead {
  return {
    lead_id: 'lead-1',
    parent_name: 'Maria Lopez',
    parent_email: null,
    phone: '(209) 555-0199',
    student_name: null,
    student_age: null,
    message: '',
    source_page: 'admin',
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
    preferred_language: 'en',
    children: [
      {
        child_id: 'c1',
        lead_id: 'lead-1',
        name: 'Mia',
        age: 6,
        program_type: 'little_dragons',
        created_at: '2026-07-01T00:00:00Z',
      },
    ],
    programBookings: [makeBooking()],
    reminderNotification: null,
    notificationHistory: [],
    ...partial,
  };
}

function renderModal(
  overrides: { onSuccess?: () => void; onCancel?: () => void } = {},
) {
  const onSuccess = overrides.onSuccess ?? vi.fn();
  const onCancel = overrides.onCancel ?? vi.fn();
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <NewLeadModal onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { onSuccess, onCancel };
}

function fillWalkIn() {
  fireEvent.change(screen.getByLabelText('Parent name *'), {
    target: { value: 'Maria Lopez' },
  });
  fireEvent.change(screen.getByLabelText('Phone *'), {
    target: { value: '(209) 555-0199' },
  });
  fireEvent.change(screen.getByLabelText('Child 1 name'), {
    target: { value: 'Mia' },
  });
  fireEvent.change(screen.getByLabelText('Child 1 age'), {
    target: { value: '6' },
  });
}

beforeEach(() => {
  vi.mocked(edgeFunctionUserAuthHeaders).mockResolvedValue({
    Authorization: 'Bearer test-token',
  });
  vi.mocked(findLeadsByEmail).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NewLeadModal after-creating choices', () => {
  it('offers Send Booking Link only once a valid email is entered', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Pick Date for Them' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Only' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Send Booking Link' }),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'maria@example.com' },
    });

    expect(
      screen.getByRole('button', { name: 'Send Booking Link' }),
    ).toBeTruthy();
  });

  it('falls back to Pick Date for Them when the email is cleared after choosing Send Booking Link', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'maria@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Booking Link' }));
    expect(
      screen
        .getByRole('button', { name: 'Send Booking Link' })
        .getAttribute('aria-pressed'),
    ).toBe('true');

    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: '' },
    });

    expect(
      screen
        .getByRole('button', { name: 'Pick Date for Them' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });
});

describe('NewLeadModal submission', () => {
  it('creates a walk-in lead with parentEmail null and never checks for duplicates by email', async () => {
    vi.mocked(createEnrollmentLead).mockResolvedValue('lead-1');
    vi.mocked(getEnrollmentLeadById).mockResolvedValue(makeLead());
    renderModal();

    fillWalkIn();
    fireEvent.click(screen.getByRole('button', { name: 'Create & Pick Date' }));

    await waitFor(() => expect(createEnrollmentLead).toHaveBeenCalled());
    expect(createEnrollmentLead).toHaveBeenCalledWith(
      expect.objectContaining({
        parentName: 'Maria Lopez',
        parentEmail: null,
        phone: '(209) 555-0199',
        children: [{ name: 'Mia', age: 6 }],
      }),
    );
    expect(findLeadsByEmail).not.toHaveBeenCalled();
  });

  it('blocks submission with neither phone nor email and explains why', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Parent name *'), {
      target: { value: 'Maria Lopez' },
    });
    fireEvent.change(screen.getByLabelText('Child 1 name'), {
      target: { value: 'Mia' },
    });
    fireEvent.change(screen.getByLabelText('Child 1 age'), {
      target: { value: '6' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create & Pick Date' }));

    expect(screen.getByText('Add a phone number, or an email.')).toBeTruthy();
    expect(createEnrollmentLead).not.toHaveBeenCalled();
  });
});

describe('NewLeadModal pick-date step', () => {
  it('books the visit, announces it by voice, and reports success', async () => {
    vi.mocked(createEnrollmentLead).mockResolvedValue('lead-1');
    vi.mocked(getEnrollmentLeadById).mockResolvedValue(makeLead());
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    const { onSuccess } = renderModal();

    fillWalkIn();
    fireEvent.click(screen.getByRole('button', { name: 'Create & Pick Date' }));
    await screen.findByText('confirm-date');

    fireEvent.click(screen.getByText('confirm-date'));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(
      "Booked: Mia, Monday, Jan 5 at 5:20 PM. They won't get an email, so please remind them by phone.",
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('reports a taken slot without losing the date step', async () => {
    vi.mocked(createEnrollmentLead).mockResolvedValue('lead-1');
    vi.mocked(getEnrollmentLeadById).mockResolvedValue(makeLead());
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ code: 'slot_taken' }),
      }),
    } as never);
    const { onSuccess } = renderModal();

    fillWalkIn();
    fireEvent.click(screen.getByRole('button', { name: 'Create & Pick Date' }));
    await screen.findByText('confirm-date');

    fireEvent.click(screen.getByText('confirm-date'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'That time was just taken. Please pick another date.',
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('confirm-date')).toBeTruthy();
  });
});
