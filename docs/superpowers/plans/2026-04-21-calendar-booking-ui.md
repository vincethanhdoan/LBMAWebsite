# Calendar Booking UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable date-button list in the enrollment booking flow with a classic month-grid calendar, in both the prospect-facing BookingPage and the admin PickDateModal.

**Architecture:** A shared `BookingCalendar` component owns all date-fetching and calendar rendering. It fetches available dates for all slots in parallel, merges them into a single map, and hands a highlighted month grid to the user. `BookingPage` and `PickDateModal` each strip out their old date-picker logic and drop in `BookingCalendar`.

**Tech Stack:** React 19, react-day-picker v9 (new dependency), Tailwind CSS, lucide-react, existing shadcn/ui Button component.

---

## File map

| Action | File | Purpose |
|---|---|---|
| Install | `package.json` | Add react-day-picker dependency |
| Create | `src/components/shared/BookingCalendar.tsx` | Shared calendar component |
| Create | `src/components/shared/booking-calendar.css` | CSS overrides for react-day-picker |
| Modify | `src/pages/BookingPage.tsx` | Replace datePickerSection with BookingCalendar |
| Modify | `src/components/admin/PickDateModal.tsx` | Replace date list with BookingCalendar |

---

## Task 1: Install react-day-picker

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install react-day-picker
```

Expected output: `added 1 package` (react-day-picker has zero runtime dependencies)

- [ ] **Step 2: Verify the app still builds**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-day-picker"
```

---

## Task 2: Create BookingCalendar component

**Files:**
- Create: `src/components/shared/BookingCalendar.tsx`
- Create: `src/components/shared/booking-calendar.css`

- [ ] **Step 1: Create the CSS override file**

Create `src/components/shared/booking-calendar.css` with this exact content:

```css
/* Scope all overrides to our wrapper class to avoid polluting global styles */
.booking-calendar {
  --rdp-accent-color: #c8102e;
  --rdp-accent-background-color: #fef2f2;
  --rdp-today-color: #c8102e;
}

/* Available dates — light red highlight */
.booking-calendar .rdp-day_available .rdp-day_button {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #c8102e;
  font-weight: 600;
}

.booking-calendar .rdp-day_available .rdp-day_button:hover {
  background-color: #fee2e2;
}

/* Selected date — solid red */
.booking-calendar .rdp-selected .rdp-day_button,
.booking-calendar .rdp-selected .rdp-day_button:hover {
  background-color: #c8102e !important;
  color: #ffffff !important;
  border-color: #c8102e !important;
  font-weight: 700;
}

/* Today — underline only, no fill */
.booking-calendar .rdp-today:not(.rdp-selected) .rdp-day_button {
  text-decoration: underline;
  text-underline-offset: 3px;
  color: #c8102e;
  background: transparent;
}

/* Nav buttons — match shadcn ghost button style */
.booking-calendar .rdp-nav button {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
}

.booking-calendar .rdp-nav button:hover {
  background-color: #f9fafb;
  color: #111827;
}
```

- [ ] **Step 2: Create the component**

Create `src/components/shared/BookingCalendar.tsx` with this exact content:

