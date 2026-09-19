import { validateLeadContact } from '../../../lib/validation';

export type LeadFormChild = {
  childId: string | null;
  name: string;
  age: string;
};

export type LeadFormValues = {
  parentName: string;
  parentEmail: string;
  phone: string;
  children: LeadFormChild[];
};

export type LeadFormErrors = {
  parentName?: string;
  parentEmail?: string;
  phone?: string;
  children?: string;
};

export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};
  if (!values.parentName.trim()) errors.parentName = 'Required';

  const contact = validateLeadContact({
    email: values.parentEmail,
    phone: values.phone,
  });
  if (contact.email) errors.parentEmail = contact.email;
  if (contact.phone) errors.phone = contact.phone;

  if (values.children.length < 1)
    errors.children = 'At least one child is required.';
  for (const c of values.children) {
    const age = Number(c.age);
    if (!c.name.trim() || !c.age) {
      errors.children = 'Each child requires a name and age.';
      break;
    }
    if (!Number.isInteger(age) || age < 4 || age > 17) {
      errors.children = 'Child ages must be between 4 and 17.';
      break;
    }
  }
  return errors;
}
