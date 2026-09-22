/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  act,
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContactPage } from './ContactPage';
import { LanguageContext, translations } from './lang';
import type { Lang } from './lang';
import { submitTrialBookingWithTimeout } from '../../lib/supabase/client';
import type { TrialBookingReceipt } from '../../lib/supabase/client';
import { getAppointmentSlots } from '../../lib/supabase/bookingQueries';
import type { VisitChoice } from '../shared/VisitPicker';

vi.mock('../../lib/supabase/client', () => ({
  submitTrialBookingWithTimeout: vi.fn(),
}));

vi.mock('../../lib/supabase/bookingQueries', () => ({
  getAppointmentSlots: vi.fn(),
  getUpcomingBookableDates: vi.fn(),
}));

vi.mock('../shared/VisitPicker', () => ({
  VisitPicker: ({
    onChange,
    refreshKey,
    value,
  }: {
    onChange: (choice: VisitChoice | null) => void;
    refreshKey?: number;
    value: VisitChoice | null;
  }) => (
    <div>
      <span data-testid="picker-refresh-key">{refreshKey}</span>
      <span data-testid="picker-value">
        {value ? `${value.slotId}|${value.date}|${value.startTime}` : ''}
      </span>
      <button
        type="button"
        onClick={() =>
          onChange({ slotId: 's1', date: '2099-01-05', startTime: '17:20:00' })
        }
      >
        Pick
      </button>
    </div>
  ),
}));

function Wrapper({ lang }: { lang: Lang }) {
  return (
    <MemoryRouter>
      <LanguageContext.Provider
        value={{ lang, setLang: vi.fn(), t: translations[lang] }}
      >
        <ContactPage />
      </LanguageContext.Provider>
    </MemoryRouter>
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Your name/), {
    target: { value: 'Jane Parent' },
  });
  fireEvent.change(screen.getByLabelText(/^Phone/), {
    target: { value: '(408) 555-0199' },
  });
  fireEvent.change(screen.getByLabelText(/Email address/), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText("Child's name 1"), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Age 1'), {
    target: { value: '9' },
  });
}

async function pickVisit() {
  const pickButton = await screen.findByRole('button', { name: 'Pick' });
  fireEvent.click(pickButton);
}

