// src/components/onboarding/ChildrenStep.tsx
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowRight, ArrowLeft, X, Plus } from 'lucide-react';
import type { ChildForm } from './FamilyOnboarding';

interface ChildrenStepProps {
  values: ChildForm[];
  onChange: (children: ChildForm[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function isValidDob(dob: string): boolean {
  if (!dob) return false;
  const d = new Date(dob);
  return !isNaN(d.getTime()) && d < new Date();
}

function isValidChild(child: ChildForm): boolean {
  return (
    child.firstName.trim() !== '' &&
    child.lastName.trim() !== '' &&
    isValidDob(child.dob)
  );
}

export function ChildrenStep({
  values,
  onChange,
  onNext,
  onBack,
}: ChildrenStepProps) {
  const [showErrors, setShowErrors] = useState(false);

  function updateChild(id: string, updates: Partial<ChildForm>) {
    onChange(values.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  function addChild() {
    onChange([
      ...values,
      { id: crypto.randomUUID(), firstName: '', lastName: '', dob: '' },
    ]);
  }

  function removeChild(id: string) {
    if (values.length <= 1) return;
    onChange(values.filter((c) => c.id !== id));
  }

  function handleNext() {
    setShowErrors(true);
    if (values.every(isValidChild)) onNext();
  }

  return (
    <div>
      <p
        className="text-xs font-semibold tracking-wider uppercase text-primary mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Step 2 of 3
      </p>
      <h2
        className="text-2xl font-semibold mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        Your Children
      </h2>
      <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
        Add the kids who will be training. You can always update this later.
      </p>

      <div className="space-y-3 mb-3">
        {values.map((child, index) => (
          <div
            key={child.id}
            className="bg-secondary rounded-xl p-4 border border-secondary-foreground/10"
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-xs font-bold tracking-wider uppercase text-primary"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Child {index + 1}
              </p>
              {values.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChild(child.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`ob-fn-${child.id}`} className="text-xs">
                    First name
                  </Label>
                  <Input
                    id={`ob-fn-${child.id}`}
                    value={child.firstName}
                    onChange={(e) =>
                      updateChild(child.id, { firstName: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                  {showErrors && !child.firstName.trim() && (
                    <p className="text-xs text-destructive">Required</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`ob-ln-${child.id}`} className="text-xs">
                    Last name
                  </Label>
                  <Input
                    id={`ob-ln-${child.id}`}
                    value={child.lastName}
                    onChange={(e) =>
                      updateChild(child.id, { lastName: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                  {showErrors && !child.lastName.trim() && (
                    <p className="text-xs text-destructive">Required</p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ob-dob-${child.id}`} className="text-xs">
                  Date of birth
                </Label>
                <Input
                  id={`ob-dob-${child.id}`}
                  type="date"
                  value={child.dob}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) =>
                    updateChild(child.id, { dob: e.target.value })
                  }
                  className="h-9 text-sm"
                />
                {showErrors && !isValidDob(child.dob) && (
                  <p className="text-xs text-destructive">
                    Valid date of birth required
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addChild}
        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary border-2 border-dashed border-primary/30 rounded-lg py-2.5 hover:border-primary/50 hover:bg-secondary/50 transition-colors mb-8"
      >
        <Plus className="w-4 h-4" /> Add another child
      </button>

      <div className="space-y-2">
        <Button type="button" onClick={handleNext} className="w-full">
          Next: Home Address
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    </div>
  );
}
