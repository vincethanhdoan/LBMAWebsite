import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUsPhone,
  validateLeadContact,
} from './validation';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('maria@example.com')).toBe(true);
  });
  it('rejects text that is not an address', () => {
    expect(isValidEmail('n/a')).toBe(false);
    expect(isValidEmail('maria@')).toBe(false);
    expect(isValidEmail('maria @example.com')).toBe(false);
  });
});

describe('isValidUsPhone', () => {
  it('accepts 10 digits in any formatting', () => {
    expect(isValidUsPhone('(209) 555-0123')).toBe(true);
    expect(isValidUsPhone('209.555.0123')).toBe(true);
  });
  it('accepts 11 digits starting with 1', () => {
    expect(isValidUsPhone('1-209-555-0123')).toBe(true);
  });
  it('rejects short, long, and non-US numbers', () => {
    expect(isValidUsPhone('555-0123')).toBe(false);
    expect(isValidUsPhone('2-209-555-0123')).toBe(false);
    expect(isValidUsPhone('')).toBe(false);
  });
});

describe('validateLeadContact', () => {
  it('passes with an email and no phone', () => {
    expect(validateLeadContact({ email: 'a@b.co', phone: '' })).toEqual({});
  });
  it('passes with a phone and no email', () => {
    expect(validateLeadContact({ email: '', phone: '2095550123' })).toEqual({});
  });
  it('asks for a phone when both are blank', () => {
    expect(validateLeadContact({ email: ' ', phone: ' ' })).toEqual({
      phone: 'Add a phone number, or an email.',
    });
  });
  it('rejects a malformed email even when a phone is given', () => {
    expect(validateLeadContact({ email: 'n/a', phone: '2095550123' })).toEqual({
      email: 'This does not look like an email address.',
    });
  });
  it('rejects a malformed phone when it is the only contact', () => {
    expect(validateLeadContact({ email: '', phone: '555' })).toEqual({
      phone: 'Enter a 10-digit phone number.',
    });
  });
  it('leaves an optional phone unvalidated when an email is present', () => {
    expect(validateLeadContact({ email: 'a@b.co', phone: '555' })).toEqual({});
  });
});
