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
import { getUpcomingBookableDates } from '../../lib/supabase/bookingQueries';
import type { AppointmentSlot } from '../../lib/types';

vi.mock('../../lib/supabase/bookingQueries', () => ({
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

function ControlledVisitPickerWithInitialValue(props: {
  slots: AppointmentSlot[];
  language: 'en' | 'es';
  emptyMessage: string;
  refreshKey: number;
  initialValue: VisitChoice | null;
}) {
  const [value, setValue] = useState<VisitChoice | null>(props.initialValue);
  return (
    <VisitPicker
      slots={props.slots}
      value={value}
      onChange={setValue}
      language={props.language}
      emptyMessage={props.emptyMessage}
      refreshKey={props.refreshKey}
    />
  );
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

  it('shows loading and hides the old days while a refresh-triggered fetch is pending, then shows the new days once it resolves', async () => {
    let resolveSecondFetch: (dates: string[]) => void = () => {};
    vi.mocked(getUpcomingBookableDates)
      .mockResolvedValueOnce(['2026-09-21'])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondFetch = resolve;
          }),
      );
    const slot = makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' });

    const { rerender } = render(
      <VisitPicker
        slots={[slot]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
        refreshKey={1}
      />,
    );
    await waitForLoadToFinish();
    expect(
      screen.getByRole('button', { name: /September 21st, 2026/ }),
    ).toBeTruthy();

    rerender(
      <VisitPicker
        slots={[slot]}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
        refreshKey={2}
      />,
    );

    expect(
      screen.getByRole('status', { name: 'Loading available days' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /September 21st, 2026/ }),
    ).toBeNull();

    resolveSecondFetch(['2026-09-25']);
    await waitForLoadToFinish();

    const day25 = screen.getByRole('button', {
      name: /September 25th, 2026/,
    }) as HTMLButtonElement;
    expect(day25.disabled).toBe(false);
    const day21 = screen.getByRole('button', {
      name: /September 21st, 2026/,
    }) as HTMLButtonElement;
    expect(day21.disabled).toBe(true);
  });

  it('calls onDaySelect with the picked day, including back to null on deselect', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const onDaySelect = vi.fn();
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    render(
      <VisitPicker
        slots={slots}
        value={null}
        onChange={vi.fn()}
        onDaySelect={onDaySelect}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();
    expect(onDaySelect).toHaveBeenLastCalledWith(null);

    const day = screen.getByRole('button', { name: /September 21st, 2026/ });
    fireEvent.click(day);
    expect(onDaySelect).toHaveBeenLastCalledWith('2026-09-21');

    fireEvent.click(day);
    expect(onDaySelect).toHaveBeenLastCalledWith(null);
  });

  it('shows a different value the parent swaps to as selected, with its own time pressed', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue([
      '2026-09-21',
      '2026-09-25',
    ]);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    const choiceA: VisitChoice = {
      slotId: 'slot-1',
      date: '2026-09-21',
      startTime: '10:00:00',
    };
    const choiceB: VisitChoice = {
      slotId: 'slot-2',
      date: '2026-09-25',
      startTime: '17:20:00',
    };

    const { rerender } = render(
      <VisitPicker
        slots={slots}
        value={choiceA}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();

    const day21 = screen.getByRole('button', {
      name: /September 21st, 2026/,
    });
    expect(day21.closest('td')?.getAttribute('aria-selected')).toBe('true');
    expect(
      screen
        .getByRole('button', { name: /^Arrive at 10:00 AM/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');

    rerender(
      <VisitPicker
        slots={slots}
        value={choiceB}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );

    const day25 = screen.getByRole('button', {
      name: /September 25th, 2026/,
    });
    expect(day25.closest('td')?.getAttribute('aria-selected')).toBe('true');
    expect(day21.closest('td')?.getAttribute('aria-selected')).not.toBe('true');
    expect(
      screen
        .getByRole('button', { name: /^Arrive at 5:20 PM/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Arrive at 10:00 AM' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('shows no day selected and no time buttons once the parent nulls the value', async () => {
    vi.mocked(getUpcomingBookableDates).mockResolvedValue(['2026-09-21']);
    const slots = [
      makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' }),
      makeSlot({ slot_id: 'slot-2', start_time: '17:20:00' }),
    ];
    const choice: VisitChoice = {
      slotId: 'slot-1',
      date: '2026-09-21',
      startTime: '10:00:00',
    };

    const { rerender } = render(
      <VisitPicker
        slots={slots}
        value={choice}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );
    await waitForLoadToFinish();
    expect(
      screen.getByRole('group', { name: 'Choose an arrival time' }),
    ).toBeTruthy();

    rerender(
      <VisitPicker
        slots={slots}
        value={null}
        onChange={vi.fn()}
        language="en"
        emptyMessage="No visits available."
      />,
    );

    expect(
      screen
        .getByRole('button', { name: /September 21st, 2026/ })
        .closest('td')
        ?.getAttribute('aria-selected'),
    ).not.toBe('true');
    expect(
      screen.queryByRole('group', { name: 'Choose an arrival time' }),
    ).toBeNull();
  });

  it('leaves no day highlighted after a refetch drops the chosen date (controlled round trip)', async () => {
    vi.mocked(getUpcomingBookableDates)
      .mockResolvedValueOnce(['2026-09-21'])
      .mockResolvedValueOnce(['2026-09-25']);
    const slot = makeSlot({ slot_id: 'slot-1', start_time: '10:00:00' });
    const initialValue: VisitChoice = {
      slotId: 'slot-1',
      date: '2026-09-21',
      startTime: '10:00:00',
    };

    const { rerender } = render(
      <ControlledVisitPickerWithInitialValue
        slots={[slot]}
        language="en"
        emptyMessage="No visits available."
        refreshKey={1}
        initialValue={initialValue}
      />,
    );
    await waitForLoadToFinish();

    rerender(
      <ControlledVisitPickerWithInitialValue
        slots={[slot]}
        language="en"
        emptyMessage="No visits available."
        refreshKey={2}
        initialValue={initialValue}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[aria-selected="true"]')).toBeNull();
    });
    const day21 = screen.getByRole('button', {
      name: /September 21st, 2026/,
    }) as HTMLButtonElement;
    expect(day21.disabled).toBe(true);
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
