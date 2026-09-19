/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import { TrialVisitStep } from './TrialVisitStep';
import type { VisitSelections } from './TrialVisitStep';
import { LanguageContext, translations } from './lang';
import type { Lang } from './lang';
import { getAppointmentSlots } from '../../lib/supabase/bookingQueries';
import type { VisitChoice } from '../shared/VisitPicker';

vi.mock('../../lib/supabase/bookingQueries', () => ({
  getAppointmentSlots: vi.fn(),
}));

vi.mock('../shared/VisitPicker', () => ({
  VisitPicker: ({
    onChange,
    horizonWeeks,
  }: {
    onChange: (choice: VisitChoice | null) => void;
    horizonWeeks?: number;
  }) => (
    <div>
      <span data-testid="picker-horizon-weeks">{horizonWeeks}</span>
      <button
        onClick={() =>
          onChange({ slotId: 's1', date: '2099-01-05', startTime: '17:20:00' })
        }
      >
        Pick
      </button>
    </div>
  ),
}));

type ChildRow = { name: string; age: string };

function tree(props: {
  children: ChildRow[];
  value?: VisitSelections;
  onChange?: (next: VisitSelections) => void;
  errors?: Partial<Record<'little_dragons' | 'youth', string>>;
  refreshKey?: number;
  disabled?: boolean;
  lang?: Lang;
}) {
  const lang = props.lang ?? 'en';
  return (
    <LanguageContext.Provider
      value={{ lang, setLang: vi.fn(), t: translations[lang] }}
    >
      <TrialVisitStep
        children={props.children}
        value={props.value ?? {}}
        onChange={props.onChange ?? vi.fn()}
        errors={props.errors ?? {}}
        refreshKey={props.refreshKey ?? 0}
        disabled={props.disabled ?? false}
      />
    </LanguageContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TrialVisitStep', () => {
  it('shows the needs-age prompt and no picker group when no child has a valid age', () => {
    render(tree({ children: [{ name: 'Amy', age: '' }] }));

    expect(
      screen.getByText(
        "Enter your child's age above and we'll show the days available.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('group')).toBeNull();
    expect(getAppointmentSlots).not.toHaveBeenCalled();
  });

  it('loads youth slots once and shows one group named for the child', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree({ children: [{ name: 'Alex', age: '9' }] }));

    expect(
      screen.getByRole('group', { name: 'Youth Program visit for Alex' }),
    ).toBeTruthy();
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));
    expect(getAppointmentSlots).toHaveBeenCalledWith('youth');
    expect(await screen.findByRole('button', { name: 'Pick' })).toBeTruthy();
  });

  it('asks the picker for only the 3 weeks the public submit accepts', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree({ children: [{ name: 'Alex', age: '9' }] }));

    const horizon = await screen.findByTestId('picker-horizon-weeks');
    expect(horizon.textContent).toBe('3');
  });

  it('shows two groups, each named for its own children, for a mixed-age family', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(
      tree({
        children: [
          { name: 'Mia', age: '5' },
          { name: 'Alex', age: '10' },
        ],
      }),
    );

    expect(
      screen.getByRole('group', { name: 'Little Dragons visit for Mia' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Youth Program visit for Alex' }),
    ).toBeTruthy();
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));
  });

  it("shows the Spanish legend, using the site's own program names, for a Spanish render", async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree({ children: [{ name: 'Alex', age: '9' }], lang: 'es' }));

    expect(
      screen.getByRole('group', {
        name: 'Visita de Programa Juvenil para Alex',
      }),
    ).toBeTruthy();
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));
  });

  it('removes the Little Dragons selection when an age moves from 7 to 8, keeping the Youth one', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const onChange = vi.fn();
    const littleChoice: VisitChoice = {
      slotId: 'ld-1',
      date: '2099-01-05',
      startTime: '09:00:00',
    };
    const youthChoice: VisitChoice = {
      slotId: 'y-1',
      date: '2099-01-06',
      startTime: '17:00:00',
    };
    const value: VisitSelections = {
      little_dragons: littleChoice,
      youth: youthChoice,
    };

    const { rerender } = render(
      tree({
        children: [
          { name: 'Amy', age: '7' },
          { name: 'Ben', age: '10' },
        ],
        value,
        onChange,
      }),
    );
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      tree({
        children: [
          { name: 'Amy', age: '8' },
          { name: 'Ben', age: '10' },
        ],
        value,
        onChange,
      }),
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ youth: youthChoice }),
    );
  });

  it('prunes a selection when the last child of that program is removed', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const onChange = vi.fn();
    const littleChoice: VisitChoice = {
      slotId: 'ld-1',
      date: '2099-01-05',
      startTime: '09:00:00',
    };
    const youthChoice: VisitChoice = {
      slotId: 'y-1',
      date: '2099-01-06',
      startTime: '17:00:00',
    };
    const value: VisitSelections = {
      little_dragons: littleChoice,
      youth: youthChoice,
    };

    const { rerender } = render(
      tree({
        children: [
          { name: 'Amy', age: '7' },
          { name: 'Ben', age: '10' },
        ],
        value,
        onChange,
      }),
    );
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));

    rerender(
      tree({
        children: [{ name: 'Ben', age: '10' }],
        value,
        onChange,
      }),
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ youth: youthChoice }),
    );
  });

  it("renders a program error referenced by the group's aria-describedby", () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(
      tree({
        children: [{ name: 'Alex', age: '9' }],
        errors: { youth: 'Please choose a day and arrival time.' },
      }),
    );

    const group = screen.getByRole('group', {
      name: 'Youth Program visit for Alex',
    });
    const error = screen.getByText('Please choose a day and arrival time.');
    expect(error.id).toBe('visit-error-youth');
    expect(group.getAttribute('aria-describedby')).toBe('visit-error-youth');
  });

  it('fetches slots once per program and does not refetch while a name field is edited', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const { rerender } = render(tree({ children: [{ name: '', age: '9' }] }));
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));

    rerender(tree({ children: [{ name: 'A', age: '9' }] }));
    rerender(tree({ children: [{ name: 'Al', age: '9' }] }));
    rerender(tree({ children: [{ name: 'Alex', age: '9' }] }));

    expect(getAppointmentSlots).toHaveBeenCalledTimes(1);
  });

  it('disables the picker group when the step is disabled', async () => {
    // jsdom does not implement the browser-native behavior of a disabled
    // <fieldset> cascading `disabled` onto descendant form controls (verified
    // directly against jsdom: even a plain <button> nested one level inside a
    // disabled <fieldset> keeps `.disabled === false`). Real browsers do
    // cascade it, which is what makes this markup pattern work in
    // production. The assertion below checks what jsdom can actually observe
    // -- that our component puts `disabled` on the fieldset itself.
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree({ children: [{ name: 'Alex', age: '9' }], disabled: true }));

    await screen.findByRole('button', { name: 'Pick' });
    const fieldset = document.getElementById(
      'visit-group-youth',
    ) as HTMLFieldSetElement;
    expect(fieldset.disabled).toBe(true);
  });

  it('retries a failed fetch once its program drops out of the set and reappears', async () => {
    vi.mocked(getAppointmentSlots)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([]);
    const { rerender } = render(
      tree({ children: [{ name: 'Amy', age: '7' }] }),
    );
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toBeTruthy();

    // Age out of range: little_dragons drops out of the present program set.
    rerender(tree({ children: [{ name: 'Amy', age: '2' }] }));
    // Back to a little_dragons age: the program reappears.
    rerender(tree({ children: [{ name: 'Amy', age: '7' }] }));

    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Pick' })).toBeTruthy();
  });

  it('retries a failed fetch when the visitor presses try again', async () => {
    vi.mocked(getAppointmentSlots)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([]);
    render(tree({ children: [{ name: 'Alex', age: '9' }] }));
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'We could not load the available days. Please try again, or call us at (408) 620-0252 and we will book your visit for you.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Pick' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the Spanish load error and retry label for a Spanish render', async () => {
    vi.mocked(getAppointmentSlots).mockRejectedValue(new Error('boom'));
    render(tree({ children: [{ name: 'Alex', age: '9' }], lang: 'es' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No pudimos cargar los días disponibles. Inténtalo de nuevo, o llámanos al (408) 620-0252 y nosotros reservamos tu visita.',
    );
    expect(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeTruthy();
  });

  it('retries a failed fetch when refreshKey changes, leaving a succeeded program cached', async () => {
    vi.mocked(getAppointmentSlots).mockImplementation(
      (program?: 'little_dragons' | 'youth') =>
        program === 'little_dragons'
          ? Promise.reject(new Error('boom'))
          : Promise.resolve([]),
    );
    const { rerender } = render(
      tree({
        children: [
          { name: 'Amy', age: '7' },
          { name: 'Ben', age: '10' },
        ],
        refreshKey: 0,
      }),
    );
    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toBeTruthy();

    vi.mocked(getAppointmentSlots).mockClear();
    vi.mocked(getAppointmentSlots).mockImplementation(() =>
      Promise.resolve([]),
    );

    rerender(
      tree({
        children: [
          { name: 'Amy', age: '7' },
          { name: 'Ben', age: '10' },
        ],
        refreshKey: 1,
      }),
    );

    await waitFor(() => expect(getAppointmentSlots).toHaveBeenCalledTimes(1));
    expect(getAppointmentSlots).toHaveBeenCalledWith('little_dragons');
  });
});