function fillTwoChildren() {
  fireEvent.change(screen.getByLabelText(/Your name/), {
    target: { value: 'Jane Parent' },
  });
  fireEvent.change(screen.getByLabelText(/^Phone/), {
    target: { value: '(408) 555-0199' },
  });
  fireEvent.change(screen.getByLabelText(/Email address/), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText("Child's name 1"), {
    target: { value: 'Mia' },
  });
  fireEvent.change(screen.getByLabelText('Age 1'), {
    target: { value: '5' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add another child' }));
  fireEvent.change(screen.getByLabelText("Child's name 2"), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText('Age 2'), {
    target: { value: '9' },
  });
}

function submitForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Book my visit' }));
}

const VISIT_HEADING = 'Choose a day for your first visit';
const VISIT_HINT = "Enter an age and we'll show the days you can visit.";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ContactPage', () => {
  it('points to the calendar under the child rows until the visit section arrives', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);

    expect(screen.getByText(VISIT_HINT)).toBeTruthy();
    expect(screen.queryByText(VISIT_HEADING)).toBeNull();

    fireEvent.change(screen.getByLabelText('Age 1'), {
      target: { value: '9' },
    });

    expect(await screen.findByText(VISIT_HEADING)).toBeTruthy();
    expect(screen.queryByText(VISIT_HINT)).toBeNull();
  });

  it('shows the visit section as soon as the age field is left', async () => {
    vi.useFakeTimers();
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);
    const age = screen.getByLabelText('Age 1');

    fireEvent.change(age, { target: { value: '9' } });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.queryByText(VISIT_HEADING)).toBeNull();

    fireEvent.blur(age);
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText(VISIT_HEADING)).toBeTruthy();
  });

  it.each([
    ['en' as const, 'Children enrolling'],
    ['es' as const, 'Niños que se inscriben'],
  ])('names the children group after its heading in %s', (lang, heading) => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang={lang} />);

    const group = screen.getByRole('group', { name: heading });
    expect(within(group).getByRole('heading', { name: heading })).toBeTruthy();
  });

  it('shows errVisit on the empty group, focuses it, and does not submit when no visit is chosen', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await screen.findByRole('button', { name: 'Pick' });

    submitForm();

    expect(submitTrialBookingWithTimeout).not.toHaveBeenCalled();
    expect(
      screen.getByText('Please choose a day and arrival time.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      document.getElementById('visit-group-youth'),
    );
  });

  it('submits with the current language, matching bookings, and a uuid requestId, then shows and focuses the booked panel', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const receipt: TrialBookingReceipt = {
      lead_id: 'lead-1',
      visits: [
        {
          program_type: 'youth',
          booking_token: 'tok-1',
          appointment_date: '2099-01-05',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
      ],
    };
    vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
      data: receipt,
      error: null,
    });

    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await pickVisit();
    submitForm();

    await waitFor(() =>
      expect(submitTrialBookingWithTimeout).toHaveBeenCalledTimes(1),
    );
    const [params, timeoutMs] = vi.mocked(submitTrialBookingWithTimeout).mock
      .calls[0];
    expect(timeoutMs).toBe(12000);
    expect(params.language).toBe('en');
    expect(params.bookings).toEqual([
      { program_type: 'youth', slot_id: 's1', date: '2099-01-05' },
    ]);
    expect(params.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const region = await screen.findByRole('region');
    await waitFor(() => expect(document.activeElement).toBe(region));
    expect(
      screen.getByText(/Check your email at jane@example\.com/),
    ).toBeTruthy();
  });

  it('reuses the same requestId after a failed submit and mints a new one on a fresh mount', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
      data: null,
      error: { message: 'Submission timed out. Please try again.' },
    });

    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await pickVisit();
    submitForm();
    await waitFor(() =>
      expect(submitTrialBookingWithTimeout).toHaveBeenCalledTimes(1),
    );

    submitForm();
    await waitFor(() =>
      expect(submitTrialBookingWithTimeout).toHaveBeenCalledTimes(2),
    );

    const calls = vi.mocked(submitTrialBookingWithTimeout).mock.calls;
    const firstId = calls[0][0].requestId;
    const secondId = calls[1][0].requestId;
    expect(firstId).toBe(secondId);

    cleanup();
    vi.clearAllMocks();
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
      data: {
        lead_id: 'lead-2',
        visits: [
          {
            program_type: 'youth',
            booking_token: 'tok-2',
            appointment_date: '2099-01-05',
            appointment_time: '17:20:00',
            status: 'scheduled',
          },
        ],
      },
      error: null,
    });

    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await pickVisit();
    submitForm();
    await waitFor(() =>
      expect(submitTrialBookingWithTimeout).toHaveBeenCalledTimes(1),
    );
    const thirdId = vi.mocked(submitTrialBookingWithTimeout).mock.calls[0][0]
      .requestId;
    expect(thirdId).not.toBe(firstId);
  });

  it.each([
    ['23P01', undefined, 'Someone just booked that time. Please pick another.'],
    [
      undefined,
      'date_unavailable',
      'That day is no longer available. Please pick another.',
    ],
    [
      undefined,
      'slot_mismatch',
      'That day is no longer available. Please pick another.',
    ],
    [
      undefined,
      'invalid_booking_request',
      'That day is no longer available. Please pick another.',
    ],
  ] as const)(
    'clears the selection and bumps the refresh key for code=%s message=%s',
    async (code, message, expectedText) => {
      vi.mocked(getAppointmentSlots).mockResolvedValue([]);
      vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
        data: null,
        error: { message: message ?? 'slot gone', code },
      });

      render(<Wrapper lang="en" />);
      fillRequiredFields();
      await pickVisit();
      expect(screen.getByTestId('picker-value').textContent).toBe(
        's1|2099-01-05|17:20:00',
      );
      submitForm();

      // The same message appears twice: once in the submit alert, and once
      // as the affected group's inline error (its aria-describedby target),
      // since the submit alert sits below the notes field and is off-screen
      // after focus moves up to the group.
      const matches = await screen.findAllByText(expectedText);
      expect(matches).toHaveLength(2);
      const youthGroup = screen.getByRole('group', {
        name: 'Youth Program visit for Alex',
      });
      expect(within(youthGroup).getByText(expectedText)).toBeTruthy();
      expect(screen.getByTestId('picker-value').textContent).toBe('');
      expect(screen.getByTestId('picker-refresh-key').textContent).toBe('1');
      // Focus moves in a passive effect once `isSubmitting` has committed
      // back to false, which can land a tick after the text above appears.
      await waitFor(() =>
        expect(document.activeElement).toBe(
          document.getElementById('visit-group-youth'),
        ),
      );
      expect(
        (screen.getByLabelText(/Your name/) as HTMLInputElement).value,
      ).toBe('Jane Parent');
      expect(
        (screen.getByLabelText("Child's name 1") as HTMLInputElement).value,
      ).toBe('Alex');
    },
  );

  it.each([
    [
      'P0409',
      undefined,
      'We already have an upcoming visit booked under this email or phone number. Check your email for the details, or call us at (408) 620-0252 to change it.',
    ],
    [
      'P0429',
      undefined,
      'We recently received a request from you. Please wait a moment and try again, or call us directly.',
    ],
    [
      undefined,
      'a network error',
      'Unable to submit right now. Please try again or call us directly.',
    ],
  ] as const)(
    'shows the matching message for code=%s message=%s and keeps the selection',
    async (code, message, expectedText) => {
      vi.mocked(getAppointmentSlots).mockResolvedValue([]);
      vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
        data: null,
        error: { message: message ?? 'already booked', code },
      });

      render(<Wrapper lang="en" />);
      fillRequiredFields();
      await pickVisit();
      submitForm();

      expect(await screen.findByText(expectedText)).toBeTruthy();
      expect(screen.getByTestId('picker-value').textContent).toBe(
        's1|2099-01-05|17:20:00',
      );
    },
  );

  it('shows the phone consent line and references it from the phone field, adding the error id too once invalid', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);

    const phoneInput = screen.getByLabelText(/^Phone/);
    const consent = screen.getByText(
      'We may call or text this number about your visit.',
    );
    expect(consent.id).toBe('phone-consent');
    expect(phoneInput.getAttribute('aria-describedby')).toBe('phone-consent');

    fireEvent.change(screen.getByLabelText(/Your name/), {
      target: { value: 'Jane Parent' },
    });
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: 'jane@example.com' },
    });
    submitForm();

    expect(
      screen.getByText('Please enter a valid 10-digit U.S. phone number.'),
    ).toBeTruthy();
    expect(phoneInput.getAttribute('aria-describedby')).toBe(
      'phone-error phone-consent',
    );
  });

  it('keeps the chosen visit after the page language changes', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const { rerender } = render(<Wrapper lang="en" />);
    fillRequiredFields();
    await pickVisit();
    expect(screen.getByTestId('picker-value').textContent).toBe(
      's1|2099-01-05|17:20:00',
    );

    rerender(<Wrapper lang="es" />);

    expect(screen.getByTestId('picker-value').textContent).toBe(
      's1|2099-01-05|17:20:00',
    );
  });

  it('submits one booking per program for a mixed-age family', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    const receipt: TrialBookingReceipt = {
      lead_id: 'lead-3',
      visits: [
        {
          program_type: 'little_dragons',
          booking_token: 'tok-ld',
          appointment_date: '2099-01-05',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
        {
          program_type: 'youth',
          booking_token: 'tok-y',
          appointment_date: '2099-01-05',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
      ],
    };
    vi.mocked(submitTrialBookingWithTimeout).mockResolvedValue({
      data: receipt,
      error: null,
    });

    render(<Wrapper lang="en" />);
    fillTwoChildren();
    const littleGroup = await screen.findByRole('group', {
      name: 'Little Dragons visit for Mia',
    });
    const youthGroup = screen.getByRole('group', {
      name: 'Youth Program visit for Alex',
    });
    fireEvent.click(
      await within(littleGroup).findByRole('button', { name: 'Pick' }),
    );
    fireEvent.click(
      await within(youthGroup).findByRole('button', { name: 'Pick' }),
    );

    submitForm();

    await waitFor(() =>
      expect(submitTrialBookingWithTimeout).toHaveBeenCalledTimes(1),
    );
    const [params] = vi.mocked(submitTrialBookingWithTimeout).mock.calls[0];
    expect(params.bookings).toEqual([
      { program_type: 'little_dragons', slot_id: 's1', date: '2099-01-05' },
      { program_type: 'youth', slot_id: 's1', date: '2099-01-05' },
    ]);
  });

  it('focuses the first group and marks every group missing a choice when neither program has one', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);
    fillTwoChildren();
    await screen.findAllByRole('button', { name: 'Pick' });

    submitForm();

    expect(submitTrialBookingWithTimeout).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      document.getElementById('visit-group-little_dragons'),
    );
    const littleGroup = screen.getByRole('group', {
      name: 'Little Dragons visit for Mia',
    });
    const youthGroup = screen.getByRole('group', {
      name: 'Youth Program visit for Alex',
    });
    expect(
      within(littleGroup).getByText('Please choose a day and arrival time.'),
    ).toBeTruthy();
    expect(
      within(youthGroup).getByText('Please choose a day and arrival time.'),
    ).toBeTruthy();
  });

  it('marks and focuses only the group still missing a choice when the other already has one', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);
    fillTwoChildren();
    const littleGroup = await screen.findByRole('group', {
      name: 'Little Dragons visit for Mia',
    });
    fireEvent.click(
      await within(littleGroup).findByRole('button', { name: 'Pick' }),
    );

    submitForm();

    expect(submitTrialBookingWithTimeout).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      document.getElementById('visit-group-youth'),
    );
    const youthGroup = screen.getByRole('group', {
      name: 'Youth Program visit for Alex',
    });
    expect(
      within(youthGroup).getByText('Please choose a day and arrival time.'),
    ).toBeTruthy();
    expect(
      within(littleGroup).queryByText('Please choose a day and arrival time.'),
    ).toBeNull();
  });

  it('disables the submit button while the request is in flight', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    let resolveSubmit: (result: {
      data: TrialBookingReceipt | null;
      error: { message: string; code?: string } | null;
    }) => void = () => {};
    vi.mocked(submitTrialBookingWithTimeout).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await pickVisit();
    submitForm();

    const button = screen.getByRole('button', {
      name: 'Sending…',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    resolveSubmit({
      data: {
        lead_id: 'lead-4',
        visits: [
          {
            program_type: 'youth',
            booking_token: 'tok-4',
            appointment_date: '2099-01-05',
            appointment_time: '17:20:00',
            status: 'scheduled',
          },
        ],
      },
      error: null,
    });
    await screen.findByRole('region');
  });

  it('clears errVisit once a choice is made for that group', async () => {
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(<Wrapper lang="en" />);
    fillRequiredFields();
    await screen.findByRole('button', { name: 'Pick' });
    submitForm();
    expect(
      screen.getByText('Please choose a day and arrival time.'),
    ).toBeTruthy();

    await pickVisit();

    expect(
      screen.queryByText('Please choose a day and arrival time.'),
    ).toBeNull();
  });
});
