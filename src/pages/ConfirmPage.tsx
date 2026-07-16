import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, CalendarX2, AlertTriangle } from 'lucide-react';
import { PROGRAM_LABELS } from '../lib/programs';

interface Appointment {
  program_type: string;
  appointment_date: string | null;
  appointment_time: string | null;
}

interface ConfirmResult {
  ok: boolean;
  already_confirmed: boolean;
  past?: boolean;
  appointments: Appointment[];
}

const CONFIRM_TIMEOUT_MS = 12000;

type ConfirmOutcome =
  | {
      state: 'confirmed' | 'already' | 'past';
      appointments: Appointment[];
    }
  | { state: 'invalid' | 'error' };

export function ConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<
    'loading' | 'confirmed' | 'already' | 'past' | 'invalid' | 'error'
  >(token ? 'loading' : 'invalid');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const hasFired = useRef(false);

  const runConfirm = useCallback(async (): Promise<ConfirmOutcome> => {
    if (!token) return { state: 'invalid' };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIRM_TIMEOUT_MS);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-appointment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (res.status === 404 || res.status === 422) return { state: 'invalid' };
      if (!res.ok) return { state: 'error' };

      const result = (await res.json()) as ConfirmResult;
      const appts = result.appointments ?? [];
      if (result.past) return { state: 'past', appointments: appts };
      return {
        state: result.already_confirmed ? 'already' : 'confirmed',
        appointments: appts,
      };
    } catch {
      clearTimeout(timeoutId);
      return { state: 'error' };
    }
  }, [token]);

  const applyOutcome = useCallback((outcome: ConfirmOutcome) => {
    if ('appointments' in outcome) {
      setAppointments(outcome.appointments);
    }
    setState(outcome.state);
  }, []);

  useEffect(() => {
    if (!token || hasFired.current) return;
    hasFired.current = true;
    runConfirm().then(applyOutcome);
  }, [token, runConfirm, applyOutcome]);

  function formatDate(d: string | null) {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(t: string | null) {
    if (!t) return '';
    return new Date('1970-01-01T' + t).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  const datedAppointments = appointments.filter((a) => a.appointment_date);
  const firstDate = datedAppointments[0]?.appointment_date ?? null;
  const multiple = datedAppointments.length > 1;

  function appointmentList() {
    return (
      <div className="space-y-2 text-left">
        {datedAppointments.map((a, i) => (
          <div key={i} className="rounded-lg border p-4">
            {a.program_type && PROGRAM_LABELS[a.program_type] && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {PROGRAM_LABELS[a.program_type]}
              </p>
            )}
            <p className="font-semibold text-base">
              {formatDate(a.appointment_date)}
            </p>
            {a.appointment_time && (
              <p className="text-muted-foreground text-sm">
                {formatTime(a.appointment_time)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="mx-auto h-16 w-auto"
          />
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            We couldn't reach our system just now. Don't worry — your
            appointment hasn't been affected. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => {
              setState('loading');
              runConfirm().then(applyOutcome);
            }}
            className="inline-block w-full bg-[#A01F23] text-white font-bold py-3 px-6 rounded text-sm"
          >
            Try again
          </button>
          <p className="text-xs text-muted-foreground">— LBMAA Team</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-3">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="mx-auto mb-2 h-16 w-auto"
          />
          <h1 className="text-xl font-bold">Link no longer valid</h1>
          <p className="text-muted-foreground text-sm">
            This link is no longer valid. Please contact LBMAA directly.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'already') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="mx-auto h-40 w-auto max-w-full"
          />
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            Already confirmed
          </h1>
          <p className="text-muted-foreground text-sm">
            {multiple
              ? "You've already confirmed your visits — we're looking forward to seeing you on both days."
              : `You've already confirmed your attendance — see you on ${formatDate(firstDate)}!`}
          </p>
          {multiple && appointmentList()}
        </div>
      </div>
    );
  }

  if (state === 'past') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <img
            src="/logo.png"
            alt="Los Banos Martial Arts Academy"
            className="mx-auto h-16 w-auto"
          />
          <CalendarX2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Lexend, sans-serif' }}
          >
            This appointment has passed
          </h1>
          <p className="text-muted-foreground text-sm">
            Please use the link below to choose a new date.
          </p>
          <a
            href={`/book/${token}`}
            className="inline-block w-full bg-[#A01F23] text-white font-bold py-3 px-6 rounded text-sm"
          >
            Reschedule
          </a>
          <p className="text-xs text-muted-foreground">— LBMAA Team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img
          src="/logo.png"
          alt="Los Banos Martial Arts Academy"
          className="mx-auto h-40 w-auto max-w-full"
        />
        <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'Lexend, sans-serif' }}
        >
          You're confirmed!
        </h1>
        {multiple && (
          <p className="text-muted-foreground text-sm">
            Both of your visits are confirmed — we can't wait to meet you.
          </p>
        )}
        {datedAppointments.length > 0 && appointmentList()}
        <p className="text-muted-foreground text-sm">
          See you then! — LBMAA Team
        </p>
        <p className="text-xs text-muted-foreground">
          Los Banos Martial Arts Academy · Los Banos, CA
        </p>
      </div>
    </div>
  );
}
