/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { BookingCalendar } from './BookingCalendar';
import { getUpcomingBookableDates } from '../../lib/supabase/queries';
import type { AppointmentSlot } from '../../lib/types';

vi.mock('../../lib/supabase/queries', () => ({
  getUpcomingBookableDates: vi.fn(),
}));

function makeSlot(partial: Partial<AppointmentSlot> = {}): AppointmentSlot {
  return {
    slot_id: 'slot-1',
    day_of_week: 1,
    week_of_month: null,
    start_time: '10:00:00',
    label: '',
    is_active: true,
    program_type: 'youth',
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

async function waitForLoadToFinish() {
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: 'Loading available days' }),
    ).toBeNull(),
  );
}

afterEach(cleanup);

describe('BookingCalendar', () => {
  it('shows no confirm button before a day is picked', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <BookingCalendar
        slots={slots}
        onConfirm={vi.fn()}
        submitting={false}
        confirmLabel="Confirm Visit"
      />,
    );
    await waitForLoadToFinish();

    expect(screen.queryByRole('button', { name: 'Confirm Visit' })).toBeNull();
  });

  it('shows a disabled confirm button as soon as a multi-time day is picked', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <BookingCalendar
        slots={slots}
        onConfirm={vi.fn()}
        submitting={false}
        confirmLabel="Confirm Visit"
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm Visit',
    }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
  });

  it('enables the confirm button once a time is chosen', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <BookingCalendar
        slots={slots}
        onConfirm={vi.fn()}
        submitting={false}
        confirmLabel="Confirm Visit"
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arrive at 5:20 PM' }));

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm Visit',
    }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);
  });

  it('calls onConfirm with the chosen slot and date', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <BookingCalendar
        slots={slots}
        onConfirm={onConfirm}
        submitting={false}
        confirmLabel="Confirm Visit"
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arrive at 5:20 PM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Visit' }));

    expect(onConfirm).toHaveBeenCalledWith('slot-2', '2026-09-21');
  });

  it('shows the confirm button already enabled for a day with one arrival time', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' })];
    render(
      <BookingCalendar
        slots={slots}
        onConfirm={vi.fn()}
        submitting={false}
        confirmLabel="Confirm Visit"
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm Visit',
    }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);
  });
});
