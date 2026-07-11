import { useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Button } from '../../ui/button';
import { useCloseLead, useRecordAttendance } from '../../../lib/hooks/leads';
import type { EnrollmentLead } from '../../../lib/types';

export function RecordOutcomeButton({ lead, onClosed }: { lead: EnrollmentLead; onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  const recordAttendance = useRecordAttendance();
  const closeLead = useCloseLead();
  const busy = recordAttendance.isPending || closeLead.isPending;

  async function record(attendance: 'attended' | 'no_show') {
    try {
      await recordAttendance.mutateAsync({ leadId: lead.lead_id, attendance });
      toast.success(attendance === 'attended' ? 'Marked attended' : 'Marked no-show');
      setOpen(false);
    } catch {
      toast.error('Failed to record outcome');
    }
  }

  async function close() {
    try {
      await closeLead.mutateAsync(lead.lead_id);
      toast.success('Lead closed');
      setOpen(false);
      onClosed?.();
    } catch {
      toast.error('Failed to close lead');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="min-h-[36px]" onClick={e => e.stopPropagation()}>
          Record outcome
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2" onClick={e => e.stopPropagation()}>
        <p className="text-[11px] text-muted-foreground px-2 pb-2">Did they come in?</p>
        <div className="flex flex-col gap-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => record('attended')}>Attended</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => record('no_show')}>No-show</Button>
          <Button size="sm" variant="ghost" disabled={busy} className="text-muted-foreground" onClick={close}>
            Close lead
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
