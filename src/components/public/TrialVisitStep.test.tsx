/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { TrialVisitStep } from './TrialVisitStep';
import type { VisitSelections } from './TrialVisitStep';
import { LanguageProvider } from './LanguageProvider';
import { getAppointmentSlots } from '../../lib/supabase/queries';
import type { VisitChoice } from '../shared/VisitPicker';

vi.mock('../../lib/supabase/queries', () => ({
  getAppointmentSlots: vi.fn(),
}));

vi.mock('../shared/VisitPicker', () => ({
  VisitPicker: ({
    onChange,
  }: {
    onChange: (choice: VisitChoice | null) => void;
  }) => (
    <button
      onClick={() =>
        onChange({ slotId: 's1', date: '2099-01-05', startTime: '17:20:00' })
      }
    >
      Pick
    </button>
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
}) {
  return (
    <LanguageProvider>
      <TrialVisitStep
        children={props.children}
        value={props.value ?? {}}
        onChange={props.onChange ?? vi.fn()}
        errors={props.errors ?? {}}
        refreshKey={props.refreshKey ?? 0}
        disabled={props.disabled ?? false}
      />
    </LanguageProvider>
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
});
