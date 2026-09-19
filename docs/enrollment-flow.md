# Enrollment Lead Flow — Full Reference

This document covers everything about how a prospective family goes from filling out the contact form to having a confirmed appointment. It explains the code, the database, the emails, and the design decisions behind each choice.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [The Contact Form (Entry Point)](#2-the-contact-form-entry-point)
3. [Database Design](#3-database-design)
4. [Lead Status Lifecycle](#4-lead-status-lifecycle)
5. [The Admin Dashboard](#5-the-admin-dashboard)
6. [Edge Functions (The Serverless Backend)](#6-edge-functions-the-serverless-backend)
7. [Email Notification System](#7-email-notification-system)
8. [Appointment Availability System](#8-appointment-availability-system)
9. [Admin Manual Lead Creation](#9-admin-manual-lead-creation)
10. [Security Model](#10-security-model)
11. [Design Decisions](#11-design-decisions)
12. [Booking a Trial Visit at Signup](#12-booking-a-trial-visit-at-signup)
13. [Glossary](#13-glossary)

---

## 1. Big Picture

An **enrollment lead** is a record that represents one family's journey from "I'm interested" to "I have an appointment." The flow has two sides:

- **The prospect side:** a parent fills out the public form and picks their own day and arrival time in the same visit. The visit is booked the moment they submit; there is no separate "wait for an admin to approve, then book" step for a web lead. See §12 for the full mechanics.
- **The admin side:** staff can still create a lead by hand (walk-ins, phone calls, referrals) and either book it for the family right away or send them a booking link to pick their own time. See §9.

The flow is entirely serverless: there is no custom backend server. All business logic runs either inside PostgreSQL (as stored procedures called **RPCs**) or inside **Supabase Edge Functions** (small JavaScript/TypeScript functions that run on Deno at the edge).

```
Prospect fills out the form and picks a day + time per program
        │
        ▼
  submit_trial_booking RPC
  (PostgreSQL, runs on DB, one transaction)
        │
        ├─► lead row inserted in enrollment_leads
        ├─► one row per child in enrollment_lead_children
        ├─► one visit booked per program, already scheduled/confirmed
        ├─► new_lead notification queued        → email to admin
        └─► booking_confirmation notification queued → receipt email to prospect
                │
                ▼
      appointment_scheduled / appointment_confirmed
                │
                ▼ (2 days out → auto-confirm)
        appointment_confirmed
                │
                ▼
     reminder email (2 days before, skipped for a same-day
     booking that's already confirmed; see §7)

Admin manual lead creation (walk-ins, phone calls, referrals; §9)
follows the older path: a `new` lead that staff either book directly
or send a booking link (`approved` → self-book → scheduled/confirmed),
with the same deny/approve/reschedule actions described in §4-§6.
```

---

## 2. The Contact Form (Entry Point)

**Files:** `src/components/public/ContactPage.tsx`, `TrialVisitStep.tsx`, `TrialBookedPanel.tsx`, `src/components/shared/VisitPicker.tsx`

The contact form is publicly accessible: no login required. A parent leaves it with a booked visit, not just a submitted inquiry. It collects:

| Field | Required? | Notes |
|---|---|---|
| Parent name | Yes | 2–100 characters |
| Phone | Yes | Valid 10-digit US number |
| Parent email | Yes | Standard email format |
| Child's name | Yes, per child | 1–60 characters |
| Child's age | Yes, per child | 4–17; decides the child's program (§12) |
| Visit day + arrival time | Yes, per program | One calendar per program the children fall into (below) |
| Message / notes | No | Free text, max 1500 characters |

A family can add 1–6 children. Phone and email are both required on this form (unlike a staff-entered lead, §9, where only one of the two is required): a web lead always has both ways to reach the family.

### One calendar per program

Which programs are in play is derived from the children's ages as they're typed, with `programForAgeText()` (`src/lib/programs.ts`) applying the same 1–2 digit whole-number format the server enforces, so the client never shows a program grouping the server would then reject. A family with a 5-year-old and a 10-year-old sees two visit calendars, one for Little Dragons and one for Youth; a family with two children both age 6 sees one. Each calendar is a `VisitPicker` (`src/components/shared/VisitPicker.tsx`), shared with the `/book` self-service page and the admin `PickDateModal`, so the same calendar code decides what's clickable everywhere a family or an admin picks a date.

Editing a child's age away from a program (or removing the child) clears that program's visit selection and its calendar disappears; a program that's already been visited by an edit keeps its own selection untouched.

### Lazy loading the calendar

`VisitPicker` is imported with `React.lazy()` from `TrialVisitStep.tsx`, not bundled into the app's entry chunk. A visitor who never gets far enough to see the visit step (or leaves after reading the hero) never downloads the calendar code, `react-day-picker`, or its locale data. Each program's calendar also fetches its own available dates independently and shows its own loading spinner, so one program's slow fetch doesn't block another's.

### Validating on submit

Submit is never disabled; every check runs when the form is submitted. Name, phone, email, and each child's name/age are checked first. If any of those fail, the form focuses the first invalid field and stops there, before it even looks at visit selections. Only once those pass does it check that every program with children in it has a chosen day and time; if one is missing, it focuses that program's calendar instead. This order means a parent always sees the most fundamental problem first, not a visit error while their own name field is still blank.

### What happens on submit

1. The form calls `submitTrialBookingWithTimeout()` from `src/lib/supabase/client.ts`, a thin wrapper around a direct `fetch` to the RPC endpoint with a 12-second timeout (see "Why a 12-second timeout?" below).
2. That calls `submit_trial_booking(...)` (§12), which validates everything server-side again, creates the lead, its children, and every visit in one transaction, and returns a receipt: the lead id and each booked visit (program, date, time, status, per-visit booking token).
3. On success, the form replaces itself with `TrialBookedPanel`, an on-screen receipt (below). It does not navigate away or reload; the receipt renders in place of the form.

### The request id

Before the form ever submits, `ContactPage` generates one `crypto.randomUUID()` per page load (`requestId`, held in a `useRef` so it survives re-renders but not a page reload) and sends it as `p_request_id` on every submit attempt, including a retry after a timeout. `submit_trial_booking` uses it to recognize "this is the same attempt, not a new one" (§12, Retry). Without it, a parent whose connection times out after the database already committed would either get a confusing `already_booked` error on resubmit, or double-book, on a form that lets them try again.

### How each server error is shown

The RPC's error `code` (or a substring of its message, for errors the client can't otherwise distinguish) maps to one on-screen message, shown in an alert above the submit button:

| Server error | Shown as |
|---|---|
| `P0429` (any of the three rate limits, §12) | "We recently received a request from you. Please wait a moment and try again, or call us directly." |
| `P0409` (`already_booked`) | "It looks like you already have a visit booked with us. Check your email for the details, or call us at (408) 620-0252 to change it." |
| `23P01` (`slot_taken`) | "Someone just booked that time. Please pick another." Every visit selection is also cleared and each calendar refetches, since the slot map underneath this one just changed |
| `date_unavailable`, `slot_mismatch`, or `invalid_booking_request` | "That day is no longer available. Please pick another." Same clear-and-refetch as `slot_taken` |
| Anything else, including a timeout | "Unable to submit right now. Please try again or call us directly." |

Clearing selections and refetching on a slot/date error, rather than just showing the message, means a parent never resubmits into the same stale error: by the time they pick a new day, the calendar is already showing what's actually still open.

### Language

The form's own language toggle (English/Spanish, `useLanguage()` in `lang.tsx`) drives every string on the page, the calendar's `react-day-picker` locale (`enUS`/`es`), and is sent as `p_language` on submit. That's the one thing this form hands the backend that a staff-entered lead never sets: the booking receipt email is written in the family's own language (§12), matching what they were reading when they booked.

### The on-screen receipt

`TrialBookedPanel` shows, per booked visit: the program and children in it, the date and arrival time, a "View or change this visit" link (routes to `/book/<token>`, the same self-service page a booking-link email points to), and an "Add to calendar" link. That link goes straight to the `visit-calendar` `.ics` endpoint (§12), not a Google Calendar render URL: a downloaded `.ics` file works on every phone, so the panel doesn't need a second copy of the Google Calendar URL builder the receipt email already has. Below the visits: the school's address with a link to Maps, a short "what to expect" paragraph, a note that the same details were emailed (with a spam-folder reminder), and a phone number for questions. It never states a price or calls the visit free, the same rule the email follows (§12).

### Why a 12-second timeout?

Serverless database calls occasionally experience cold-start latency. The timeout prevents the UI from hanging indefinitely while still giving the DB enough time to respond under normal conditions. Because the timeout can fire after the database already committed, the request id above is what makes a retry safe.

### Why validate age client-side AND server-side?

Client-side validation gives fast feedback in the UI (no round-trip needed) and decides which calendars even show up. Server-side validation (the RPC's own checks, and the `CHECK` constraints in the DB) is the real safety net: a client-side check can always be bypassed by someone making a raw HTTP request.

---

## 3. Database Design

### Core Tables

#### `enrollment_leads`

Every lead is one row in this table. Key columns:

| Column | Type | Purpose |
|---|---|---|
| `lead_id` | UUID | Primary key, auto-generated |
| `parent_name` | TEXT | Contact name |
| `parent_email` | TEXT | Contact email (lowercased at insert) |
| `status` | TEXT | The lead's current stage (see §4) |
| `booking_token` | UUID | A secret token that powers the booking link |
| `appointment_date` | DATE | The chosen appointment date (`YYYY-MM-DD`) |
| `appointment_time` | TIME | The slot's start time (`HH:MM:SS`) |
| `denied_at` | TIMESTAMPTZ | When the lead was denied |
| `denial_message` | TEXT | Optional message sent to the prospect on denial |
| `admin_notes` | TEXT | Internal notes visible only to admins |
| `approved_at` | TIMESTAMPTZ | When an admin approved the lead |
| `approval_email_sent_at` | TIMESTAMPTZ | When the approval email was sent |
| `created_at` | TIMESTAMPTZ | Submission timestamp |

#### `enrollment_lead_notifications`

Every email that needs to be sent is first inserted as a row here with `status = 'queued'`. A Supabase **database webhook** watches for new INSERTs on this table and triggers the `send-email` edge function to actually deliver the email.

This is a common pattern called the **outbox pattern** — instead of sending emails directly during a transaction, you write the intent to a queue. This makes the system more reliable: if the email service is down, the row stays in the table and can be retried.

| Column | Type | Purpose |
|---|---|---|
| `notification_id` | UUID | Primary key |
| `lead_id` | UUID | References `enrollment_leads` |
| `recipient_email` | TEXT | Who receives the email |
| `type` | TEXT | Which email template to use (`new_lead`, `submission`, `approval`, `denial`, `booking_confirmation`, `reminder`) |
| `status` | TEXT | `queued`, `sent`, or `failed` |

#### `appointment_slots`

Admins configure recurring time slots when appointments can be scheduled (e.g., "Wednesdays 4–6 PM").

| Column | Type | Purpose |
|---|---|---|
| `slot_id` | UUID | Primary key |
| `day_of_week` | INTEGER | `0` = Sunday, `1` = Monday … `6` = Saturday |
| `start_time` | TIME | When the slot starts |
| `end_time` | TIME | When the slot ends |
| `label` | TEXT | Human-readable name (e.g., "Wednesday 4–6pm") |
| `is_active` | BOOLEAN | Whether this slot is currently available |

#### `blocked_dates`

Slots are recurring by default. A blocked-date entry closes booking for **all** slots across a date range. A single day is a range where `start_date = end_date`. Example: block December 22–26 for the holidays. Blocks only prevent new bookings; existing appointments on those dates are untouched.

| Column | Type | Purpose |
|---|---|---|
| `block_id` | UUID | Primary key |
| `start_date` | DATE | First blocked day |
| `end_date` | DATE | Last blocked day (equals `start_date` for a single day) |
| `reason` | TEXT | Optional reason (e.g., "Holiday") |

#### `admin_notification_settings`

Which admin email addresses should receive `new_lead` notifications when a form is submitted.

---

## 4. Lead Status Lifecycle

A lead's `status` column is a state machine. Each status represents where the lead is in the pipeline.

```
            ┌─────────────────┐
            │      new        │  ← Created on form submit or by admin
            └────────┬────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   ┌─────────────┐       ┌─────────────┐
   │   approved  │       │   denied    │  ← Terminal. No further actions.
   └──────┬──────┘       └─────────────┘
          │
          │  (prospect self-books OR admin books for them)
          ▼
 ┌──────────────────────┐
 │ appointment_scheduled│  ← Appointment is >2 days away
 └──────────┬───────────┘
            │
            │  (date arrives within 2 days OR admin books within 2 days)
            ▼
 ┌──────────────────────┐
 │appointment_confirmed │  ← Appointment is imminent
 └──────────┬───────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐   ┌─────────┐
│enrolled │   │ closed  │  ← Manually set by admin after the fact
└─────────┘   └─────────┘
```

### Status descriptions

| Status | Meaning |
|---|---|
| `new` | Just submitted, awaiting admin review |
| `approved` | Admin approved; booking link sent to prospect |
| `appointment_scheduled` | Appointment booked, more than 2 days out |
| `appointment_confirmed` | Appointment booked, within 2 days (auto-confirmed) or manually confirmed |
| `denied` | Admin denied the lead. **Terminal — no actions are available on a denied lead.** |
| `enrolled` | Family completed the process and enrolled |
| `closed` | Lead closed for any other reason |

### The auto-confirm rule

When a booking is made (either by the prospect or admin), the system checks: is the appointment two calendar days away or less? If yes, the status is set directly to `appointment_confirmed` instead of `appointment_scheduled`. This avoids confusion where someone books for tomorrow and sees "scheduled" rather than "confirmed."

The comparison counts calendar days in **America/Los_Angeles**, the venue's local time zone. It is decided in SQL by `resolve_program_booking`, not in the edge function, so the rule applies the same way regardless of which booking path calls it.

### The `recalculate_lead_status` rule

`recalculate_lead_status(lead_id)` is the single source of truth for what a lead's status should be, given its program bookings. Every booking action (book, confirm, cancel, admin-confirm) and `update_enrollment_lead` call it instead of recomputing the status locally, so the rule can't drift between code paths. It derives the status from the lead's **active** (non-cancelled) program bookings: none active → `approved`; every active booking confirmed → `appointment_confirmed`; every active booking at least scheduled → `appointment_scheduled`.

Three guards keep it from overriding a status it shouldn't touch:

- **Finished leads never move.** A lead in `attended`, `denied`, or `closed` is returned unchanged, no matter what its bookings look like. `book_program_appointment` enforces the same rule one level down: it raises `lead_closed` for any of these three statuses, so an attended lead's booking link can no longer book a new visit either. Staff use **Reopen** first to take a lead out of one of these states before it can book again.
- **A missed visit reopens only when a new visit is booked.** A `no_show` lead stays `no_show` until it has at least one active (`scheduled` or `confirmed`) booking that is still upcoming: a visit later today, by arrival time (`appointment_time` later than now), or a visit on any later date.
- **A lead nobody has invited yet never becomes invited by itself.** A `new` lead whose bookings would otherwise compute to `approved` stays `new` instead. For example, a `new` lead with two programs where staff book only one stays `new` instead of jumping to "approved" with no invite ever sent.

---

## 5. The Admin Dashboard

**File:** `src/components/admin/AdminEnrollmentLeadsTab.tsx`

### Pipeline tabs

The dashboard organizes leads into tabs:

| Tab | Shows |
|---|---|
| New | `new` leads |
| Approved | `approved` leads |
| Scheduled | `appointment_scheduled` leads |
| Confirmed | `appointment_confirmed` leads |
| Closed / Denied | `denied` + `closed` leads |
| All | Everything |

Each tab shows a count badge. This gives admins a quick summary of what needs attention without reading every card.

### Lead cards

Each lead card shows:

- Parent name, email, phone
- Student name + age
- Status badge (color-coded)
- An **aging indicator** on new leads (e.g., "3d ago") — turns red at 7+ days to flag stale leads
- Appointment date/time (when applicable)
- The parent's original message
- When the approval email was sent
- An admin notes textarea (auto-saved on blur)

### Actions per status

| Status | Available actions |
|---|---|
| `new` | Approve & Send Invite, Deny |
| `approved` | Resend Booking Link, Pick Date for Them, Deny |
| `appointment_scheduled` / `appointment_confirmed` | Resend Booking Link, Pick New Date |
| `enrolled` / `closed` | Status dropdown to switch between the two |
| `denied` | None — denied is terminal |

### Search

The search bar filters within the active tab by parent name, parent email, or student name. It filters client-side (no extra DB call), since all leads are loaded once on mount.

---

## 6. Edge Functions (The Serverless Backend)

> **What is an Edge Function?** Think of it as a tiny server that wakes up when called, runs a short task, and goes back to sleep. It's hosted by Supabase and runs Deno (a modern JavaScript runtime). There's no always-on server.

### Authentication pattern

All admin-only edge functions use the same two-step auth pattern:

1. The browser sends the user's JWT (JSON Web Token — a signed proof of identity) in the `Authorization` header.
2. The edge function creates a temporary Supabase client using that token and calls `auth.getUser()` to verify the token is legitimate.
3. It then calls the `is_admin()` PostgreSQL function to confirm the user has the admin role.

This pattern handles **ES256 asymmetric JWTs** (the newer Supabase default) correctly. An older approach of manually decoding the JWT only works with the older HS256 algorithm.

---

### `approve-enrollment-lead`

**File:** `supabase/functions/approve-enrollment-lead/index.ts`

**Trigger:** Admin clicks "Approve & Send Invite."

**What it does:**
1. Verifies the caller is an admin.
2. Looks up the lead.
3. Generates a `booking_token` (a random UUID) if one doesn't already exist. This token is the lead's "password" for the booking page.
4. Updates the lead: `status = 'approved'`, sets `approved_at`.
5. Inserts an `approval` notification row — this triggers the `send-email` function to email the prospect a booking link.

**Why generate the token here?** The token is only needed once the lead is approved. Generating it earlier would be wasteful and would create tokens for leads that get denied.

---

### `deny-enrollment-lead`

**File:** `supabase/functions/deny-enrollment-lead/index.ts`

**Trigger:** Admin confirms a denial in the DenyModal.

**What it does:**
1. Verifies admin identity.
2. Updates the lead: `status = 'denied'`, sets `denied_at` and `denial_message`.
3. Inserts a `denial` notification row — triggers an email to the prospect.

**Why is denied terminal?** A denied lead represents a deliberate decision. Allowing re-approval would make the pipeline ambiguous. If a previously denied family should be reconsidered, it's expected to create a fresh lead.

---

### `book-appointment` (public endpoint)

**File:** `supabase/functions/book-appointment/index.ts`

**Trigger:** Prospect clicks "Book Your Appointment" in their email, lands on a booking page, picks a slot and date, submits.

**Authentication:** No Supabase session needed. Auth is the `booking_token` on the program booking (`enrollment_lead_program_bookings.booking_token`) in the request body. This is intentional: the prospect doesn't have an account, and we can't ask them to log in just to book.

**What it does:**
1. Looks up the program booking by `booking_token`. Rejects with `Invalid booking token` (404) if it doesn't exist, before anything else runs, including a request with no `appointmentDate`, which never reaches SQL.
2. Rejects if the lead is `denied` or `closed`, or if the booking's own status isn't bookable (`link_sent`, `scheduled`, `confirmed`, or `cancelled`, which allows re-booking or rebooking after a cancel).
3. Handles a plain cancel (`action: 'cancel'`) separately: flips the booking to `cancelled` and recalculates the lead's status, without touching `book_program_appointment`.
4. Otherwise calls the shared `bookProgramAppointment()` helper (`_shared/booking.ts`), which invokes the `book_program_appointment` RPC with `allowToday: false` and `horizonDays: FAMILY_HORIZON_DAYS` (21), the family window, always, regardless of what the request sends.
5. On success, queues a `booking_confirmation` notification email via `queue_family_notification`. A queue failure or a lead with no email does not turn the booking into an error: it already saved.

**Why allow re-booking?** A prospect who already has a scheduled appointment might need to reschedule. Allowing them to use the same link keeps the experience simple.

---

### `admin-book-appointment`

**File:** `supabase/functions/admin-book-appointment/index.ts`

**Trigger:** Admin clicks "Pick Date for Them" or "Change date" and selects a slot/date in the PickDateModal.

**Almost identical to `book-appointment`**, but:
- Requires admin authentication instead of a booking token.
- Calls the same `bookProgramAppointment()` helper with `allowToday: true` and `horizonDays: STAFF_HORIZON_DAYS` (140, i.e. 20 weeks); staff can book the same day, as long as the slot's start time hasn't passed yet.

**Why have a separate function?** The auth mechanism is fundamentally different (admin JWT vs. public token). Combining them into one function would mean one code path with two very different auth checks, which is harder to reason about and audit.

---

### The booking error mapping

Both `book-appointment` and `admin-book-appointment` validate and write through the same `book_program_appointment` SQL function (§8), then hand any error to the shared `bookingErrorResponse()` helper (`_shared/booking.ts`), which maps the named error `book_program_appointment` raises to an HTTP response:

| Named error | HTTP status | Body |
|---|---|---|
| `slot_taken` (Postgres `23P01`) | 409 | `{ code: 'slot_taken' }` |
| `date_unavailable` | 422 | `{ code: 'date_unavailable', error: 'This date is not available.' }` |
| `slot_mismatch` | 422 | `{ code: 'slot_mismatch', error: 'That time is for a different program.' }` |
| `lead_closed` | 422 | `{ code: 'lead_closed', error: 'Reopen this lead before booking a visit.' }` |
| `booking_not_found` | 404 | `{ code: 'booking_not_found' }` |
| `invalid_booking_request` | 400 | `{ code: 'invalid_booking_request', error: 'That booking request was incomplete.' }` |
| anything else | 500 | `Booking failed` (logged server-side) |

`invalid_booking_request` is a last-line guard, not a response either edge function is expected to trigger under normal use: both check their own required fields (token, `slotId`, `appointmentDate`, `programBookingId`) before ever calling the RPC, so a genuinely incomplete request is rejected by the edge function's own checks first. The SQL layer (`slot_date_block_reason`, `book_program_appointment`) raises it anyway if a date, horizon, or allow-today flag is ever missing, so a caller that bypasses the edge functions and calls the RPCs directly still can't slip through with a malformed request.

---

### `resend-booking-link`

**File:** `supabase/functions/resend-booking-link/index.ts`

**Trigger:** Admin clicks "Resend Booking Link," "Send reschedule link," or retries a failed booking receipt.

**What it does:**
1. Verifies admin identity.
2. Reads `intent` from the request (`invite`, `reschedule`, or `receipt`; unrecognized or missing intents default to `invite`) and looks up which notification type it queues and which lead statuses it's valid for:
   - `invite` → `approval`, for `approved` / `appointment_scheduled` / `appointment_confirmed` leads.
   - `reschedule` → `reschedule`, for those same statuses plus `no_show` (the "Send reschedule link" action on a missed appointment).
   - `receipt` → `booking_confirmation`, for `appointment_scheduled` / `appointment_confirmed` leads only: this is the retry action for a failed booking receipt (§7).
3. Rejects if the lead's status isn't valid for the chosen intent, or if the lead has no email.
4. For `invite` and `reschedule`, requires a booking token to exist (per-program or legacy); `receipt` doesn't, since it just re-renders whatever visits are currently active.
5. Inserts another notification row via `queue_family_notification`, which re-triggers the appropriate email.

**Note:** The booking link is permanent (same token, same URL). "Resending" just re-queues the same email template, it doesn't invalidate the old link.

---

## 7. Email Notification System

**Files:**
- `supabase/functions/send-email/index.ts` — main dispatcher
- `supabase/functions/send-email/templates.ts` — HTML email templates
- `supabase/functions/send-email/types.ts` — TypeScript types

### How emails are triggered

The system uses a **database webhook**: Supabase is configured to POST to the `send-email` edge function whenever a new row is inserted into `enrollment_lead_notifications`. The function never needs to be called directly from the app.

This architecture means: **inserting a notification row = sending an email.** Any code that wants to send an email just inserts a row. The email infrastructure is completely decoupled.

### Queuing a family-facing email

All family emails (`approval`, `reschedule`, `denial`, `booking_confirmation`, `reminder`) are queued through one PostgreSQL function, `queue_family_notification(lead_id, type)`. Edge functions never insert into `enrollment_lead_notifications` directly for these types: they call it via the shared helper `_shared/familyNotifications.ts`. The function:

- Returns `no_email` and queues nothing when the lead has no `parent_email`.
- Returns `already_queued` and inserts nothing when a `booking_confirmation` or `reminder` row for that lead is already sitting at `status = 'queued'`: both render the lead's current visits at send time, so a second one would be a duplicate, not a correction.
- Otherwise inserts the row and returns `queued`.

The one exception is `new_lead`: both `submit_trial_booking` (the live form, §12) and the retired `submit_enrollment_lead` insert it directly, rather than going through `queue_family_notification`, since an admin alert isn't a family-facing email and doesn't need that function's no-email/already-queued guards.

### Email types and recipients

| Type | Recipient | When sent |
|---|---|---|
| `new_lead` | All admins who have `notify_new_leads = true` in `admin_notification_settings` | On form submit |
| `submission` | Prospect | On submit, only via the retired `submit_enrollment_lead` path (below); the live form's receipt is `booking_confirmation` instead |
| `approval` | Prospect | When admin approves / resends booking link |
| `denial` | Prospect | When admin denies |
| `booking_confirmation` | Prospect | Queued in the same transaction as the booking, for both a web `submit_trial_booking` submission and a staff-booked visit |
| `reminder` | Prospect | Queued by the `appointment-reminders` pg_cron job at 6pm Pacific, two days before the earliest upcoming visit, unless the lead was booked earlier that same day and every active visit is already confirmed (see "The reminder tweak" below) |

### The `new_lead` fan-out

For `new_lead` notifications, the `send-email` function looks up `admin_notification_settings` and emails every active admin who has `notify_new_leads = true`. This means multiple admins can receive new lead alerts. The original `recipient_email` on the notification row is a fallback in case no admins are configured.

### Email delivery service

Emails are sent via the **Resend** API (`https://api.resend.com/emails`). The API key is stored as a Supabase secret (`RESEND_API_KEY`). All emails come from `hello@notifications.lbmartialarts.com`, with `reply_to` set to the school's own inbox, `LosBanosMartialArts@gmail.com`, so a reply lands in a mailbox a person actually reads, not a sending address nobody checks.

### Template design

All templates share a common wrapper with:
- A red/dark gradient stripe at the top (brand colors: `#c8102e` red, `#1a1a2e` dark navy)
- A header with "Los Banos Martial Arts Academy"
- A footer with support email

Templates are plain-HTML inline-style strings (no CSS framework). This is standard for email because email clients have notoriously poor CSS support — external stylesheets and many CSS properties simply don't work.

### The booking link URL structure

```
https://<APP_URL>/book/<booking_token>
```

The `booking_token` is a UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Because it's random and never guessable, possession of the token proves authorization: no login required. The `/book/<token>` page calls the `book-appointment` edge function.

### Failed deliveries

If the call to Resend fails, `send-email` marks the notification row `status = 'failed'` (with the error saved to `error_message`) instead of leaving it `queued` or `sent`, so a delivery failure isn't silently lost. The admin Overview surfaces this as an attention item with a "Retry email" button:

| Failure | Attention item | Retry calls |
|---|---|---|
| A `reminder` notification failed, on an `appointment_scheduled` or `appointment_confirmed` lead | "Confirmation email failed" | `send-appointment-reminder` |
| A `booking_confirmation` notification failed, on an `appointment_scheduled` or `appointment_confirmed` lead | "Booking receipt email failed" | `resend-booking-link` with `intent: 'receipt'` |

Retrying a receipt re-queues the same `booking_confirmation` type through `queue_family_notification`, which renders whatever visits are still active for the lead at send time, not necessarily the same visit that failed the first time.

Both `booking_confirmation` and `reminder` sends need at least one upcoming visit to render; if none is left by the time the email is due (for example, the visit was cancelled after the notification was queued), `send-email` records the row as `failed` with the message "No upcoming visit was left when this email was due." instead of leaving it `queued` forever, which would otherwise block every later receipt or reminder for that lead through `queue_family_notification`'s already-queued check. Once the lead has moved off `appointment_scheduled`/`appointment_confirmed`, that failure no longer raises an attention item, matching the gating above.

### The reminder tweak

**File:** `supabase/migrations/20260922120000_reminder_skip_same_day_confirmed.sql`

The `appointment-reminders` pg_cron job's `SELECT` already only ever queues a `reminder` for a lead whose earliest upcoming visit is exactly two days out. Now that a web lead can book that same day, two days out, and land straight at `appointment_confirmed` with a receipt already in their inbox, that lead would otherwise get a reminder the same evening asking them to confirm a visit nothing ever left unconfirmed. The job now adds one more condition: skip a lead when it was created today (Pacific) **and** every one of its active program bookings is `confirmed` (none merely `scheduled`). A lead created today whose visit is still `scheduled` (an admin booked it for them, for instance) still gets the reminder, and so does any lead from an earlier day, confirmed or not.

The condition is added the same way the job has always been changed: unschedule the existing `cron.job` row, then `cron.schedule` it again with the full command, one added `AND NOT (...)` clause. Verified on staging with three rolled-back fixtures (`begin; ... rollback;`): a lead created today with an all-confirmed visit two days out was excluded from the job's own `SELECT` (with its `EXTRACT(HOUR ...) = 18` gate removed, since the gate itself can't be tested without waiting for 6pm Pacific); the same shape created yesterday was included; and a lead created today with a `scheduled` (not yet confirmed) visit two days out was included.

---

## 8. Appointment Availability System

### Slots

Admins configure recurring time slots via the Availability Settings page (`src/components/admin/AdminAvailabilitySettings.tsx`).

Example slot: "Wednesdays 4–6 PM" → `day_of_week = 3`, `start_time = 16:00`, `end_time = 18:00`.

Slots are managed via RPCs:
- `upsert_appointment_slot(...)` — creates or updates a slot
- `delete_appointment_slot(slot_id)` — soft-deletes (sets `is_active = false`)

**Soft delete** means the record stays in the database; it's just marked inactive. This preserves historical data — existing appointments that referenced the slot aren't broken.

### Blocked dates

A blocked date range closes every slot for its span, not one slot at a time. `blocked_dates` holds `start_date`, `end_date`, and an optional `reason`; a single-day block sets `start_date = end_date`. Example: block Christmas week across all slots at once.

Admins manage blocks from `src/components/admin/availability/BlockedDates.tsx` via `add_blocked_dates(p_start_date, p_end_date, p_reason)` and `remove_blocked_dates(p_block_id)`. `slot_date_block_reason` returns `blocked` when the date under test falls in any row's `start_date`–`end_date` span, regardless of which slot is being checked.

### The single rule: `slot_date_block_reason`

`slot_date_block_reason(slot_id, date, allow_today, horizon_days, lead_id)` is the one rule in the system for whether a slot is open on a given date. It returns `NULL` when the slot is open, or a reason (`slot_inactive`, `past`, `outside_window`, `wrong_day`, `blocked`, `taken`) when it isn't, checking in order: the slot is active; the date isn't in the past (or is today only when `allow_today` is true and the slot's start time hasn't passed); the date is within `horizon_days`; the day of week and week-of-month match the slot's schedule; no blocked-date range covers it; and no other lead already holds that slot/date (`p_lead_id` excludes the asking lead's own booking, so re-picking the same date doesn't look "taken"). `p_date` is exactly what the caller sends and is exactly what this function validates; only `p_allow_today`, `p_horizon_days`, and `p_actor` are set by server code, never taken from the request body. `p_lead_id` is never supplied by the edge function at all: `book_program_appointment` reads it off the booking row in SQL and passes it through.

Two other functions are built directly on it, so the dates a family is shown and the booking that's actually accepted can never drift apart:

- **`get_upcoming_bookable_dates(slot_id, weeks_ahead, include_today)`** lists the open dates for a slot by calling `slot_date_block_reason` for every day in the window.
- **`book_program_appointment(booking_id, slot_id, date, allow_today, horizon_days, actor)`** validates and writes a booking (§4, §6) by calling `slot_date_block_reason` through `resolve_program_booking`, which also checks the slot matches the booking's program type and returns whether the visit lands as `scheduled` or `confirmed`.

The window differs by who's asking. Families and the public, meaning the contact-form booking page and reschedule links, see and can book up to 21 days ahead and never today (`FAMILY_HORIZON_DAYS` in `supabase/functions/_shared/booking.ts`). Staff keep the longstanding 20-week (140-day) window and can book a slot the same day, as long as the slot's start time hasn't passed yet (`STAFF_HORIZON_DAYS` in the same file).

The frontend booking picker (used in `PickDateModal` and the family `BookingPage`) calls `get_upcoming_bookable_dates` to populate a date picker.

---

## 9. Admin Manual Lead Creation

**File:** `src/components/admin/NewLeadModal.tsx`

Admins can create leads directly from the dashboard without waiting for a family to fill out the public form. This is useful for walk-ins, phone calls, or referrals.

After filling in the lead details, the admin chooses one of three post-create actions:

| Action | What happens |
|---|---|
| Send Booking Link | Creates lead, then calls `approve-enrollment-lead` — skips the "pending review" stage entirely |
| Pick Date for Them | Creates lead, then opens `PickDateModal` — admin books on behalf of the prospect |
| Create Only | Creates lead with `status = 'new'`, no email sent — for record-keeping purposes |

Manually created leads have `source_page = 'admin'` (vs. `'contact'` for form submissions).

### Email is optional

A staff-entered lead does not need an email, but a phone number is required instead. `enrollment_leads.parent_email` is nullable, and `create_enrollment_lead` / `update_enrollment_lead` both route through the shared `normalize_lead_contact` check: at least one of email or phone must be present, and clearing the email on an existing lead is refused unless a phone is already on file. A lead with no email receives no emails at all; staff are expected to follow up by phone, and the admin dashboard offers Call and Text a reminder tools in place of the email-only actions ("Resend Booking Link", etc.) for these leads.

---

## 10. Security Model

### Row Level Security (RLS)

> **What is RLS?** PostgreSQL can enforce rules directly on the database that say "user X can only see rows they're allowed to see." This happens at the database level, so even if the application code has a bug, the database still enforces the rules.

Key RLS policies for enrollment:

| Table | Who can read | Who can write |
|---|---|---|
| `enrollment_leads` | Admins only | Admins only (update); `submit_enrollment_lead` RPC inserts |
| `enrollment_lead_notifications` | Admins only | `send-email` edge function (via service role) |
| `appointment_slots` | Anyone (for booking page) | Admins only |
| `blocked_dates` | Anyone (for booking page) | Admins only |

### The `is_admin()` helper

Every admin check runs through the `is_admin(user_uuid)` PostgreSQL function. It's a `SECURITY DEFINER` function (runs with elevated DB permissions) that checks the `profiles` table for `role = 'admin'`. Centralizing the check in one function means if the logic ever needs to change, it only changes in one place.

### Service Role Key

Edge functions that need to bypass RLS (e.g., to read data as part of processing a webhook) use the `SUPABASE_SERVICE_ROLE_KEY`. This key is kept only in edge function environment variables — it is never sent to the browser.

### Booking token security

The `booking_token` is a UUID (16 random bytes = 128 bits of entropy). The probability of guessing a valid token is astronomically low. A unique index on `booking_token` ensures no two leads can share a token. The booking endpoints only accept valid tokens — there's no endpoint that lists all tokens.

---

## 11. Design Decisions

### Why store notification intent in a table rather than calling the email API directly?

Calling the email API directly inside a database transaction would create a **distributed transaction problem**: if the email succeeds but the DB update fails (or vice versa), the system ends up in an inconsistent state. By inserting a notification row in the same transaction as the lead update, both succeed or both fail together. The email is then sent asynchronously by the webhook-triggered edge function.

### Why are denied leads terminal?

Denial is a deliberate, documented decision. Making it reversible would create ambiguity ("was this denial intentional or accidental?") and would complicate audit trails. If a family is reconsidered, a fresh lead makes the history clear.

### Why does `book-appointment` use a token rather than a login?

Prospects are not registered users. Asking them to create an account just to book a trial class adds significant friction to what should be a short, welcoming process. The token in the email link is the simplest secure mechanism: only the person with the email can click the link.

### Why separate `admin-book-appointment` from `book-appointment`?

The two functions look similar but serve different trust models. `book-appointment` trusts a public token; `admin-book-appointment` trusts an authenticated admin session. Merging them would require one function to handle two completely different authentication paths, which is harder to audit for security.

### Why soft-delete appointment slots?

Deleting a slot record could orphan historical appointment data (leads that referenced the slot's `start_time`). Soft-deleting (setting `is_active = false`) preserves the data integrity while removing the slot from future availability.

### Why are admin notes "best-effort" (no error shown)?

Admin notes are internal metadata, not mission-critical data. If saving a note fails (network hiccup, etc.), it would be jarring to show an error toast for something that isn't blocking any workflow. The comment in the code (`// silent — notes are best-effort`) documents this intentional choice.

### Why does `get_available_slots` use `SECURITY DEFINER`?

The `appointment_slots` table has a public RLS policy that allows `anon` users to read active slots. However, `SECURITY DEFINER` functions can run additional server-side logic (like joining with overrides) without the caller needing explicit permissions on every table involved. It's a controlled way to expose exactly the data the booking page needs, no more.

---

## 12. Booking a Trial Visit at Signup

This section documents the backend behind the live form (§2): a family picks a specific date and time for their trial visit at the moment they sign up, instead of submitting an inquiry and waiting for an admin to approve it and email back a booking link. It is an RPC, a rewritten receipt email, and a calendar-file endpoint.

**`submit_enrollment_lead` is retired from the public form.** The public form now calls `submit_trial_booking`, below, exclusively. `submitEnrollmentLeadWithTimeout()` (`src/lib/supabase/client.ts`) and the `submit_enrollment_lead` RPC itself are no longer called by any live path; they're left in place only because cached copies of the old form (a browser tab left open from before this shipped, a stale service worker, a search-engine cache) could still try to call them for a short while after deploy. A follow-up cleanup PR removes both once those cached copies have had roughly a week to age out.

### The `submit_trial_booking` RPC

**File:** `supabase/migrations/20260921120000_trial_booking.sql`

| Argument | Type | Notes |
|---|---|---|
| `p_parent_name` | text | Required |
| `p_parent_email` | text | Required |
| `p_phone` | text | Required; the older `submit_enrollment_lead` accepts a lead with no phone (it validates the phone only when one is given) |
| `p_children` | jsonb | Required, 1–6 entries, each `{ name, age }` |
| `p_bookings` | jsonb | Required, one entry per program the children fall into, each `{ program_type, slot_id, date }` |
| `p_request_id` | uuid | Optional but strongly expected; see Retry below |
| `p_language` | text | `'en'` or `'es'`, defaults to `'en'` |
| `p_message` | text | Optional, max 1500 characters |
| `p_source_page` | text | Defaults to `'contact'`; see below |

A child's age decides its program (`program_for_age`: 4–7 is Little Dragons, 8–17 is Youth), and the function requires exactly one booking entry per distinct program the submitted children land in, no more, no fewer, no duplicates. So a family with a 5-year-old and a 10-year-old must submit exactly two bookings, one `little_dragons` and one `youth`; a family with two children both age 6 submits exactly one. Every shape is checked before anything is cast: a child's `age` must match a plain 1–2 digit pattern before it's read as an integer, and a booking's `slot_id` (UUID shape) and `date` (`YYYY-MM-DD` shape) are both regex-checked before either is cast to its real type. A malformed value fails with the function's own error, never a raw Postgres cast error.

The booking window (21 days ahead) and the no-same-day rule are fixed inside the function itself, not parameters the caller can widen. These are the same limits the public `book-appointment` endpoint enforces (§6, §8), applied here at the point of first booking instead of on a later self-service page.

### One transaction, full rollback

Creating the lead, inserting its children, and booking every one of its visits all happen inside `submit_trial_booking`'s single transaction. If any step fails, including a slot that got taken by someone else a moment ago, the whole submission rolls back: no orphaned lead, no half-booked family. A web lead either exists complete with all its visits, or it does not exist at all.

Visits are `INSERT`ed already in `scheduled` or `confirmed` status, not created first and then booked in a second step. This matters for the admin bell: `trg_notify_admins_booking_change` (§4, §7) only fires on `UPDATE`, never on `INSERT`, so booking a visit this way produces exactly one `new_lead` bell and never a second "appointment booked" bell for the same visit.

The lead itself follows the same auto-confirm rule as every other booking path (§4): a public trial booking lands the lead at `appointment_scheduled`, or `appointment_confirmed` when the visit is two calendar days away or less.

### Retry: `p_request_id`

The 12-second client timeout (§2) can time out on a slow connection after the database has already committed. A family that resubmits after a timeout must get back the receipt for the visit they already booked, not a second lead or a `slot_taken` error on their own slot.

The form generates a random `p_request_id` once per submission attempt and resends the same one on every retry. It is stored on the lead in `enrollment_leads.request_id`, which carries a partial unique index (`WHERE request_id IS NOT NULL`) so no two leads can ever share one. When `p_request_id` is supplied, the function checks for an existing lead with that exact `request_id` **and** the same `parent_email` before doing anything else; on a match it returns that lead's receipt again instead of creating anything. An advisory lock keyed on the request id makes a genuine concurrent double-submit (two requests in flight at once) wait for the first to finish rather than race it into the unique index.

This is deliberately not inferred from the submitted email plus the requested slots and a time window, the way older retry logic elsewhere in this codebase works. Slot ids and appointment dates are public and guessable; a lookup keyed on "this email, roughly this slot/date, in the last few minutes" would let anyone who knows a family's email brute-force their way to that family's `booking_token`, the credential that lets someone change or cancel the visit, for free and unthrottled. A request id that's random, generated client-side, and checked against the caller's own claimed email closes that off: guessing it is as hard as guessing any other UUID, and it never leaves the parent's own browser except when their own retry sends it back.

### One upcoming visit per family per program

Before creating anything, the function checks whether the family (matched by `parent_email` or by the phone number's last 10 digits, so a typo'd extension or a different area-code prefix still matches) already has an active (`scheduled` or `confirmed`), not-yet-past visit in any of the programs this submission is trying to book. If so, it raises `already_booked` (`P0409`) and creates nothing. A second visit in a program the family is already booked into would just take a slot another family could use; the intended path for that family is to change their existing visit through the link they already have, not book a second one. A family with children in two different programs, only one of which has been booked so far, can still book the other.

### Rate limits

Three limits, checked in order, all `P0429`:

| Limit | Scope | Message |
|---|---|---|
| 30 seconds | Same email | "Please wait a moment before submitting again." |
| 5 per day | Same email or phone | "You have reached the maximum number of submissions for today. Please try again later." |
| 10 per hour | Across all non-`admin` leads, site-wide | "Too many requests right now. Please try again later." |

The hourly cap only counts leads whose `source_page` is not `'admin'`, so staff typing leads in by hand can never block the public form. Because that carve-out exists, the public path is not allowed to claim it for itself: `p_source_page` is only kept as given when it matches a plain lowercase slug shape (`^[a-z0-9_-]{1,50}$`) **and** is not literally `'admin'`; anything else, including a caller that deliberately sends `'admin'`, falls back to `'contact'`. A public submission can never be stored as if a staff member had entered it, and can never opt itself out of the hourly cap this way.

The e2e smoke test's valid-submission run (`e2e/contact-form.spec.ts`) counts against this same 10-per-hour cap, like any other public submission to staging. On a day with a lot of pushes and PR runs against staging in a short window, this test can fail on the 10-per-hour limit even though nothing is actually broken; a failure with `P0429` in the response is that cap, not a regression.

### Error contract

| Error | SQLSTATE | Meaning |
|---|---|---|
| `P0429` | P0429 | One of the three rate limits above |
| `already_booked` | P0409 | The family already has an active visit in one of these programs |
| `slot_taken` | 23P01 | Someone else booked that exact slot/date first (caught by the DB constraint, not a pre-check, so it's race-proof) |
| `date_unavailable` | P0001 | The date is outside the 21-day window, in the past, today, the wrong day of week, or blocked |
| `slot_mismatch` | P0001 | That slot belongs to a different program than the one it was booked against |
| `invalid_booking_request` | P0001 | The booking list's shape is wrong: missing, wrong count, duplicate program, unknown program, malformed `slot_id`/`date`, or (rare) a reused `request_id` under a different email |
| Validation sentences (e.g. "Please provide a valid email.") | P0001 | Plain-English messages for name, email, phone, message length, child count, child name, and child age |

### `preferred_language`

`enrollment_leads.preferred_language` (`'en'` or `'es'`, defaults to `'en'`) is set once from `p_language` at booking time. Staff see it as a "Prefers Spanish" line under the contact info in the lead detail panel (`src/components/admin/leads/LeadDetailPanel.tsx`) when it's `'es'`; nothing is shown for English. The reminder text message an admin sends from **Contact Actions** (`src/components/admin/leads/ContactActions.tsx`, `reminderSmsHref` in `src/lib/contactLinks.ts`) is drafted in Spanish or English to match, so a staff member texting a family doesn't have to remember which language to write in.

In this PR, only two things follow the family's language: the booking receipt email (below) and that staff reminder text message. The reminder *email* (queued by the `appointment-reminders` cron job, §7) is always English, regardless of `preferred_language`. And because `preferred_language` is only ever set by `submit_trial_booking`, a lead created by staff through the admin dashboard (§9) is always English until a later change adds a way for staff to set it.

### The booking receipt email

**Files:** `supabase/functions/send-email/{index,templates,copy}.ts`, `supabase/functions/_shared/copy.ts`

`booking_confirmation` is a family's first email from the school under this flow (there is no separate "thank you, we'll review this" step first). It's queued in the same transaction as the booking itself and rendered in English or Spanish according to the lead's `preferred_language`. Every send carries both an HTML part and a plain-text part (`bookingConfirmationText`), for clients that prefer or require plain text.

It greets the parent by first name only (`firstName()`, splitting on whitespace) and, per visit, shows the program, the children in it, the date and arrival time, an "Add to Google Calendar" link (works with no `booking_token`), and, when a `booking_token` exists, an "Add to Apple or Outlook calendar" link (the `visit-calendar` `.ics` file, below) and a "Change or cancel this visit" link. It also includes the school's address with a Maps link and a short, deliberately price-free "what to expect" paragraph. **It never states a price and never calls the visit free**: the trial is not free, and no email in this flow is allowed to imply otherwise. The subject is `Trial visit booked: {dateShort} at {time}` (Spanish: `Visita de prueba reservada: {dateShort}, {time}`) for one visit, or a plainer "your visits are booked" subject when there's more than one.

The admin `new_lead` alert (always in English) now shows each booked visit (program, children, date, time) inline in the same table it already used for parent/email/phone/message, and adds a "Language: Spanish" row when the family's `preferred_language` is `'es'`, so an admin scanning the inbox already knows before opening the lead. The invite email (`approval`, sent when staff approve a lead or resend a booking link) was reworded to stop claiming the request had been "approved," using plain, neutral wording instead, since under this flow a family may never have been in a pending "awaiting approval" state at all.

Every email subject built from something a person typed (a parent's name, a portal user's display name) is passed through `sanitizeForSubject()` first: it collapses any run of control characters or whitespace (including a raw newline) to a single space, trims, caps the length, and falls back to a fixed word (e.g. "a family") if nothing usable is left. This keeps a stray character in free text from reaching the email provider's subject header unescaped.

### Sender address

All emails, including this receipt, send from `hello@notifications.lbmartialarts.com` with `reply_to: LosBanosMartialArts@gmail.com`, so a parent who hits "reply" reaches a mailbox the school actually reads.

### `visit-calendar`: the calendar-file endpoint

**Files:** `supabase/functions/visit-calendar/{index,ics}.ts`, `supabase/functions/_shared/pacificTime.ts`

A public endpoint that serves a single visit as an RFC 5545 `.ics` file, for the "Add to Apple or Outlook calendar" link in the receipt (Google gets its own separate calendar-render URL, built without a round-trip to this function). Called as:

```
GET <SUPABASE_URL>/functions/v1/visit-calendar?token=<booking_token>
```

The `booking_token` on the program booking is the only credential: no session, no Authorization header, the same trust model as `book-appointment` (§6). The function is deployed with `verify_jwt: false`, so the platform doesn't require a JWT before the request even reaches the code; the function itself needs nothing more than a syntactically valid token.

It returns **404** (plain text, no calendar body) when: the token is missing or not shaped like a UUID (checked before any database query runs); no booking matches it; the booking's status isn't `scheduled` or `confirmed` (which also refuses a cancelled visit); its date or time is unset; or the owning lead is soft-deleted, `denied`, `closed`, or `attended`. That's the same set of lead statuses `book_program_appointment` itself refuses to book against (§4). One gap remains between the two: `book-appointment` does not check `deleted_at` on the lead at all, a pre-existing looseness this endpoint does not share, since `visit-calendar` checks it explicitly. Every response, the 200 and every 404 alike, carries `Cache-Control: private, no-store`, so neither a valid file nor a not-found result sticks around in a browser's or intermediary's cache after a visit is rescheduled or cancelled.

The event is exactly one hour long, starting at the visit's appointment time. `appointment_date`/`appointment_time` are stored as plain Pacific wall-clock values with no timezone attached; `pacificToUtc()` (`_shared/pacificTime.ts`) converts that wall-clock pair into the correct UTC instant for `DTSTART`/`DTEND`, settling on the right side of the daylight-saving transition rather than assuming a fixed UTC offset.

### Deploying these functions

Both functions import from `../_shared/`, so their deploy file lists must be sent directory-prefixed: a flat, root-level file layout will not resolve those imports. `send-email` in particular no longer deploys from the old flat `index.ts`/`templates.ts`/`copy.ts` layout it used before this work; it now needs its `_shared/` dependencies alongside it.

**`send-email`**, `verify_jwt: false`, entrypoint `send-email/index.ts`, files:
- `send-email/index.ts`
- `send-email/templates.ts`
- `send-email/types.ts`
- `send-email/copy.ts`
- `send-email/messages.ts`
- `_shared/copy.ts`
- `_shared/appUrl.ts`

**`visit-calendar`**, `verify_jwt: false`, entrypoint `visit-calendar/index.ts`, files:
- `visit-calendar/index.ts`
- `visit-calendar/ics.ts`
- `_shared/pacificTime.ts`
- `_shared/copy.ts`
- `_shared/appUrl.ts`

After every deploy, fetch the deployed files back and compare them against the branch byte-for-byte. Do not treat a successful deploy call as proof the served code matches what's on disk. `send-email/types.ts` is the one exception worth expecting ahead of time: it must still be sent (the other files import types from it), but every one of those imports is type-only and is erased at build time, so it will not appear in the fetched-back file list. Its absence there is expected, not a mismatch to chase.

### Production rollout notes

After deploying `send-email`, send one real receipt to an address the owner controls: book a throwaway lead through the admin portal, confirm the English receipt arrives with working links, then delete the lead. Staging has no email provider key configured, and this send path has never delivered a real message, so this is the only way to know the Resend integration actually works end to end before a real family relies on it.

### Known exposures

Two things accepted as-is for now rather than fixed in this PR, recorded here so a future reader doesn't have to rediscover them:

- **No CAPTCHA.** Nothing stops a script from calling `submit_trial_booking` directly and repeatedly. Spread across enough different email addresses to dodge the per-email limits, a handful of fake submissions could take every bookable date across the whole three-week window before a real family gets to one. Each fake submission still lands as an ordinary lead with a new-lead bell, so it's visible and cheap to undo: an admin cancelling or deleting the lead frees the slot again immediately.
- **`already_booked` is a yes/no oracle.** Anyone who already holds (or guesses) a family's email address or phone number learns, from the error alone, that the family has an upcoming visit, without learning its date, time, or program. The signal is limited to that one bit; nothing else about the booking is exposed by it. It's also unthrottled by any of the rate limits above: an `already_booked` probe creates no lead, and every one of the three limits counts only created leads, so repeatedly probing the same or different emails never trips a limit.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| **RPC** | Remote Procedure Call — calling a PostgreSQL function through the Supabase API, as if it were an API endpoint |
| **Edge Function** | A short-lived serverless function deployed by Supabase, written in TypeScript/Deno |
| **RLS** | Row Level Security — database-level access control rules in PostgreSQL |
| **JWT** | JSON Web Token — a signed, tamper-proof string that proves a user's identity |
| **SECURITY DEFINER** | A PostgreSQL attribute that makes a function run with the permissions of the function's creator (elevated), rather than the caller |
| **Soft delete** | Marking a record as inactive instead of deleting it, preserving history |
| **Outbox pattern** | Writing "send this email" to a queue table, then processing it asynchronously, instead of calling the email API inline |
| **Booking token** | A random UUID stored on a lead that serves as a one-time password for the prospect to access their booking page |
| **Webhook** | A configured HTTP call that Supabase makes automatically when something happens in the database (e.g., a row is inserted) |
| **Auto-confirm** | When a booking is made fewer than 2 calendar days in advance, the status goes directly to `appointment_confirmed` instead of `appointment_scheduled` |
