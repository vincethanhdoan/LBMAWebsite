import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle2, CalendarX2 } from 'lucide-react'
import { supabase } from '../lib/supabase/client'

interface ConfirmResult {
  ok: boolean
  already_confirmed: boolean
  past?: boolean
  appointment_date: string | null
  appointment_time: string | null
}

export function ConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<'loading' | 'confirmed' | 'already' | 'past' | 'invalid'>(
    token ? 'loading' : 'invalid'
  )
  const [apptDate, setApptDate] = useState<string | null>(null)
  const [apptTime, setApptTime] = useState<string | null>(null)
  const hasFired = useRef(false)

  useEffect(() => {
    if (!token || hasFired.current) return
    hasFired.current = true
    supabase.functions.invoke('confirm-appointment', { body: { token } }).then(({ data, error }) => {
      if (error || !data?.ok) { setState('invalid'); return }
      const result = data as ConfirmResult
      setApptDate(result.appointment_date)
      setApptTime(result.appointment_time)
      if (result.past) { setState('past'); return }
      setState(result.already_confirmed ? 'already' : 'confirmed')
    })
  }, [token])

  function formatDate(d: string | null) {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  function formatTime(t: string | null) {
    if (!t) return ''
    return new Date('1970-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-3">
          <img src="/logo.png" alt="Los Banos Martial Arts Academy" className="mx-auto mb-2 h-16 w-auto" />
          <h1 className="text-xl font-bold">Link no longer valid</h1>
          <p className="text-muted-foreground text-sm">This link is no longer valid. Please contact LBMAA directly.</p>
        </div>
      </div>
    )
  }

  if (state === 'already') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <img src="/logo.png" alt="Los Banos Martial Arts Academy" className="mx-auto h-16 w-auto" />
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>Already confirmed</h1>
          <p className="text-muted-foreground text-sm">You've already confirmed your attendance — see you on {formatDate(apptDate)}!</p>
        </div>
      </div>
    )
  }

  if (state === 'past') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <img src="/logo.png" alt="Los Banos Martial Arts Academy" className="mx-auto h-16 w-auto" />
          <CalendarX2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>This appointment has passed</h1>
          <p className="text-muted-foreground text-sm">Please use the link below to choose a new date.</p>
          <a
            href={`/book/${token}`}
            className="inline-block w-full bg-[#A01F23] text-white font-bold py-3 px-6 rounded text-sm"
          >
            Reschedule
          </a>
          <p className="text-xs text-muted-foreground">— LBMAA Team</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img src="/logo.png" alt="Los Banos Martial Arts Academy" className="mx-auto h-80 w-auto max-w-full" />
        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>You're confirmed!</h1>
        {apptDate && (
          <div className="rounded-lg border p-5 text-left space-y-1">
            <p className="font-semibold text-base">{formatDate(apptDate)}</p>
            {apptTime && <p className="text-muted-foreground text-sm">{formatTime(apptTime)}</p>}
          </div>
        )}
        <p className="text-muted-foreground text-sm">See you then! — LBMAA Team</p>
        <p className="text-xs text-muted-foreground">Los Banos Martial Arts Academy · Los Banos, CA</p>
      </div>
    </div>
  )
}
