import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { VisitPicker } from './VisitPicker';
import type { VisitChoice } from './VisitPicker';
import type { AppointmentSlot } from '../../lib/types';

interface BookingCalendarProps {
  slots: AppointmentSlot[];
  onConfirm: (slotId: string, date: string) => Promise<void>;
  submitting: boolean;
  confirmLabel?: string;
  allowToday?: boolean;
}

export function BookingCalendar({
  slots,
  onConfirm,
  submitting,
  confirmLabel = 'Confirm Booking',
  allowToday = false,
}: BookingCalendarProps) {
  const [choice, setChoice] = useState<VisitChoice | null>(null);

  async function handleConfirm() {
    if (!choice) return;
    await onConfirm(choice.slotId, choice.date);
  }

  return (
    <div>
      <VisitPicker
        slots={slots}
        value={choice}
        onChange={setChoice}
        language="en"
        allowToday={allowToday}
        emptyMessage="There are no open visit times right now. Please contact us directly."
      />

      {choice && (
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full mt-3"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming…
            </>
          ) : (
            confirmLabel
          )}
        </Button>
      )}
    </div>
  );
}
