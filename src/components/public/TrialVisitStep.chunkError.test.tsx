/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TrialVisitStep } from './TrialVisitStep';
import { LanguageContext, translations } from './lang';
import type { Lang } from './lang';
import { getAppointmentSlots } from '../../lib/supabase/bookingQueries';

vi.mock('../../lib/supabase/bookingQueries', () => ({
  getAppointmentSlots: vi.fn(),
}));

// Stands in for a chunk request that never arrives: a stale hash after a
// deploy, or a dropped connection. The dynamic import rejects, which is what
// React.lazy turns into a throw during render. A browser caches a rejected
// import in its module map forever, so there is nothing to retry here.
vi.mock('../shared/VisitPicker', () => {
  throw new Error('Failed to fetch dynamically imported module');
});

function tree(lang: Lang) {
  return (
    <LanguageContext.Provider
      value={{ lang, setLang: vi.fn(), t: translations[lang] }}
    >
      <TrialVisitStep
        children={[{ name: 'Alex', age: '9' }]}
        value={{}}
        onChange={vi.fn()}
        errors={{}}
        refreshKey={0}
        disabled={false}
      />
    </LanguageContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TrialVisitStep when the calendar chunk fails to load', () => {
  it('shows the load error with the phone number and no retry button, instead of letting it reach the app root', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree('en'));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'We could not load the calendar. Please call us at (408) 620-0252 and we will book your visit for you.',
    );
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    // The rest of the step is still on screen, so nothing typed above is lost.
    expect(
      screen.getByRole('group', { name: 'Youth Program visit for Alex' }),
    ).toBeTruthy();
  });

  it('shows the Spanish load error for a Spanish render', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getAppointmentSlots).mockResolvedValue([]);
    render(tree('es'));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No pudimos cargar el calendario. Llámanos al (408) 620-0252 y nosotros reservamos tu visita.',
    );
    expect(
      screen.queryByRole('button', { name: /intentar de nuevo/i }),
    ).toBeNull();
  });
});
