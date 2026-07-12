// src/components/onboarding/AddressStep.tsx
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { AddressForm } from './FamilyOnboarding';

interface AddressStepProps {
  values: AddressForm;
  onChange: (updates: Partial<AddressForm>) => void;
  onFinish: () => void;
  onSkip: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}

export function AddressStep({
  values,
  onChange,
  onFinish,
  onSkip,
  onBack,
  submitting,
  error,
}: AddressStepProps) {
  return (
    <div>
      <p
        className="text-xs font-semibold tracking-wider uppercase text-primary mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Step 3 of 3
      </p>
      <h2
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Home Address
      </h2>
      <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
        Used for school records only. You can skip this and add it later from
        your profile.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ob-street">Street address</Label>
          <Input
            id="ob-street"
            placeholder="123 Main St"
            value={values.street}
            onChange={(e) => onChange({ street: e.target.value })}
            disabled={submitting}
            autoComplete="street-address"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-city">City</Label>
          <Input
            id="ob-city"
            placeholder="Los Banos"
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            disabled={submitting}
            autoComplete="address-level2"
          />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ob-state">State</Label>
            <Input
              id="ob-state"
              value={values.state}
              onChange={(e) => onChange({ state: e.target.value })}
              disabled={submitting}
              autoComplete="address-level1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-zip">ZIP code</Label>
            <Input
              id="ob-zip"
              placeholder="93635"
              value={values.zip}
              onChange={(e) => onChange({ zip: e.target.value })}
              disabled={submitting}
              autoComplete="postal-code"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <Button
          type="button"
          onClick={onFinish}
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" /> Finish Setup
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="w-full"
          disabled={submitting}
        >
          Skip for now
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground"
          disabled={submitting}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    </div>
  );
}
