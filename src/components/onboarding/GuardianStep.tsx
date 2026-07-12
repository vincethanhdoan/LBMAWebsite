// src/components/onboarding/GuardianStep.tsx
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ArrowRight } from 'lucide-react';
import type { GuardianForm } from './FamilyOnboarding';

interface GuardianStepProps {
  email: string;
  values: GuardianForm;
  onChange: (updates: Partial<GuardianForm>) => void;
  onNext: () => void;
}

export function GuardianStep({
  email,
  values,
  onChange,
  onNext,
}: GuardianStepProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    firstName: !values.firstName.trim() ? 'First name is required' : null,
    lastName: !values.lastName.trim() ? 'Last name is required' : null,
    phone: !values.phone.trim() ? 'Phone number is required' : null,
  };

  function handleNext() {
    setTouched({ firstName: true, lastName: true, phone: true });
    if (!errors.firstName && !errors.lastName && !errors.phone) onNext();
  }

  return (
    <div>
      <p
        className="text-xs font-semibold tracking-wider uppercase text-primary mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Step 1 of 3
      </p>
      <h2
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        About You
      </h2>
      <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
        Tell us about the primary parent or guardian so the school can reach
        you.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ob-email">Email address</Label>
          <Input
            id="ob-email"
            value={email}
            disabled
            className="bg-muted text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ob-firstName">First name</Label>
            <Input
              id="ob-firstName"
              value={values.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
              autoComplete="given-name"
            />
            {touched.firstName && errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-lastName">Last name</Label>
            <Input
              id="ob-lastName"
              value={values.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
              autoComplete="family-name"
            />
            {touched.lastName && errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-phone">Phone number</Label>
          <Input
            id="ob-phone"
            type="tel"
            placeholder="(209) 555-0100"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            autoComplete="tel"
          />
          {touched.phone && errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-relationship">
            You are the child&apos;s{' '}
            <span className="text-muted-foreground font-normal text-xs">
              (optional)
            </span>
          </Label>
          <Select
            value={values.relationship}
            onValueChange={(val) =>
              onChange({ relationship: val as GuardianForm['relationship'] })
            }
          >
            <SelectTrigger id="ob-relationship">
              <SelectValue placeholder="Select relationship…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mother">Mother</SelectItem>
              <SelectItem value="father">Father</SelectItem>
              <SelectItem value="guardian">Guardian</SelectItem>
              <SelectItem value="grandparent">Grandparent</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8">
        <Button type="button" onClick={handleNext} className="w-full">
          Next: Your Children
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
