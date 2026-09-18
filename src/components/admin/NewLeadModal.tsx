import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { createEnrollmentLead } from '../../lib/supabase/mutations';
import {
  getEnrollmentLeadById,
  findLeadsByEmail,
} from '../../lib/supabase/queries';
import {
  edgeFunctionUserAuthHeaders,
  supabase,
} from '../../lib/supabase/client';
import { queryKeys } from '../../lib/queryKeys';
import { formatShortDate } from '../../lib/format';
import { isValidEmail } from '../../lib/validation';
import type { EnrollmentLead } from '../../lib/types';
import { STATUS_LABELS, formatTimeShort } from './leads/leadDisplay';
import {
  LeadFormFields,
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormValues,
} from './leads/LeadFormFields';
import { PickDateModal } from './PickDateModal';

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
};

type PostAction = 'send_link' | 'pick_date' | 'create_only';

interface NewLeadModalProps {
  onSuccess: (lead: EnrollmentLead) => void;
  onCancel: () => void;
}

// Read-aloud summary of what was just booked, e.g.
// "Booked: Mia, Thursday, Sep 24 at 4:30 PM."
function bookedToast(lead: EnrollmentLead): string {
  const visits = lead.programBookings
    .filter(
      (b) =>
        (b.status === 'scheduled' || b.status === 'confirmed') &&
        b.appointment_date,
    )
    .map((b) => {
      const kids = lead.children
        .filter((c) => c.program_type === b.program_type)
        .map((c) => c.name)
        .join(' and ');
      const day = new Date(b.appointment_date + 'T12:00:00').toLocaleDateString(
        'en-US',
        { weekday: 'long', month: 'short', day: 'numeric' },
      );
      const at = b.appointment_time
        ? ` at ${formatTimeShort(b.appointment_time)}`
        : '';
      return `${kids || lead.parent_name}, ${day}${at}`;
    });
  const summary = `Booked: ${visits.join('; ')}.`;
  return lead.parent_email
    ? summary
    : `${summary} They won't get an email, so please remind them by phone.`;
}

