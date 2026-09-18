export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUsPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return (
    digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
  );
}

// Contact rule for a lead that staff enter by hand: an email is optional, but
// a family with no email must have a phone number we can call.
export function validateLeadContact(input: { email: string; phone: string }): {
  email?: string;
  phone?: string;
} {
  const email = input.email.trim();
  const phone = input.phone.trim();
  const errors: { email?: string; phone?: string } = {};
  if (email && !isValidEmail(email)) {
    errors.email = 'This does not look like an email address.';
  }
  if (!email) {
    if (!phone) errors.phone = 'Add a phone number, or an email.';
    else if (!isValidUsPhone(phone))
      errors.phone = 'Enter a 10-digit phone number.';
  }
  return errors;
}
