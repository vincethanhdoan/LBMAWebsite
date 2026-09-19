import { describe, it, expect } from 'vitest';
import { programForAge, programsForChildren } from './programs';
import { translations } from '../components/public/lang';

describe('programForAge', () => {
  it('returns null below the little dragons floor', () => {
    expect(programForAge(3)).toBe(null);
  });
  it('returns little_dragons at the floor', () => {
    expect(programForAge(4)).toBe('little_dragons');
  });
  it('returns little_dragons at the top of its range', () => {
    expect(programForAge(7)).toBe('little_dragons');
  });
  it('returns youth at the floor', () => {
    expect(programForAge(8)).toBe('youth');
  });
  it('returns youth at the top of its range', () => {
    expect(programForAge(17)).toBe('youth');
  });
  it('returns null above the youth ceiling', () => {
    expect(programForAge(18)).toBe(null);
  });
});

describe('programsForChildren', () => {
  it('ignores a row with a blank age', () => {
    expect(programsForChildren([{ name: 'Mia', age: '' }])).toEqual([]);
  });

  it('ignores a row with a non-integer age', () => {
    expect(programsForChildren([{ name: 'Mia', age: '5.5' }])).toEqual([]);
    expect(programsForChildren([{ name: 'Mia', age: 'five' }])).toEqual([]);
  });

  it('ignores a row with an out-of-range age', () => {
    expect(programsForChildren([{ name: 'Mia', age: '3' }])).toEqual([]);
    expect(programsForChildren([{ name: 'Mia', age: '18' }])).toEqual([]);
  });

  it('groups two children in the same program under one entry', () => {
    expect(
      programsForChildren([
        { name: 'Mia', age: '5' },
        { name: 'Leo', age: '6' },
      ]),
    ).toEqual([{ program: 'little_dragons', childNames: ['Mia', 'Leo'] }]);
  });

  it('returns one entry per program, little_dragons first, when one child is in each', () => {
    expect(
      programsForChildren([
        { name: 'Leo', age: '10' },
        { name: 'Mia', age: '5' },
      ]),
    ).toEqual([
      { program: 'little_dragons', childNames: ['Mia'] },
      { program: 'youth', childNames: ['Leo'] },
    ]);
  });

  it('trims child names', () => {
    expect(programsForChildren([{ name: '  Mia  ', age: '5' }])).toEqual([
      { program: 'little_dragons', childNames: ['Mia'] },
    ]);
  });

  it('still surfaces the program for a valid age with an empty name', () => {
    expect(programsForChildren([{ name: '', age: '5' }])).toEqual([
      { program: 'little_dragons', childNames: [] },
    ]);
  });

  it('still surfaces the program for a valid age with a whitespace-only name', () => {
    expect(programsForChildren([{ name: '   ', age: '5' }])).toEqual([
      { program: 'little_dragons', childNames: [] },
    ]);
  });
});

describe('lang.tsx contact translations', () => {
  it('has exactly the same keys in English and Spanish', () => {
    const enKeys = Object.keys(translations.en.contact).sort();
    const esKeys = Object.keys(translations.es.contact).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('contains no price or "free" claims in the new or changed visit-step keys', () => {
    const forbidden = /\$|free|gratis/i;
    const keysToCheck = [
      'formSub',
      'submit',
      'phoneConsent',
      'visitHeading',
      'visitSub',
      'visitFor',
      'visitNeedsAge',
      'visitNone',
      'errVisit',
      'errSlotTaken',
      'errDateGone',
      'errAlreadyBooked',
      'successHeading',
      'successBody',
      'successArrive',
      'successChange',
      'successCalendar',
      'successWhere',
      'successMaps',
      'successExpectHeading',
      'successExpectBody',
      'successEmailNote',
      'successCall',
    ] as const;
    for (const lang of ['en', 'es'] as const) {
      const contact = translations[lang].contact as Record<string, unknown>;
      for (const key of keysToCheck) {
        const value = contact[key];
        expect(typeof value, `${lang}.contact.${key} should exist`).toBe(
          'string',
        );
        expect(
          forbidden.test(value as string),
          `${lang}.contact.${key}: "${value as string}"`,
        ).toBe(false);
      }
    }
  });
});