```tsx
import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import './booking-calendar.css'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { getUpcomingBookableDates } from '../../lib/supabase/queries'
import type { AppointmentSlot } from '../../lib/types'

interface DateOption {
  slotId: string
  startTime: string
  label: string
}

interface BookingCalendarProps {
  slots: AppointmentSlot[]
  onConfirm: (slotId: string, date: string) => Promise<void>
  submitting: boolean
  confirmLabel?: string
  showAutoConfirmBadge?: boolean
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(timeStr: string): string {
  return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isWithin2Days(date: Date): boolean {
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Math.floor((date.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24)) < 2
}

export function BookingCalendar({
  slots,
  onConfirm,
  submitting,
  confirmLabel = 'Confirm Booking',
  showAutoConfirmBadge = false,
}: BookingCalendarProps) {
  const [availableMap, setAvailableMap] = useState<Map<string, DateOption>>(new Map())
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Date | undefined>()

  useEffect(() => {
    if (slots.length === 0) { setFetching(false); return }
    Promise.all(
      slots.map(s =>
        getUpcomingBookableDates(s.slot_id).then(dates => ({ slot: s, dates }))
      )
    )
      .then(results => {
        const map = new Map<string, DateOption>()
        for (const { slot, dates } of results) {
          for (const date of dates) {
            if (!map.has(date)) {
              map.set(date, { slotId: slot.slot_id, startTime: slot.start_time, label: slot.label })
            }
          }
        }
        setAvailableMap(map)
      })
      .catch(() => setFetchError('Failed to load available dates. Please refresh.'))
      .finally(() => setFetching(false))
  }, [slots])

  const availableDates = Array.from(availableMap.keys()).map(d => new Date(d + 'T12:00:00'))
  const selectedKey = selected ? toDateKey(selected) : null
  const selectedOption = selectedKey ? availableMap.get(selectedKey) : null

  async function handleConfirm() {
    if (!selectedKey || !selectedOption) return
    await onConfirm(selectedOption.slotId, selectedKey)
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-sm text-destructive text-center py-4">{fetchError}</p>
  }

  if (availableMap.size === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No available dates in the next 20 weeks. Contact us directly.
      </p>
    )
  }

  return (
    <div className="booking-calendar">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={setSelected}
        disabled={(date) => !availableMap.has(toDateKey(date))}
        modifiers={{ available: availableDates }}
        modifiersClassNames={{ available: 'rdp-day_available' }}
        showOutsideDays={false}
      />

      {selected && selectedOption && (
        <div className="mt-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-foreground">
                {selected.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {selectedOption.label} · {formatTime(selectedOption.startTime)}
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs leading-none">✓</span>
            </div>
          </div>
          {showAutoConfirmBadge && isWithin2Days(selected) && (
            <span className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 border border-amber-200">
              Will be auto-confirmed
            </span>
          )}
        </div>
      )}

      {selected && (
        <Button
          onClick={handleConfirm}
          disabled={!selectedOption || submitting}
          className="w-full mt-3"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming…</>
            : confirmLabel}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the app builds with the new files**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/BookingCalendar.tsx src/components/shared/booking-calendar.css
git commit -m "feat: add BookingCalendar shared component"
```

---

## Task 3: Wire BookingCalendar into BookingPage

**Files:**
- Modify: `src/pages/BookingPage.tsx`

The current file has:
- State: `selectedSlotId`, `dateOptions`, `selectedDate` — all removed
- Two `useEffect` hooks that drive slot/date fetching — the second one (watching `selectedSlotId, slots`) is removed
- A `datePickerSection` const block — removed
- `handleBook` — signature changes to accept `(slotId, date)` as arguments

- [ ] **Step 1: Replace the file content**

Replace the entire content of `src/pages/BookingPage.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { getLeadByToken, getAppointmentSlots } from '../lib/supabase/queries'
import { BookingCalendar } from '../components/shared/BookingCalendar'
import type { AppointmentSlot } from '../lib/types'

interface LeadInfo {
  status: string
  parent_name: string
  parent_email: string
  appointment_date: string | null
  appointment_time: string | null
}

export function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const [lead, setLead] = useState<LeadInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState<{ date: string; time: string } | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return }
    getLeadByToken(token).then((data) => {
      if (!data) { setError('This booking link is no longer valid.'); setLoading(false); return }
      setLead(data)
      if (['appointment_scheduled', 'appointment_confirmed'].includes(data.status) && data.appointment_date) {
        setBooked({ date: data.appointment_date, time: data.appointment_time ?? '' })
      }
      setLoading(false)
    })
  }, [token])

  useEffect(() => {
    if (!lead || !['approved', 'appointment_scheduled', 'appointment_confirmed'].includes(lead.status)) return
    getAppointmentSlots()
      .then(setSlots)
      .catch(() => setError('Failed to load available dates. Please refresh.'))
  }, [lead])

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
      setLead(prev => prev
        ? { ...prev, status: data.status, appointment_date: data.appointment_date, appointment_time: data.appointment_time }
        : prev)
      setShowReschedule(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return ''
    return new Date('1970-01-01T' + timeStr).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isInvalid = !lead || ['denied', 'closed', 'enrolled'].includes(lead.status)

  if (isInvalid || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-bold">Link no longer valid</h1>
          <p className="text-muted-foreground text-sm">
            {error ?? 'This booking link is no longer valid. Please contact LBMAA directly.'}
          </p>
        </div>
      </div>
    )
  }

  if (booked && !showReschedule) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>
            You're booked!
          </h1>
          <div className="rounded-lg border p-5 text-left space-y-1">
            <p className="font-semibold text-base">{formatDate(booked.date)}</p>
            {booked.time && <p className="text-muted-foreground text-sm">{formatTime(booked.time)}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to {lead.parent_email}.
          </p>
          {lead.status === 'appointment_confirmed' && (
            <p className="text-sm font-medium text-green-700 bg-green-50 rounded px-3 py-2 border border-green-200">
              Your attendance is confirmed
            </p>
          )}
          <button
            onClick={() => setShowReschedule(true)}
            className="text-sm text-primary underline underline-offset-2"
          >
            Need to reschedule?
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Lexend, sans-serif' }}>
            Book your enrollment appointment
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Hi {lead.parent_name}! Select a date below.
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        {showReschedule ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">Select a new date:</p>
            <BookingCalendar
              slots={slots}
              onConfirm={handleBook}
              submitting={submitting}
            />
            <button
              onClick={() => setShowReschedule(false)}
              className="text-sm text-muted-foreground underline underline-offset-2 block text-center w-full"
            >
              Cancel
            </button>
          </div>
        ) : (
          <BookingCalendar
            slots={slots}
            onConfirm={handleBook}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Navigate to `/book/any-string` in the browser. You should see:
- The page loads with a loading spinner, then shows "Link no longer valid" (since the token is fake). This confirms the component renders without crashing.

To test with a real token, use one from the Supabase `enrollment_leads` table (`booking_token` column of an `approved` lead).

- [ ] **Step 4: Commit**

```bash
git add src/pages/BookingPage.tsx
git commit -m "feat: replace date list with calendar in BookingPage"
```

---

## Task 4: Wire BookingCalendar into PickDateModal

**Files:**
- Modify: `src/components/admin/PickDateModal.tsx`

Removed from current file: `selectedSlotId`, `dateOptions`, `selectedDate` state; the `useEffect` watching `selectedSlotId, slots`; the scrollable date button list JSX; the slot-selector pill row.

Kept: `slots` state + its fetch `useEffect`; `loading` (submitting); `fetchError` (shown for booking failures); `fetching` (shown while slots load).

- [ ] **Step 1: Replace the file content**

Replace the entire content of `src/components/admin/PickDateModal.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Loader2 } from 'lucide-react'
import { getAppointmentSlots } from '../../lib/supabase/queries'
import { BookingCalendar } from '../shared/BookingCalendar'
import type { EnrollmentLead, AppointmentSlot } from '../../lib/types'