export function NewLeadModal({ onSuccess, onCancel }: NewLeadModalProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LeadFormValues>({
    parentName: '',
    parentEmail: '',
    phone: '',
    children: [{ childId: null, name: '', age: '' }],
  });
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [notes, setNotes] = useState('');
  const [postAction, setPostAction] = useState<PostAction>('pick_date');
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  // Mirrors parentEmail so an in-flight duplicate check can detect the field changed.
  const parentEmailRef = useRef(values.parentEmail);
  const [createdLead, setCreatedLead] = useState<EnrollmentLead | null>(null);

  function handleChange(next: LeadFormValues) {
    if (next.parentEmail !== values.parentEmail) {
      parentEmailRef.current = next.parentEmail;
      setDuplicateWarning(null);
    }
    // Without an email there is no link to send; fall back to picking a date.
    if (!next.parentEmail.trim() && postAction === 'send_link')
      setPostAction('pick_date');
    setValues(next);
  }

  async function handleEmailBlur() {
    const email = values.parentEmail.trim();
    if (!email || !isValidEmail(email)) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const matches = await findLeadsByEmail(email);
      if (parentEmailRef.current.trim() !== email) return; // field changed while checking
      if (matches.length > 0) {
        const [newest] = matches;
        setDuplicateWarning(
          `A lead already exists for this email: ${newest.parent_name} (${STATUS_LABELS[newest.status]}, ${formatShortDate(newest.created_at)}).`,
        );
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Advisory only; a failed check never blocks creation.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateLeadForm(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const leadId = await createEnrollmentLead({
        parentName: values.parentName.trim(),
        parentEmail: values.parentEmail.trim() || null,
        phone: values.phone.trim() || undefined,
        notes: notes.trim() || undefined,
        children: values.children.map((c) => ({
          name: c.name.trim(),
          age: Number(c.age),
        })),
      });

      const leadData = await getEnrollmentLeadById(leadId);

      if (postAction === 'send_link') {
        const fnHeaders = await edgeFunctionUserAuthHeaders();
        if (!fnHeaders) {
          toast.error(
            'Session expired. Lead was created; sign in again to send the invite.',
          );
        } else {
          const { error: approveError } = await supabase.functions.invoke(
            'approve-enrollment-lead',
            {
              body: { leadId },
              headers: fnHeaders,
            },
          );
          if (approveError) {
            toast.error('Lead created but booking link failed to send');
          }
        }
        onSuccess(leadData);
      } else if (postAction === 'create_only') {
        onSuccess(leadData);
      } else if (postAction === 'pick_date') {
        setCreatedLead(leadData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickDateConfirm(
    bookings: Array<{
      programBookingId: string;
      slotId: string;
      appointmentDate: string;
    }>,
  ) {
    const fnHeaders = await edgeFunctionUserAuthHeaders();
    if (!fnHeaders) throw new Error('Session expired. Please sign in again.');

    let failedProgram: string | null = null;
    let slotTaken = false;
    for (const b of bookings) {
      const { error: bookError } = await supabase.functions.invoke(
        'admin-book-appointment',
        {
          body: {
            programBookingId: b.programBookingId,
            slotId: b.slotId,
            appointmentDate: b.appointmentDate,
          },
          headers: fnHeaders,
        },
      );
      if (bookError) {
        if (bookError instanceof FunctionsHttpError) {
          const body = await bookError.context.json().catch(() => null);
          if (body?.code === 'slot_taken') {
            slotTaken = true;
            break;
          }
        }
        const programType = createdLead?.programBookings.find(
          (pb) => pb.booking_id === b.programBookingId,
        )?.program_type;
        failedProgram = programType ? PROGRAM_LABELS[programType] : 'This';
        break;
      }
    }

    if (!createdLead) return;
    const updatedLead = await getEnrollmentLeadById(createdLead.lead_id);
    queryClient.invalidateQueries({ queryKey: queryKeys.enrollmentLeads() });

    if (slotTaken) {
      // Stay on the date step so staff can pick again with the parent present.
      setCreatedLead(updatedLead);
      toast.error('That time was just taken. Please pick another date.');
      return;
    }

    if (failedProgram) {
      setCreatedLead(updatedLead);
      toast.error(
        `${failedProgram} appointment could not be booked. The other bookings were saved. Please try again.`,
      );
      return;
    }

    toast.success(bookedToast(updatedLead));
    onSuccess(updatedLead);
  }

  const ctaLabel = loading
    ? undefined
    : postAction === 'send_link'
      ? 'Create & Send Link'
      : postAction === 'pick_date'
        ? 'Create & Pick Date'
        : 'Create Lead';

  if (createdLead) {
    return (
      <PickDateModal
        lead={createdLead}
        onConfirm={handlePickDateConfirm}
        onCancel={() => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.enrollmentLeads(),
          });
          onCancel();
        }}
      />
    );
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
            <DialogTitle>New enrollment lead</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <LeadFormFields
              idPrefix="nl"
              values={values}
              errors={errors}
              disabled={loading}
              onChange={handleChange}
              onEmailBlur={handleEmailBlur}
              emailNote={
                duplicateWarning && (
                  <p className="text-xs text-amber-700 mt-1">
                    {duplicateWarning}
                  </p>
                )
              }
            />
            <div>
              <Label htmlFor="nl-notes">Notes</Label>
              <Textarea
                id="nl-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>After creating</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(
                  [
                    'pick_date',
                    ...(values.parentEmail.trim() ? ['send_link'] : []),
                    'create_only',
                  ] as PostAction[]
                ).map((action) => (
                  <button
                    key={action}
                    type="button"
                    aria-pressed={postAction === action}
                    onClick={() => setPostAction(action)}
                    className={`px-3 min-h-11 rounded border text-sm transition-colors ${
                      postAction === action
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {action === 'send_link'
                      ? 'Send Booking Link'
                      : action === 'pick_date'
                        ? 'Pick Date for Them'
                        : 'Create Only'}
                  </button>
                ))}
              </div>
            </div>
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
                  Creating…
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
