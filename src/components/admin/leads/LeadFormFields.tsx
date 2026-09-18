import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { validateLeadContact } from '../../../lib/validation';
import { PROGRAM_BADGE_STYLES } from './leadDisplay';

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

// eslint-disable-next-line react-refresh/only-export-components
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

function programHint(ageText: string): { text: string; cls: string } | null {
  if (!ageText) return null;
  const age = Number(ageText);
  if (age >= 4 && age <= 7)
    return {
      text: 'Little Dragons · 4 to 7',
      cls: PROGRAM_BADGE_STYLES.little_dragons,
    };
  if (age >= 8 && age <= 17)
    return { text: 'Youth Program · 8 to 17', cls: PROGRAM_BADGE_STYLES.youth };
  return { text: 'Age must be 4 to 17', cls: 'text-destructive' };
}

export function LeadFormFields({
  idPrefix,
  values,
  errors,
  disabled,
  onChange,
  onEmailBlur,
  emailNote,
}: {
  idPrefix: string;
  values: LeadFormValues;
  errors: LeadFormErrors;
  disabled: boolean;
  onChange: (values: LeadFormValues) => void;
  onEmailBlur?: () => void;
  // Advisory line under the email field, e.g. the duplicate-lead warning.
  emailNote?: ReactNode;
}) {
  const noEmail = !values.parentEmail.trim();

  function setChild(i: number, patch: Partial<LeadFormChild>) {
    onChange({
      ...values,
      children: values.children.map((c, idx) =>
        idx === i ? { ...c, ...patch } : c,
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`${idPrefix}-parent-name`}>Parent name *</Label>
        <Input
          id={`${idPrefix}-parent-name`}
          autoFocus
          autoComplete="off"
          value={values.parentName}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, parentName: e.target.value })}
          className="mt-1"
        />
        {errors.parentName && (
          <p className="text-xs text-destructive mt-1">{errors.parentName}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-phone`}>
            {noEmail ? 'Phone *' : 'Phone'}
          </Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={values.phone}
            disabled={disabled}
            onChange={(e) => onChange({ ...values, phone: e.target.value })}
            className="mt-1"
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-email`}>Email (optional)</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={values.parentEmail}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...values, parentEmail: e.target.value })
            }
            onBlur={onEmailBlur}
            className="mt-1"
          />
          {errors.parentEmail && (
            <p className="text-xs text-destructive mt-1">
              {errors.parentEmail}
            </p>
          )}
          {emailNote}
        </div>
      </div>
      {noEmail && (
        <p className="text-xs text-muted-foreground">
          {
            "No email? That's fine. They won't get a confirmation or reminder, so please remind them by phone."
          }
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label>
          Children <span className="text-destructive">*</span>
        </Label>
        {values.children.map((child, i) => {
          const hint = programHint(child.age);
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`Child ${i + 1} name`}
                  placeholder="Name"
                  autoComplete="off"
                  value={child.name}
                  disabled={disabled}
                  onChange={(e) => setChild(i, { name: e.target.value })}
                  className="flex-1 h-11 text-sm"
                />
                <Input
                  aria-label={`Child ${i + 1} age`}
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={17}
                  placeholder="Age"
                  value={child.age}
                  disabled={disabled}
                  onChange={(e) => setChild(i, { age: e.target.value })}
                  className="w-20 h-11 text-sm"
                />
                {values.children.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${child.name.trim() || 'child'}`}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...values,
                        children: values.children.filter((_, idx) => idx !== i),
                      })
                    }
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {hint && (
                <span
                  className={`self-start text-xs font-medium rounded px-1.5 py-0.5 ${hint.cls}`}
                >
                  {hint.text}
                </span>
              )}
            </div>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...values,
              children: [
                ...values.children,
                { childId: null, name: '', age: '' },
              ],
            })
          }
          className="flex items-center gap-1 text-sm text-primary self-start min-h-11 hover:opacity-70"
        >
          <Plus className="w-4 h-4" /> Add another child
        </button>
        {errors.children && (
          <p className="text-xs text-destructive">{errors.children}</p>
        )}
      </div>
    </div>
  );
}
