import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Loader2, X, Plus } from 'lucide-react';
import { useUpdateLead } from '../../../lib/hooks/leads';
import type { EnrollmentLead } from '../../../lib/types';

interface EditLeadModalProps {
  lead: EnrollmentLead;
  onSuccess: () => void;
  onCancel: () => void;
}

type ChildRow = { childId: string | null; name: string; age: string };

function initialChildren(lead: EnrollmentLead): ChildRow[] {
  if (lead.children.length > 0) {
    return lead.children.map((c) => ({
      childId: c.child_id,
      name: c.name,
      age: String(c.age),
    }));
  }
  return [
    {
      childId: null,
      name: lead.student_name ?? '',
      age: lead.student_age != null ? String(lead.student_age) : '',
    },
  ];
}

export function EditLeadModal({
  lead,
  onSuccess,
  onCancel,
}: EditLeadModalProps) {
  const updateLead = useUpdateLead();
  const [parentName, setParentName] = useState(lead.parent_name);
  const [parentEmail, setParentEmail] = useState(lead.parent_email);
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [children, setChildren] = useState<ChildRow[]>(() =>
    initialChildren(lead),
  );
  const [errors, setErrors] = useState<{
    parentName?: string;
    parentEmail?: string;
    children?: string;
  }>({});
  const loading = updateLead.isPending;

  function addChild() {
    setChildren((prev) => [...prev, { childId: null, name: '', age: '' }]);
  }
  function removeChild(i: number) {
    setChildren((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateChildField(i: number, field: 'name' | 'age', value: string) {
    setChildren((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)),
    );
  }

  function validate() {
    const errs: {
      parentName?: string;
      parentEmail?: string;
      children?: string;
    } = {};
    if (!parentName.trim()) errs.parentName = 'Required';
    if (!parentEmail.trim()) errs.parentEmail = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail))
      errs.parentEmail = 'Invalid email';
    if (children.length < 1) errs.children = 'At least one child is required.';
    for (const c of children) {
      const age = Number(c.age);
      if (!c.name.trim() || !c.age) {
        errs.children = 'Each child requires a name and age.';
        break;
      }
      if (!Number.isInteger(age) || age < 4 || age > 17) {
        errs.children = 'Child ages must be between 4 and 17.';
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      await updateLead.mutateAsync({
        leadId: lead.lead_id,
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        phone: phone.trim() || null,
        children: children.map((c) => ({
          childId: c.childId,
          name: c.name.trim(),
          age: Number(c.age),
        })),
      });
      toast.success('Lead updated');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit lead details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="el-parent-name">Parent name *</Label>
              <Input
                id="el-parent-name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                onBlur={validate}
                className="mt-1"
              />
              {errors.parentName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.parentName}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="el-email">Email *</Label>
              <Input
                id="el-email"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                onBlur={validate}
                className="mt-1"
              />
              {errors.parentEmail && (
                <p className="text-xs text-destructive mt-1">
                  {errors.parentEmail}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="el-phone">Phone</Label>
            <Input
              id="el-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          {/* Children */}
          <div className="flex flex-col gap-2">
            <Label>
              Children <span className="text-destructive">*</span>
            </Label>
            {children.map((child, i) => {
              const age = Number(child.age);
              const progLabel = child.age
                ? age >= 4 && age <= 7
                  ? { text: 'Little Dragons · 4–7', color: '#6d28d9' }
                  : age >= 8 && age <= 17
                    ? { text: 'Youth Program · 8–17', color: '#1d4ed8' }
                    : { text: 'Age must be 4–17', color: '#dc2626' }
                : null;
              return (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Name"
                      value={child.name}
                      onChange={(e) =>
                        updateChildField(i, 'name', e.target.value)
                      }
                      disabled={loading}
                      required
                      className="flex-1 h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min={4}
                      max={17}
                      placeholder="Age"
                      value={child.age}
                      onChange={(e) =>
                        updateChildField(i, 'age', e.target.value)
                      }
                      disabled={loading}
                      required
                      className="w-16 h-9 text-sm"
                    />
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(i)}
                        disabled={loading}
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#fee2e2', color: '#ef4444' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {progLabel && (
                    <p
                      className="text-xs font-medium pl-0.5"
                      style={{ color: progLabel.color }}
                    >
                      {progLabel.text}
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={addChild}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-primary self-start hover:opacity-70"
            >
              <Plus className="w-3 h-3" /> Add another child
            </button>
            {errors.children && (
              <p className="text-xs text-destructive">{errors.children}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Booking links are not changed automatically. Re-send invites if
            programs changed.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
