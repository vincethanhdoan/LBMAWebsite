import { describe, it, expect } from 'vitest';
import { translations } from './lang';

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
      'visitHint',
      'visitRevealed',
      'visitRevealedTwo',
      'visitMoved',
      'visitNone',
      'errVisit',
      'errSlotTaken',
      'errDateGone',
      'errAlreadyBooked',
      'successHeading',
      'successBody',
      'successArrive',
      'successChange',
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
