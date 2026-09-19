import { describe, it, expect } from 'vitest';
import { telHref, reminderSmsHref } from './contactLinks';

describe('telHref', () => {
  it('builds an E.164 tel link from a formatted US number', () => {
    expect(telHref('(209) 555-0123')).toBe('tel:+12095550123');
    expect(telHref('1-209-555-0123')).toBe('tel:+12095550123');
  });
  it('returns null for a number it cannot dial', () => {
    expect(telHref('555-0123')).toBeNull();
  });
});

describe('reminderSmsHref', () => {
  const base = {
    phone: '(209) 555-0123',
    parentName: 'Maria Lopez',
    childNames: ['Mia'],
    dateKey: '2026-09-24',
    time: '16:30:00',
    language: 'en' as const,
  };

  it('addresses the parent by first name and states the visit', () => {
    const href = reminderSmsHref(base)!;
    expect(href.startsWith('sms:+12095550123?&body=')).toBe(true);
    const body = decodeURIComponent(href.split('body=')[1]);
    expect(body).toBe(
      "Hi Maria, this is Los Banos Martial Arts. We're looking forward to seeing Mia on Thursday, Sep 24 at 4:30 PM. Please reply to let us know you're still coming, or call us at (408) 620-0252 if you need a different day.",
    );
  });

  it('joins several children naturally', () => {
    const body = decodeURIComponent(
      reminderSmsHref({ ...base, childNames: ['Mia', 'Alex', 'Sam'] })!.split(
        'body=',
      )[1],
    );
    expect(body).toContain('seeing Mia, Alex and Sam on');
  });

  it('falls back to "your family" and omits the time when unknown', () => {
    const body = decodeURIComponent(
      reminderSmsHref({ ...base, childNames: [], time: null })!.split(
        'body=',
      )[1],
    );
    expect(body).toContain('seeing your family on Thursday, Sep 24.');
  });

  it('returns null when the phone cannot be texted', () => {
    expect(reminderSmsHref({ ...base, phone: '' })).toBeNull();
  });
});

describe('reminderSmsHref in Spanish', () => {
  const base = {
    phone: '(209) 555-0123',
    parentName: 'Maria Lopez',
    childNames: ['Mia'],
    dateKey: '2026-09-24',
    time: '16:30:00',
    language: 'es' as const,
  };

  it('greets informally, states the visit in Spanish, and keeps the school phone', () => {
    const href = reminderSmsHref(base)!;
    const body = decodeURIComponent(href.split('body=')[1]);
    expect(body).toBe(
      'Hola Maria, te escribimos de Los Banos Martial Arts. Tenemos muchas ganas de ver a Mia el jueves, 24 de sept, a las 4:30 p.m. Por favor responde para confirmar que vienen, o llámanos al (408) 620-0252 si necesitan otro día.',
    );
    expect(body).toContain('Mia');
    expect(body).toContain('jueves');
    expect(body).toContain('4:30');
    expect(body).toContain('(408) 620-0252');
  });
});
