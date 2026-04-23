import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Loader2 } from 'lucide-react'
import { getAppointmentSlots } from '../../lib/supabase/queries'
import { BookingCalendar } from '../shared/BookingCalendar'
import type { EnrollmentLead, AppointmentSlot, EnrollmentLeadProgramBooking } from '../../lib/types'

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

const PROGRAM_SECTION_STYLES: Record<string, string> = {
  little_dragons: 'border-purple-200 bg-purple-50/40',
  youth: 'border-blue-200 bg-blue-50/40',
}

const PROGRAM_BADGE_STYLES: Record<string, string> = {
  little_dragons: 'bg-purple-100 text-purple-700',
  youth: 'bg-blue-100 text-blue-700',
}

type ProgramSlotMap = Record<string, AppointmentSlot[]>

type Selection = Record<string, { slotId: string; date: string } | null>

interface PickDateModalProps {
  lead: EnrollmentLead
  onConfirm: (bookings: Array<{ programBookingId: string; slotId: string; appointmentDate: string }>) => Promise<void>
  onCancel: () => void
}

export function PickDateModal({ lead, onConfirm, onCancel }: PickDateModalProps) {
  const [slotMap, setSlotMap] = useState<ProgramSlotMap>({})
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>({})
  const [loading, setLoading] = useState(false)

  const programBookings: EnrollmentLeadProgramBooking[] = lead.programBookings ?? []

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(
          programBookings.map(async (b) => {
            const slots = await getAppointmentSlots(b.program_type)
            return [b.program_type, slots] as const
          })
        )
        setSlotMap(Object.fromEntries(results))
      } catch {
        setFetchError('Failed to load available slots.')
      } finally {
        setFetching(false)
      }
    }
    if (programBookings.length > 0) load()
    else setFetching(false)
  }, [lead.lead_id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    const picked = programBookings
      .filter(b => selection[b.booking_id])
      .map(b => ({
        programBookingId: b.booking_id,
        slotId: selection[b.booking_id]!.slotId,
        appointmentDate: selection[b.booking_id]!.date,
      }))
    if (picked.length === 0) return
    setLoading(true)
    try {
      await onConfirm(picked)
    } catch {
      setFetchError('Failed to book appointment(s). Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const anyPicked = programBookings.some(b => !!selection[b.booking_id])

  // Legacy lead fallback — no program bookings
  if (!fetching && programBookings.length === 0) {
    return (
      <Dialog open onOpenChange={open => { if (!open) onCancel() }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pick appointment date — {lead.parent_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This lead has no program bookings. Use the legacy flow or re-submit.</p>
          <DialogFooter><Button variant="ghost" onClick={onCancel}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pick appointment dates — {lead.parent_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {fetching ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            programBookings.map(booking => (
              <div
                key={booking.booking_id}
                className={`border rounded-lg p-3 ${PROGRAM_SECTION_STYLES[booking.program_type] ?? 'border-border bg-muted/20'}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PROGRAM_BADGE_STYLES[booking.program_type]}`}>
                    {PROGRAM_LABELS[booking.program_type]}
                  </span>
                  <span className="text-sm font-medium">
                    {lead.children
                      ?.filter(c => c.program_type === booking.program_type)
                      .map(c => c.name)
                      .join(' & ')}
                  </span>
                </div>
                <BookingCalendar
                  slots={slotMap[booking.program_type] ?? []}
                  onConfirm={async (slotId, date) => {
                    setSelection(prev => ({ ...prev, [booking.booking_id]: { slotId, date } }))
                  }}
                  submitting={false}
                  confirmLabel="Select this date"
                  showAutoConfirmBadge={false}
                />
                {selection[booking.booking_id] && (
                  <p className="text-xs text-green-600 font-medium mt-2">
                    ✓ Selected: {new Date(selection[booking.booking_id]!.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            ))
          )}

          {fetchError && <p className="text-sm text-destructive text-center">{fetchError}</p>}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!anyPicked || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm {Object.values(selection).filter(Boolean).length > 1 ? 'All' : 'Selection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
