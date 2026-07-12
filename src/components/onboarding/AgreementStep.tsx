import { useState } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ArrowRight } from 'lucide-react';

interface AgreementStepProps {
  onNext: () => void;
}

export function AgreementStep({ onNext }: AgreementStepProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div>
      <p
        className="text-xs font-semibold tracking-wider uppercase text-primary mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Before you begin
      </p>
      <h2
        className="text-2xl font-semibold mb-7"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        A few things first
      </h2>

      <div
        className="border-l-2 border-primary bg-secondary rounded-r-xl p-4 mb-6"
        role="note"
      >
        <p
          className="text-sm font-semibold mb-1"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Enable email notifications on your device
        </p>
        <p className="text-sm text-secondary-foreground leading-relaxed">
          All updates from this portal are sent to your email. Make sure email
          notifications are enabled on your phone or personal device so you
          don't miss anything.
        </p>
      </div>

      <div className="flex items-start gap-3 mb-8">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5 flex-shrink-0"
        />
        <Label
          htmlFor="agree"
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer font-normal"
        >
          I agree to LBMAA's{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
          >
            Terms of Use
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
          >
            Privacy Policy
          </a>
          .
        </Label>
      </div>

      <Button
        type="button"
        onClick={onNext}
        disabled={!agreed}
        className="w-full"
      >
        Get Started
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
