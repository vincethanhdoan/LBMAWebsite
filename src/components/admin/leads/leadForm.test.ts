import { describe, it, expect } from 'vitest';
import { validateLeadForm, type LeadFormValues } from './leadForm';

const valid: LeadFormValues = {
  parentName: 'Maria Lopez',
  parentEmail: '',
  phone: '(209) 555-0123',
  children: [{ childId: null, name: 'Mia', age: '6' }],
};

describe('validateLeadForm', () => {
  it('accepts a walk-in with a phone and no email', () => {
    expect(validateLeadForm(valid)).toEqual({});
  });
  it('requires a parent name', () => {
    expect(validateLeadForm({ ...valid, parentName: ' ' })).toEqual({
      parentName: 'Required',
    });
  });
  it('requires a phone when there is no email', () => {
    expect(validateLeadForm({ ...valid, phone: '' })).toEqual({
      phone: 'Add a phone number, or an email.',
    });
  });
  it('requires every child to have a name and an age from 4 to 17', () => {
    expect(
      validateLeadForm({
        ...valid,
        children: [{ childId: null, name: 'Mia', age: '3' }],
      }),
    ).toEqual({ children: 'Child ages must be between 4 and 17.' });
    expect(
      validateLeadForm({
        ...valid,
        children: [{ childId: null, name: '', age: '6' }],
      }),
    ).toEqual({ children: 'Each child requires a name and age.' });
  });
});
