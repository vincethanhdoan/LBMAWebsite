import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { getProgramBookingByToken, getAppointmentSlots } from '../lib/supabase/queries'
import { BookingCalendar } from '../components/shared/BookingCalendar'
import type { AppointmentSlot } from '../lib/types'

const PROGRAM_LABELS: Record<string, string> = {
  little_dragons: 'Little Dragons',
  youth: 'Youth Program',
}

interface BookingInfo {
  booking_id: string
  program_type: 'little_dragons' | 'youth'
  status: string
  appointment_date: string | null
  appointment_time: string | null
  parent_name: string
  child_names: string[]
}

export function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState<{ date: string; time: string } | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return }
    getProgramBookingByToken(token).then(data => {
      if (!data) { setError('This booking link is no longer valid.'); setLoading(false); return }
      setBooking(data as BookingInfo)
      if (['scheduled', 'confirmed'].includes(data.status) && data.appointment_date) {
        setBooked({ date: data.appointment_date, time: data.appointment_time ?? '' })
      }
      setLoading(false)
    })
  }, [token])

  useEffect(() => {
    if (!booking || !['pending', 'link_sent', 'scheduled', 'confirmed'].includes(booking.status)) return
    getAppointmentSlots(booking.program_type)
      .then(setSlots)
      .catch(() => setError('Failed to load available dates. Please refresh.'))
  }, [booking])

  async function handleBook(slotId: string, date: string) {
    if (!token) return
    setSubmitting(true)
    try {
      setError(null)
      const { data, error: fnError } = await supabase.functions.invoke('book-appointment', {
        body: { token, slotId, appointmentDate: date },
      })
      if (fnError) throw fnError
      setBooked({ date: data.appointment_date, time: data.appointment_time })
      setBooking(prev => prev ? { ...prev, status: data.status, appointment_date: data.appointment_date, appointment_time: data.appointment_time } : prev)
      setShowReschedule(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const programLabel = booking ? PROGRAM_LABELS[booking.program_type] ?? booking.program_type : ''
  const childList = booking?.child_names.join(' & ') ?? ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold mb-2">Link unavailable</h1>
          <p className="text-muted-foreground text-sm">{error ?? 'This booking link is no longer valid.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-1">Los Banos Martial Arts Academy</p>
          <h1 className="text-2xl font-bold">Book your {programLabel} intro</h1>
          {childList && <p className="text-muted-foreground mt-1">for {childList}</p>}
        </div>

        {booked && !showReschedule ? (
          <div className="border border-border rounded-xl p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your appointment</p>
              <p className="text-xl font-semibold">
                {new Date(booked.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {booked.time && (
                <p className="text-muted-foreground">
                  {new Date('1970-01-01T' + booked.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowReschedule(true)}
              className="text-sm text-primary hover:underline"
            >
              Need to reschedule?
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {showReschedule && (
              <button onClick={() => setShowReschedule(false)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
            )}
            <BookingCalendar
              slots={slots}
              onConfirm={handleBook}
              submitting={submitting}
              confirmLabel="Confirm Appointment"
              showAutoConfirmBadge
            />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
