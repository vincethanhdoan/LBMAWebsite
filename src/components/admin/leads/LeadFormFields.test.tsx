/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LeadFormFields } from './LeadFormFields';
import type { LeadFormValues } from './leadForm';

afterEach(cleanup);

const valid: LeadFormValues = {
  parentName: 'Maria Lopez',
  parentEmail: '',
  phone: '(209) 555-0123',
  children: [{ childId: null, name: 'Mia', age: '6' }],
};

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

  it('marks an invalid phone field with aria-invalid and a described error', () => {
    render(
      <LeadFormFields
        idPrefix="t"
        values={valid}
        errors={{ phone: 'Enter a 10-digit phone number.' }}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    const phone = screen.getByLabelText('Phone *') as HTMLInputElement;
    expect(phone.getAttribute('aria-invalid')).toBe('true');
    const describedBy = phone.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl?.textContent).toBe('Enter a 10-digit phone number.');
  });
});
