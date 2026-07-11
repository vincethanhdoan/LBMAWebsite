import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { BlockedDate } from '../../../lib/types'
import type { UpcomingBooking } from '../../../lib/supabase/queries'
import { useUpcomingBookings } from '../../../lib/hooks/leads'
import { pacificTodayISO } from '../../../lib/pacificTime'
import { PROGRAM_LABELS, formatGroupHeader, formatTimeShort } from '../leads/leadDisplay'

interface UpcomingBookingsProps {
  blocks: BlockedDate[]
}

interface DayGroup {
  dateKey: string
  bookings: UpcomingBooking[]
  blocks: BlockedDate[]
}

export function UpcomingBookings({ blocks }: UpcomingBookingsProps) {
  const navigate = useNavigate()
  const { data: bookings, isLoading, isError } = useUpcomingBookings()

  const groups = useMemo<DayGroup[]>(() => {
    const today = pacificTodayISO()
    const horizon = new Date(today + 'T12:00:00')
    horizon.setDate(horizon.getDate() + 56)
    const horizonKey = horizon.toISOString().slice(0, 10)

    const map = new Map<string, DayGroup>()
    const ensure = (dateKey: string): DayGroup => {
      let group = map.get(dateKey)
      if (!group) {
        group = { dateKey, bookings: [], blocks: [] }
        map.set(dateKey, group)
      }
      return group
    }

    for (const booking of bookings ?? []) {
      ensure(booking.appointment_date).bookings.push(booking)
    }
    for (const block of blocks) {
      if (block.end_date < today || block.start_date > horizonKey) continue
      // An in-progress block starts before today; surface it at today's position.
      ensure(block.start_date < today ? today : block.start_date).blocks.push(block)
    }

    return [...map.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [bookings, blocks])

  return (
    <div className="rounded-lg border p-5">
      <h3 className="font-semibold text-base mb-3">Upcoming Appointments</h3>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn't load upcoming appointments.</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming appointments in the next 8 weeks.</p>
      ) : (
        <div className="space-y-5">
          {groups.map(group => {
            const { label, isToday, isTomorrow } = formatGroupHeader(group.dateKey)
            const headerLabel = isToday ? `Today · ${label}` : isTomorrow ? `Tomorrow · ${label}` : label
            return (
              <div key={group.dateKey}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-bold tracking-wide uppercase ${isToday ? 'text-primary' : 'text-foreground/80'}`}>
                    {headerLabel}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-1.5">
                  {group.bookings.map(booking => (
                    <button
                      key={booking.booking_id}
                      type="button"
                      onClick={() => navigate('/admin?tab=leads&lead=' + booking.lead!.lead_id)}
                      className="w-full flex items-center justify-between gap-3 min-h-[44px] px-3 py-2 rounded border text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{booking.lead!.parent_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {PROGRAM_LABELS[booking.program_type]}
                          {booking.appointment_time && ` · ${formatTimeShort(booking.appointment_time)}`}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        booking.status === 'confirmed'
                          ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'}
                      </span>
                    </button>
                  ))}
                  {group.blocks.map(block => (
                    <div
                      key={block.block_id}
                      className="flex items-center min-h-[44px] px-3 py-2 rounded border border-dashed bg-muted/30 text-sm text-muted-foreground"
                    >
                      Blocked · {block.reason || 'No bookings'}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
