> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# Architecture Overview

## 1) High-Level System

LBMAA is a single-page React app backed by Supabase services:

- Auth: magic-link login
- PostgREST: table/RPC access
- Realtime: pub/sub on selected tables
- Storage: message attachment objects and signed URL access

Client-side routing and role gating are handled in `src/App.tsx`.

## 2) Runtime Boundaries

- **Presentation layer**
  - `src/components/public/*`
  - `src/components/dashboard/*`
  - `src/components/admin/*`
  - `src/components/ui/*`
- **State and orchestration hooks**
  - `src/hooks/useAuth.ts`
  - `src/hooks/useProfile.ts`
- **Data access layer**
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/queries.ts`
  - `src/lib/supabase/mutations.ts`
  - `src/lib/supabase/realtime.ts`
  - `src/lib/supabase/storage.ts`
- **Data and security model**
  - `supabase/migrations/*.sql`

## 3) Route and Access Model

Defined in `src/App.tsx`:

- `/` public route
- `/dashboard` authenticated route
- `/admin` authenticated + admin-only route
- `/onboarding` authenticated route for family users with no family record yet

`useAuth` computes access state:

- `ready`: authenticated + provisioned + active
- `needs_onboarding`: family user exists but family record does not
- `blocked`: not provisioned or deactivated/inactive account state

## 4) Key Application Flows

### 4.1 Login and Session Bootstrap

1. User submits email in `LoginModal`.
2. `check_email_has_account` RPC is called via timeout wrapper.
3. If email is registered, `supabase.auth.signInWithOtp` sends a magic link.
4. `useAuth` processes the returning token hash and sets session explicitly.
5. Profile/family status determines redirect to dashboard, onboarding, or blocked state.

### 4.2 First Login Onboarding (Family)

1. Family user hits `/onboarding`.
2. `FirstLoginOnboarding` updates `profiles.display_name`.
3. Creates `families` row with owner as current user.
4. Creates primary `guardians` record.
5. Redirects to dashboard.

### 4.3 Messaging

1. `MessagesTab` loads global and DM conversations.
2. DMs are constrained to family<->admin or admin<->admin.
3. `create_or_get_dm_conversation` RPC ensures idempotent DM creation.
4. `last_read_at` on `conversation_members` powers unread count behavior.
5. Optional attachments upload to `message-attachments` bucket and map to `message_attachments`.

### 4.4 Public Enrollment Leads

1. Visitor submits `ContactPage` form.
2. `submit_enrollment_lead` RPC inserts a lead and notification queue row.
3. Admin users can view/update lead queues through authenticated access governed by RLS.

## 5) Security Architecture

- Row-level security is enabled on core tables.
- Access rules are role-aware (`admin` vs `family`) and ownership-aware.
- Security-definer helper functions avoid recursive RLS checks for common authorization decisions.
- DM policy constraints are enforced at DB level, not only UI level.
- Storage policies enforce user-specific object prefix and file constraints.

## 6) Eventing and Realtime

Realtime listeners are used for:

- Announcements
- Announcement comments
- Blog posts/comments
- Messages
- Conversations
- Reviews

These channels update UI state after inserts/updates/deletes without full page reload.

## 7) Notable Architectural Tradeoffs

- Data APIs are intentionally thin wrappers around Supabase calls for rapid iteration.
- Some query paths include fallback behavior for schema drift compatibility (for example around `last_read_at` or relationship joins).
- The repo currently includes legacy JS prototype entry files next to active TS paths; current runtime uses `src/main.tsx`.
