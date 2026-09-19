import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Loader2 } from 'lucide-react';
import { useUpdateLead } from '../../../lib/hooks/leads';
import type { EnrollmentLead } from '../../../lib/types';
import { LeadFormFields } from './LeadFormFields';
import {
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormValues,
} from './leadForm';

interface EditLeadModalProps {
  lead: EnrollmentLead;
  onSuccess: () => void;
  onCancel: () => void;
}

function initialValues(lead: EnrollmentLead): LeadFormValues {
  return {
    parentName: lead.parent_name,
    parentEmail: lead.parent_email ?? '',
    phone: lead.phone ?? '',
    children:
      lead.children.length > 0
        ? lead.children.map((c) => ({
            childId: c.child_id,
            name: c.name,
            age: String(c.age),
          }))
        : [
            {
              childId: null,
              name: lead.student_name ?? '',
              age: lead.student_age != null ? String(lead.student_age) : '',
            },
          ],
  };
}

export function EditLeadModal({
  lead,
  onSuccess,
  onCancel,
}: EditLeadModalProps) {
  const updateLead = useUpdateLead();
  const [values, setValues] = useState<LeadFormValues>(() =>
    initialValues(lead),
  );
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const loading = updateLead.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateLeadForm(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await updateLead.mutateAsync({
        leadId: lead.lead_id,
        parentName: values.parentName.trim(),
        parentEmail: values.parentEmail.trim() || null,
        phone: values.phone.trim() || null,
        children: values.children.map((c) => ({
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
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Edit lead details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <LeadFormFields
              idPrefix="el"
              values={values}
              errors={errors}
              disabled={loading}
              onChange={setValues}
            />
            <p className="text-xs text-muted-foreground">
              Booking links are not changed automatically. Re-send invites if
              programs changed.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
