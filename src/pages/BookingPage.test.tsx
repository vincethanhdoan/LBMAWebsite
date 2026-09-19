/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { BookingPage } from './BookingPage';
import { supabase } from '../lib/supabase/client';
import {
  getProgramBookingByToken,
  getAppointmentSlots,
} from '../lib/supabase/queries';

vi.mock('../lib/supabase/queries', () => ({
  getProgramBookingByToken: vi.fn(),
  getAppointmentSlots: vi.fn(),
}));

vi.mock('../lib/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock('../components/shared/BookingCalendar', () => ({
  BookingCalendar: ({
    onConfirm,
  }: {
    onConfirm: (slotId: string, date: string) => void;
  }) => <button onClick={() => onConfirm('slot-1', '2099-01-05')}>Pick</button>,
}));

function renderAtToken(token = 'token-1') {
  return render(
    <MemoryRouter initialEntries={[`/book/${token}`]}>
      <Routes>
        <Route path="/book/:token" element={<BookingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BookingPage action errors', () => {
  it('keeps the calendar and explains when the time was just taken', async () => {
    vi.mocked(getProgramBookingByToken).mockResolvedValue({
      booking_id: 'b1',
      program_type: 'youth',
      status: 'link_sent',
      appointment_date: null,
      appointment_time: null,
      parent_name: 'Maria Lopez',
      child_names: ['Mia'],
    });
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ code: 'slot_taken' }),
      }),
    } as never);

    renderAtToken();

    fireEvent.click(await screen.findByText('Pick'));

    expect(
      await screen.findByText(
        'That time was just taken. Please pick another date.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Link unavailable')).toBeNull();
    expect(screen.getByText('Pick')).toBeTruthy();
  });

  it('treats a date that is no longer available the same way', async () => {
    vi.mocked(getProgramBookingByToken).mockResolvedValue({
      booking_id: 'b1',
      program_type: 'youth',
      status: 'link_sent',
      appointment_date: null,
      appointment_time: null,
      parent_name: 'Maria Lopez',
      child_names: ['Mia'],
    });
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ code: 'date_unavailable' }),
      }),
    } as never);

    renderAtToken();

    fireEvent.click(await screen.findByText('Pick'));

    expect(
      await screen.findByText(
        'That date is no longer available. Please pick another.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Link unavailable')).toBeNull();
    expect(screen.getByText('Pick')).toBeTruthy();
  });

  it('stays on the booked visit when cancelling fails', async () => {
    vi.mocked(getProgramBookingByToken).mockResolvedValue({
      booking_id: 'b1',
      program_type: 'youth',
      status: 'scheduled',
      appointment_date: '2099-01-05',
      appointment_time: '10:00:00',
      parent_name: 'Maria Lopez',
      child_names: ['Mia'],
    });
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error('cancel failed'),
    } as never);

    renderAtToken();

    fireEvent.click(await screen.findByText('Cancel appointment'));
    const confirmButtons = await screen.findAllByRole('button', {
      name: 'Cancel appointment',
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(
      await screen.findByText(
        "We couldn't cancel that just now. Please try again.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Link unavailable')).toBeNull();
    expect(screen.getByText(/January 5, 2099/)).toBeTruthy();
  });

  it('shows a call-us message inline when the lead is closed', async () => {
    vi.mocked(getProgramBookingByToken).mockResolvedValue({
      booking_id: 'b1',
      program_type: 'youth',
      status: 'link_sent',
      appointment_date: null,
      appointment_time: null,
      parent_name: 'Maria Lopez',
      child_names: ['Mia'],
    });
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ code: 'lead_closed' }),
      }),
    } as never);

    renderAtToken();

    fireEvent.click(await screen.findByText('Pick'));

    expect(
      await screen.findByText(
        "This link can't be used to book another visit. Please call us at (408) 620-0252 and we'll set one up.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Link unavailable')).toBeNull();
    expect(screen.getByText('Pick')).toBeTruthy();
  });

  it('still shows Link unavailable for a dead link', async () => {
    vi.mocked(getProgramBookingByToken).mockResolvedValue(null);

    renderAtToken();

    expect(await screen.findByText('Link unavailable')).toBeTruthy();
  });
});
