/**
 * @vitest-environment jsdom
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrialBookedPanel } from './TrialBookedPanel';
import { LanguageContext, translations } from './lang';
import type { Lang } from './lang';
import type { TrialBookingReceipt } from '../../lib/supabase/client';

function withLang(lang: Lang, ui: ReactNode) {
  return (
    <MemoryRouter>
      <LanguageContext.Provider
        value={{ lang, setLang: vi.fn(), t: translations[lang] }}
      >
        {ui}
      </LanguageContext.Provider>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('TrialBookedPanel', () => {
  it('shows everything for one visit', () => {
    const receipt: TrialBookingReceipt = {
      lead_id: 'lead-1',
      visits: [
        {
          program_type: 'youth',
          booking_token: 'tok-youth',
          appointment_date: '2026-09-25',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
      ],
    };

    render(
      withLang(
        'en',
        <TrialBookedPanel
          receipt={receipt}
          childrenByProgram={{ youth: ['Alex'] }}
          email="parent@example.com"
        />,
      ),
    );

    expect(screen.getByText("You're booked")).toBeTruthy();
    expect(
      screen.getByText("We're looking forward to meeting Alex."),
    ).toBeTruthy();
    expect(screen.getByText('Friday, September 25, 2026')).toBeTruthy();
    expect(screen.getByText('Please arrive at 5:20 PM.')).toBeTruthy();

    const changeLink = screen.getByRole('link', {
      name: 'View or change this visit',
    });
    expect(changeLink.getAttribute('href')).toBe('/book/tok-youth');

    const calendarLink = screen.getByRole('link', { name: 'Add to calendar' });
    expect(calendarLink.getAttribute('href')).toBe(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visit-calendar?token=tok-youth`,
    );

    expect(
      screen.getByText('1209 South 6th Street Suite E, Los Banos, CA 93635'),
    ).toBeTruthy();
    const mapsLink = screen.getByRole('link', { name: 'Open in Maps' });
    expect(mapsLink.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=1209+South+6th+St+Suite+E,+Los+Banos,+CA',
    );
    expect(mapsLink.getAttribute('target')).toBe('_blank');
    expect(mapsLink.getAttribute('rel')).toBe('noopener noreferrer');

    expect(screen.getByText('What to expect')).toBeTruthy();
    expect(
      screen.getByText(/Comfortable athletic clothes are all your child/),
    ).toBeTruthy();

    expect(
      screen.getByText(/We also emailed these details to parent@example\.com/),
    ).toBeTruthy();

    const callLink = screen.getByRole('link', {
      name: 'Questions? Call us at (408) 620-0252.',
    });
    expect(callLink.getAttribute('href')).toBe('tel:+14086200252');

    expect(document.body.textContent).not.toContain('$');
    expect(document.body.textContent?.toLowerCase()).not.toContain('free');
  });

  it('lists two visits in date order regardless of receipt order', () => {
    const receipt: TrialBookingReceipt = {
      lead_id: 'lead-1',
      visits: [
        {
          program_type: 'youth',
          booking_token: 'tok-youth',
          appointment_date: '2026-09-25',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
        {
          program_type: 'little_dragons',
          booking_token: 'tok-little',
          appointment_date: '2026-09-21',
          appointment_time: '09:00:00',
          status: 'scheduled',
        },
      ],
    };

    render(
      withLang(
        'en',
        <TrialBookedPanel
          receipt={receipt}
          childrenByProgram={{ youth: ['Alex'], little_dragons: ['Mia'] }}
          email="parent@example.com"
        />,
      ),
    );

    const dates = screen
      .getAllByText(/^(Monday|Friday), September/)
      .map((el) => el.textContent);
    expect(dates).toEqual([
      'Monday, September 21, 2026',
      'Friday, September 25, 2026',
    ]);

    expect(
      screen.getByText("We're looking forward to meeting Mia and Alex."),
    ).toBeTruthy();

    expect(
      screen.getAllByRole('link', { name: 'Add to calendar' }),
    ).toHaveLength(2);
  });

  it('renders Spanish strings and a Spanish date', () => {
    const receipt: TrialBookingReceipt = {
      lead_id: 'lead-1',
      visits: [
        {
          program_type: 'youth',
          booking_token: 'tok-youth',
          appointment_date: '2026-09-25',
          appointment_time: '17:20:00',
          status: 'scheduled',
        },
      ],
    };

    render(
      withLang(
        'es',
        <TrialBookedPanel
          receipt={receipt}
          childrenByProgram={{ youth: ['Alex'] }}
          email="parent@example.com"
        />,
      ),
    );

    expect(screen.getByText('Tu visita está reservada')).toBeTruthy();
    expect(
      screen.getByText('Tenemos muchas ganas de conocer a Alex.'),
    ).toBeTruthy();
    expect(screen.getByText('viernes, 25 de septiembre de 2026')).toBeTruthy();
    expect(screen.getByText('Por favor llega a las 5:20 p.m.')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Ver o cambiar esta visita' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Agregar al calendario' }),
    ).toBeTruthy();
    expect(screen.getByText('Dónde encontrarnos')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir en Mapas' })).toBeTruthy();
    expect(screen.getByText('Qué esperar')).toBeTruthy();
    expect(
      screen.getByRole('link', {
        name: '¿Preguntas? Llámanos al (408) 620-0252.',
      }),
    ).toBeTruthy();

    expect(document.body.textContent).not.toContain('$');
    expect(document.body.textContent?.toLowerCase()).not.toContain('gratis');
  });
});
