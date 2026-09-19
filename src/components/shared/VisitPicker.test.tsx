/**
 * @vitest-environment jsdom
 */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { VisitPicker } from './VisitPicker';
import type { VisitChoice } from './VisitPicker';
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

function ControlledVisitPicker(props: {
  slots: AppointmentSlot[];
  language: 'en' | 'es';
  emptyMessage: string;
  allowToday?: boolean;
}) {
  const [value, setValue] = useState<VisitChoice | null>(null);
  return <VisitPicker {...props} value={value} onChange={setValue} />;
}

const spanishTimeLabel = new Date('1970-01-01T17:20:00').toLocaleTimeString(
  'es-US',
  { hour: 'numeric', minute: '2-digit' },
);

async function waitForLoadToFinish() {
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: 'Loading available days' }),
    ).toBeNull(),
  );
}

afterEach(cleanup);

describe('VisitPicker', () => {
  it('shows a labelled loading state, then only the returned dates are selectable', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    render(
      <VisitPicker
        slots={[makeSlot()]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Loading available days' }),
    ).toBeTruthy();

    await waitForLoadToFinish();

    const availableDay = screen.getByRole('button', {
      name: /September 21st, 2026/,
    }) as HTMLButtonElement;
    expect(availableDay.disabled).toBe(false);

    const unavailableDay = screen.getByRole('button', {
      name: /September 22nd, 2026/,
    }) as HTMLButtonElement;
    expect(unavailableDay.disabled).toBe(true);
  });

  it('calls onChange with the slot, date, and time when a day has one arrival time', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const onChange = vi.fn();
    render(
      <VisitPicker
        slots={[makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' })]}
        value={null}
        onChange={onChange}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );

    expect(onChange).toHaveBeenCalledWith({
      slotId: 'slot-1',
      date: '2026-09-21',
      startTime: '10:00:00',
    });
  });

  it('calls onChange(null) on day selection with several times, then the chosen time on button press', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const onChange = vi.fn();
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <VisitPicker
        slots={slots}
        value={null}
        onChange={onChange}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.click(screen.getByRole('button', { name: 'Arrive at 5:20 PM' }));
    expect(onChange).toHaveBeenLastCalledWith({
      slotId: 'slot-2',
      date: '2026-09-21',
      startTime: '17:20:00',
    });
  });

  it('marks the chosen time button pressed and labels it "Arrive at ..."', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <ControlledVisitPicker
        slots={slots}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();

    fireEvent.click(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    );
    const timeButton = screen.getByRole('button', {
      name: 'Arrive at 5:20 PM',
    });
    expect(timeButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(timeButton);
    expect(timeButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the Spanish month caption and arrival label with the real es-US output', async () => {
    console.log('es-US time format for 17:20:00 ->', spanishTimeLabel);
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    render(
      <VisitPicker
        slots={[makeSlot({ slot_id: 'slot-1', start_time: '17:20:00' })]}
        value={null}
        onChange={vi.fn()}
        language="es"
        emptyMessage="No hay visitas disponibles."
      />,
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('status', {
          name: 'Cargando los días disponibles',
        }),
      ).toBeNull(),
    );

    expect(document.querySelector('.rdp-caption_label')?.textContent).toBe(
      'septiembre 2026',
    );

    fireEvent.click(
      screen.getByRole('button', { name: /21 de septiembre de 2026/ }),
    );

    expect(
      screen.getByRole('button', {
        name: `Llegar a las ${spanishTimeLabel}`,
      }),
    ).toBeTruthy();
  });

  it('clears a chosen value that drops out of the refetched dates when refreshKey changes', async () => {
    vi.mocked(getUpcomingBookableDates)
      .mockResolvedValueOnce(['2026-09-21'])
      .mockResolvedValueOnce([]);
    const onChange = vi.fn();
    const slot = makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' });
    const value: VisitChoice = {
      slotId: 'slot-1',
      date: '2026-09-21',
      startTime: '10:00:00',
    };

    const { rerender } = render(
      <VisitPicker
        slots={[slot]}
        value={value}
        onChange={onChange}
        language="en"
        emptyMessage="No visits available."
        refreshKey={1}
      />,
    );
    await waitForLoadToFinish();
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <VisitPicker
        slots={[slot]}
        value={value}
        onChange={onChange}
        language="en"
        emptyMessage="No visits available."
        refreshKey={2}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
  });

  it('renders the empty message when there are no bookable dates', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue([]);
    render(
      <VisitPicker
        slots={[makeSlot()]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    expect(await screen.findByText('No visits available.')).toBeTruthy();
  });

  it('renders the load error with role="alert" on a fetch failure', async () => {
    vi.mocked(getUpcomingBookableDates).mockRejectedValue(new Error('boom'));
    render(
      <VisitPicker
        slots={[makeSlot()]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    expect((await screen.findByRole('alert')).textContent).toBe(
      "We couldn't load the available days. Please refresh the page or call us at (408) 620-0252.",
    );
  });

  it('opens the calendar on the month of the first available date', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-11-03']);
    render(
      <VisitPicker
        slots={[makeSlot()]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();

    expect(document.querySelector('.rdp-caption_label')?.textContent).toBe(
      'November 2026',
    );
  });
});