interface PickDateModalProps {
  lead: EnrollmentLead
  onConfirm: (leadId: string, slotId: string, appointmentDate: string) => Promise<void>
  onCancel: () => void
}

export function PickDateModal({ lead, onConfirm, onCancel }: PickDateModalProps) {
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    getAppointmentSlots()
      .then(setSlots)
      .catch(() => setFetchError('Failed to load available slots.'))
      .finally(() => setFetching(false))
  }, [])

  async function handleConfirm(slotId: string, date: string) {
    setLoading(true)
    setFetchError(null)
    try {
      await onConfirm(lead.lead_id, slotId, date)
    } catch {
      setFetchError('Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick appointment date — {lead.parent_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <BookingCalendar
              slots={slots}
              onConfirm={handleConfirm}
              submitting={loading}
              confirmLabel="Confirm Appointment"
              showAutoConfirmBadge
            />
          )}

          {fetchError && (
            <p className="text-sm text-destructive text-center">{fetchError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify the build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Log in as an admin. Go to the Enrollment Leads tab. Find an `approved` lead and click "Pick Date for Them". You should see:
- A loading spinner while slots fetch
- A calendar with available dates highlighted in red
- Clicking an available date shows the confirmation strip below
- Clicking "Confirm Appointment" books the appointment and closes the modal

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/PickDateModal.tsx
git commit -m "feat: replace date list with calendar in PickDateModal"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Classic month grid calendar | Task 2 — DayPicker with month navigation |
| Both BookingPage and PickDateModal | Tasks 3 and 4 |
| react-day-picker dependency | Task 1 |
| All available dates combined (no slot pre-selection) | Task 2 — parallel fetch, merged map |
| First-slot-wins on same-date collision | Task 2 — `if (!map.has(date))` guard |
| Available dates highlighted red | Task 2 — CSS + `available` modifier |
| Selected date solid red | Task 2 — CSS `.rdp-selected` override |
| Disabled dates greyed out | Task 2 — `disabled` prop + default rdp styles |
| Today underline only | Task 2 — CSS `.rdp-today` override |
| Confirmation strip below calendar | Task 2 — conditional strip JSX |
| Auto-confirm badge in PickDateModal | Task 4 — `showAutoConfirmBadge` prop |
| Loading state (spinner) | Task 2 — `fetching` state |
| Empty state message | Task 2 — `availableMap.size === 0` branch |
| Fetch error message | Task 2 — `fetchError` state |

All spec requirements are covered. No gaps found.
