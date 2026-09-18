/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  LeadFormFields,
  validateLeadForm,
  type LeadFormValues,
} from './LeadFormFields';

afterEach(cleanup);

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
      phone: 'Add a phone number, or an email above.',
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

describe('LeadFormFields', () => {
  it('marks email optional and explains what a blank email means', () => {
    render(
      <LeadFormFields
        idPrefix="t"
        values={valid}
        errors={{}}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Email (optional)')).toBeTruthy();
    expect(
      screen.getByText(
        "No email? That's fine. They won't get a confirmation or reminder, so please remind them by phone.",
      ),
    ).toBeTruthy();
    const phone = screen.getByLabelText('Phone *') as HTMLInputElement;
    expect(phone.type).toBe('tel');
  });

  it('drops the phone requirement marker once an email is entered', () => {
    render(
      <LeadFormFields
        idPrefix="t"
        values={{ ...valid, parentEmail: 'maria@example.com' }}
        errors={{}}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Phone')).toBeTruthy();
    expect(screen.queryByText(/No email\? That's fine/)).toBeNull();
  });

  it('names each remove-child button', () => {
    render(
      <LeadFormFields
        idPrefix="t"
        values={{
          ...valid,
          children: [
            { childId: null, name: 'Mia', age: '6' },
            { childId: null, name: '', age: '' },
          ],
        }}
        errors={{}}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove Mia' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove child' })).toBeTruthy();
  });
});
