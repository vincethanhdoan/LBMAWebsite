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

When a booking is made (either by the prospect or admin), the system checks: is the appointment date fewer than 2 calendar days away? If yes, the status jumps directly to `appointment_confirmed` instead of `appointment_scheduled`. This avoids confusion where someone books for tomorrow and sees "scheduled" rather than "confirmed."

The comparison uses **UTC midnight** to avoid timezone edge cases in the edge function, which runs in UTC.

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

**Authentication:** No Supabase session needed. Auth is the `booking_token` in the request body. This is intentional — the prospect doesn't have an account, and we can't ask them to log in just to book.

**What it does:**
1. Looks up the lead by `booking_token`. Rejects if token is invalid.
2. Checks that the lead's current status is one of `approved`, `appointment_scheduled`, or `appointment_confirmed`. (This allows re-booking on an existing appointment.)
3. Validates the slot exists and is active.
4. Validates the `appointmentDate` matches the slot's `day_of_week`.
5. Checks for overrides (blocked dates) on that slot/date combination.
6. Applies the auto-confirm rule (< 2 days → `appointment_confirmed`).
7. Updates the lead with the date, time, and new status.
8. Queues a `booking_confirmation` notification email.

**Why allow re-booking?** A prospect who already has a scheduled appointment might need to reschedule. Allowing them to use the same link keeps the experience simple.

---

### `admin-book-appointment`

**File:** `supabase/functions/admin-book-appointment/index.ts`

**Trigger:** Admin clicks "Pick Date for Them" and selects a slot/date in the PickDateModal.

**Almost identical to `book-appointment`**, but:
- Requires admin authentication instead of a booking token.
- Generates a `booking_token` if one doesn't exist yet (in case the lead was never approved through the normal flow).

**Why have a separate function?** The auth mechanism is fundamentally different (admin JWT vs. public token). Combining them into one function would mean one code path with two very different auth checks, which is harder to reason about and audit.

---

### `resend-booking-link`

**File:** `supabase/functions/resend-booking-link/index.ts`

**Trigger:** Admin clicks "Resend Booking Link."

**What it does:**
1. Verifies admin identity.
2. Checks the lead is in a resendable status (`approved`, `appointment_scheduled`, or `appointment_confirmed`).
3. Inserts another `approval` notification row — this re-triggers the same booking link email.

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

### Email types and recipients

| Type | Recipient | When sent |
|---|---|---|
| `new_lead` | All admins who have `notify_new_leads = true` in `admin_notification_settings` | On form submit |
| `submission` | Prospect | On form submit (thank-you confirmation) |
| `approval` | Prospect | When admin approves / resends booking link |
| `denial` | Prospect | When admin denies |
| `booking_confirmation` | Prospect | After an appointment is booked |
| `reminder` | Prospect | 2 days before appointment (infrastructure exists, not yet wired to a scheduler) |

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

---

## 8. Appointment Availability System

### Slots

Admins configure recurring time slots via the Availability Settings page (`src/components/admin/AdminAvailabilitySettings.tsx`).

Example slot: "Wednesdays 4–6 PM" → `day_of_week = 3`, `start_time = 16:00`, `end_time = 18:00`.

Slots are managed via RPCs:
- `upsert_appointment_slot(...)` — creates or updates a slot
- `delete_appointment_slot(slot_id)` — soft-deletes (sets `is_active = false`)

**Soft delete** means the record stays in the database; it's just marked inactive. This preserves historical data — existing appointments that referenced the slot aren't broken.

### Overrides (blocked dates)

An override blocks a specific slot on a specific date. Example: block the Wednesday slot on Christmas Day.

Key SQL constraint: `UNIQUE(slot_id, override_date)` — you can only block a given slot on a given date once. Trying to add a duplicate override does an `ON CONFLICT ... DO UPDATE` (upserts the reason instead).

### Available date calculation

The `get_upcoming_bookable_dates(slot_id, weeks_ahead)` RPC returns a list of upcoming dates where a slot is available. It:
1. Loops day by day from tomorrow to `weeks_ahead` weeks out.
2. For each day, checks if the day of the week matches the slot's `day_of_week`.
3. Checks that no override exists for that slot/date combination.
4. Returns matching dates.

The frontend booking picker (used in `PickDateModal`) would call this RPC to populate a date picker.

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
