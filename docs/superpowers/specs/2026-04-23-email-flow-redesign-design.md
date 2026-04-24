# Email Flow Redesign — Design Spec
**Date:** 2026-04-23

## Problem

Three issues with the current booking confirmation and reminder email flow:

1. The confirmation email is sent after every individual booking, even when a family has multiple programs to book. The parent gets a partial email mid-flow.
2. The confirmation email body does not show the appointment time (the template reads `enrollment_leads.appointment_time` which is unpopulated in the multi-program flow).
3. The reminder cron job reads `enrollment_leads.appointment_date` (the old single-slot field), fires once per booking rather than once per lead, and does not show all appointments.

## Goals

- Send one confirmation email per lead, only after all program bookings are scheduled.
- Confirmation email shows every appointment: program label, children's names, date, and time.
- Send one reminder email per lead, 2 days before their earliest appointment, showing all appointments.
- Both admin and public booking paths obey the same rules.

## Approach

All logic stays in existing edge functions and SQL. No new database tables or statuses.

---

## Change 1 — Confirmation email trigger

**Files:** `supabase/functions/book-appointment/index.ts`, `supabase/functions/admin-book-appointment/index.ts`

After updating the program booking and calling `recalculateLeadStatus`, reuse the booking rows already fetched (or query them once) to check if every booking for this lead now has status `scheduled` or `confirmed`. Only insert the `booking_confirmation` notification if that condition is true.

```
Query enrollment_lead_program_bookings WHERE lead_id = <this lead>
→ allBooked = every row has status IN ('scheduled', 'confirmed')
→ if allBooked: INSERT enrollment_lead_notifications (type = 'booking_confirmation')
→ else: skip (lead still has unbooked programs)
```

This applies to both `book-appointment` (public token path) and `admin-book-appointment` (admin auth path).

---

## Change 2 — Confirmation email content

**Files:** `supabase/functions/send-email/index.ts`, `supabase/functions/send-email/templates.ts`

### Handler (`index.ts` — `booking_confirmation` case)

Replace the current single-date fetch with:

1. Fetch `enrollment_leads` (parent name, email, etc.)
2. Fetch all `enrollment_lead_program_bookings` for the lead where `appointment_date IS NOT NULL`, ordered by `appointment_date ASC`
3. For each booking, fetch `enrollment_lead_children` filtered by `lead_id` + `program_type` to get child names
4. Pass the assembled list to the updated template

### Template (`templates.ts` — `bookingConfirmationHtml`)

New signature:
```ts
bookingConfirmationHtml(
  parentName: string,
  appointments: Array<{
    programLabel: string
    childNames: string        // e.g. "Emma & Lily"
    date: string              // formatted, e.g. "Monday, April 28, 2026"
    time: string              // formatted, e.g. "4:00 PM"
    rebookingUrl: string      // per-program booking token URL
  }>
): string
```

Each appointment renders as a card block:
```
┌──────────────────────────────────────┐
│ Little Dragons — Emma & Lily         │
│ Monday, April 28, 2026               │
│ 4:00 PM                              │
│ Need to reschedule? [link]           │
└──────────────────────────────────────┘
```

For single-program leads the email is identical to before, now with time correctly populated.

---

## Change 3 — Reminder cron job

**File:** new migration `supabase/migrations/026_fix_reminder_cron.sql` (next available number)

Replace the existing `appointment-reminders` cron job. The new SQL:

```sql
SELECT cron.unschedule('appointment-reminders');

SELECT cron.schedule(
  'appointment-reminders',
  '0 8 * * *',
  $$
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, 'email', 'reminder', 'queued'
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND el.status IN ('appointment_scheduled', 'appointment_confirmed')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.appointment_date IS NOT NULL
    ) = (CURRENT_DATE + INTERVAL '2 days')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = 'reminder'
    );
  $$
);
```

Key differences from current cron:
- Joins against `enrollment_lead_program_bookings` to find the earliest appointment date per lead
- Inserts exactly one notification per lead (not one per booking)
- `NOT EXISTS` guard prevents duplicate reminders if the cron ever re-runs

---

## Change 4 — Reminder email content

**Files:** `supabase/functions/send-email/index.ts`, `supabase/functions/send-email/templates.ts`

### Handler (`index.ts` — `reminder` case)

Same fetch pattern as the confirmation email handler: all program bookings + children per program.

### Template (`templates.ts` — `reminderEmailHtml`)

New signature:
```ts
reminderEmailHtml(
  parentName: string,
  appointments: Array<{
    programLabel: string
    childNames: string
    date: string
    time: string
    rebookingUrl: string
  }>,
  confirmUrl: string
): string
```

Layout:
```
Reminder: your LBMAA appointments are in 2 days

Hi [parent], just a reminder — your intro appointments are coming up:

[appointment card per program, same format as confirmation email]

        [ Confirm My Attendance ]

```

The "Confirm My Attendance" button uses the existing confirm endpoint. The confirm URL is derived from the earliest booking's `booking_token` (from `enrollment_lead_program_bookings` ordered by `appointment_date ASC`), falling back to `lead.booking_token` if no program bookings exist. This keeps the confirm endpoint unchanged. Reschedule links appear inside each program card using that program's booking token.

---

## Data fetch helper

To avoid duplicating the fetch logic between `booking_confirmation` and `reminder` handlers, extract a shared async helper in `send-email/index.ts`:

```ts
async function getLeadAppointments(supabase, leadId: string): Promise<AppointmentInfo[]>
```

Returns the assembled list of `{ programLabel, childNames, date, time, rebookingUrl }` objects, sorted by appointment date ascending. Both handlers call this helper.

---

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/book-appointment/index.ts` | Add "all booked?" check before inserting notification |
| `supabase/functions/admin-book-appointment/index.ts` | Same |
| `supabase/functions/send-email/index.ts` | Add `getLeadAppointments` helper; update `booking_confirmation` and `reminder` cases to use it |
| `supabase/functions/send-email/templates.ts` | Update `bookingConfirmationHtml` and `reminderEmailHtml` signatures and bodies |
| `supabase/migrations/026_fix_reminder_cron.sql` | Replace cron job |

## Out of scope

- Confirm-attendance page/endpoint behavior (unchanged)
- Approval email (unchanged)
- Admin booking UI (unchanged)
- Any changes to `enrollment_leads.appointment_date` / `appointment_time` columns (left as-is, not used by the new flow)
