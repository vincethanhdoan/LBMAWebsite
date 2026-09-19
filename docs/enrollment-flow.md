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
12. [Glossary](#12-glossary)

---

## 1. Big Picture

An **enrollment lead** is a record that represents one family's journey from "I'm interested" to "I have an appointment." The flow has two sides:

- **The prospect side** — a parent fills out a public form and later receives emails with links to book an appointment.
- **The admin side** — staff review submissions in a dashboard and decide whether to approve, deny, or schedule the family directly.

The flow is entirely serverless: there is no custom backend server. All business logic runs either inside PostgreSQL (as stored procedures called **RPCs**) or inside **Supabase Edge Functions** (small JavaScript/TypeScript functions that run on Deno at the edge).

```
Prospect fills out form
        │
        ▼
  submit_enrollment_lead RPC
  (PostgreSQL, runs on DB)
        │
        ├─► lead row inserted in enrollment_leads
        ├─► new_lead notification queued   → email to admin
        └─► submission notification queued → thank-you email to prospect
                │
                ▼
          Admin reviews lead in dashboard
                │
         ┌──────┴──────┐
         │             │
       Deny          Approve
         │             │
         ▼             ▼
   denial email    approval email with booking link
                        │
               ┌────────┴────────┐
               │                 │
         Prospect            Admin books
         self-books          for them
               │                 │
               └────────┬────────┘
                        ▼
              appointment_scheduled / appointment_confirmed
                        │
                        ▼ (2 days out → auto-confirm)
                appointment_confirmed
                        │
                        ▼
             reminder email (2 days before)
```

---

## 2. The Contact Form (Entry Point)

**File:** `src/components/public/ContactPage.tsx`

The contact form is publicly accessible — no login required. It collects:

| Field | Required? | Notes |
|---|---|---|
| Parent name | Yes | Min 2 characters |
| Parent email | Yes | Standard email format |
| Phone | No | |
| Child's name | No | |
| Child's age | No | Validated 3–99 client-side |
| Message / notes | No | Free text |

### What happens on submit

1. The form calls `submitEnrollmentLeadWithTimeout()` from `src/lib/supabase/client.ts`, which is a thin wrapper around Supabase's RPC call with a 12-second timeout.
2. That calls the PostgreSQL function `submit_enrollment_lead(...)` which:
   - Validates inputs (name, email, age range).
   - Inserts a row into `enrollment_leads` with `status = 'new'`.
   - Queues a `new_lead` notification for admins.
   - Queues a `submission` notification (a thank-you email) for the prospect.
3. On success, the form replaces itself with a confirmation message: "We got your message."

### Why a 12-second timeout?

Serverless database calls occasionally experience cold-start latency. The timeout prevents the UI from hanging indefinitely while still giving the DB enough time to respond under normal conditions.

### Why validate age client-side AND server-side?

Client-side validation gives fast feedback in the UI (no round-trip needed). Server-side validation (the `CHECK` constraint in the DB) is the real safety net — a client-side check can always be bypassed by someone making a raw HTTP request.

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

The one exception is the public `submit_enrollment_lead` RPC, which always has an email (the contact form requires it) and inserts its own `submission` and `new_lead` rows directly rather than going through `queue_family_notification`.

### Email types and recipients

| Type | Recipient | When sent |
|---|---|---|
| `new_lead` | All admins who have `notify_new_leads = true` in `admin_notification_settings` | On form submit |
| `submission` | Prospect | On form submit (thank-you confirmation) |
| `approval` | Prospect | When admin approves / resends booking link |
| `denial` | Prospect | When admin denies |
| `booking_confirmation` | Prospect | After an appointment is booked |
| `reminder` | Prospect | Queued by the `appointment-reminders` pg_cron job at 6pm Pacific, two days before the earliest upcoming visit |

### The `new_lead` fan-out

For `new_lead` notifications, the `send-email` function looks up `admin_notification_settings` and emails every active admin who has `notify_new_leads = true`. This means multiple admins can receive new lead alerts. The original `recipient_email` on the notification row is a fallback in case no admins are configured.

### Email delivery service

Emails are sent via the **Resend** API (`https://api.resend.com/emails`). The API key is stored as a Supabase secret (`RESEND_API_KEY`). All emails come from `no-reply@notifications.lbmartialarts.com`.

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

The `booking_token` is a UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Because it's random and never guessable, possession of the token proves authorization — no login required. The booking page (frontend route not yet implemented) would call the `book-appointment` edge function.

### Failed deliveries

If the call to Resend fails, `send-email` marks the notification row `status = 'failed'` (with the error saved to `error_message`) instead of leaving it `queued` or `sent`, so a delivery failure isn't silently lost. The admin Overview surfaces this as an attention item with a "Retry email" button:

| Failure | Attention item | Retry calls |
|---|---|---|
| A `reminder` notification failed, on an `appointment_scheduled` or `appointment_confirmed` lead | "Confirmation email failed" | `send-appointment-reminder` |
| A `booking_confirmation` notification failed, on an `appointment_scheduled` or `appointment_confirmed` lead | "Booking receipt email failed" | `resend-booking-link` with `intent: 'receipt'` |

Retrying a receipt re-queues the same `booking_confirmation` type through `queue_family_notification`, which renders whatever visits are still active for the lead at send time, not necessarily the same visit that failed the first time.

Both `booking_confirmation` and `reminder` sends need at least one upcoming visit to render; if none is left by the time the email is due (for example, the visit was cancelled after the notification was queued), `send-email` records the row as `failed` with the message "No upcoming visit was left when this email was due." instead of leaving it `queued` forever, which would otherwise block every later receipt or reminder for that lead through `queue_family_notification`'s already-queued check. Once the lead has moved off `appointment_scheduled`/`appointment_confirmed`, that failure no longer raises an attention item, matching the gating above.

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

## 12. Glossary

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
