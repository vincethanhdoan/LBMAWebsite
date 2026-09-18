/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CallButton, NoEmailPill } from './ui';

afterEach(cleanup);

describe('CallButton', () => {
  it('is a tel link named after the person it calls', () => {
    render(<CallButton name="Maria Lopez" phone="(209) 555-0123" />);
    const link = screen.getByRole('link', {
      name: 'Call Maria Lopez at (209) 555-0123',
    });
    expect(link.getAttribute('href')).toBe('tel:+12095550123');
    expect(link.textContent).toContain('Call');
  });

  it('renders nothing without a dialable phone', () => {
    const { container } = render(<CallButton name="Maria" phone={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('NoEmailPill', () => {
  it('states the fact in plain words', () => {
    render(<NoEmailPill />);
    expect(screen.getByText('No email')).toBeTruthy();
  });
});
