> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# LBMAA — Frontend Source Guide

Los Banos Martial Arts Academy — member portal and public website. React + Vite SPA backed by Supabase.

## Stack

- **React 19** + **Vite 7** + **TypeScript**
- **Supabase** — Auth (magic link), PostgREST, Realtime, Storage
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **react-router-dom v7** — client-side routing
- **Vercel** — hosting + analytics

## Dev commands

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview production build
npm run lint      # ESLint check
```

Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Folder structure

```
src/
  App.tsx                   # routes + auth guards
  main.tsx                  # entry point
  globals.css               # global styles + Tailwind base
  hooks/
    useAuth.ts              # session bootstrap, accessState, signOut
    useProfile.ts           # family profile CRUD (family portal)
    useAdminFamilies.ts     # family/student data for admin panel
  lib/
    types.ts                # canonical domain types (source of truth)
    format.ts               # shared date/time/text formatters
    supabase/
      client.ts             # Supabase client + timeout-based RPC helpers
      selects.ts            # column-select string constants (prevent over-fetching)
      queries.ts            # read operations
      mutations.ts          # write operations
      realtime.ts           # Realtime subscription helpers
      storage.ts            # message attachment upload/download
  components/
    public/                 # public marketing pages (no auth)
    dashboard/              # family portal tabs
    admin/                  # admin portal tabs
    onboarding/             # first-login onboarding flow
    shared/                 # BookingCalendar and other cross-context components
    figma/                  # ImageWithFallback (shared image utility)
    ui/                     # shadcn/ui component library (do not manually edit)
    NotificationBell.tsx    # notification dropdown (used in both dashboards)
    LoginModal.tsx          # magic-link login flow
    AuthCallback.tsx        # OTP token verification on redirect
  pages/
    BookingPage.tsx         # public booking page (/book/:token)
    ConfirmPage.tsx         # appointment confirmation (/confirm/:token)
  experimental/             # prototype work — not in production routes
    publicV2/               # routed at /experimental/public/*
    publicV3/               # not routed (prototype only)
```

## Routes and access

| Path | Access |
|------|--------|
| `/*` | Public — no auth |
| `/dashboard` | Family role (authenticated, provisioned, active) |
| `/admin` | Admin role only |
| `/onboarding` | Family role, `needs_onboarding` state only |
| `/experimental/public/*` | Public (publicV2 prototype) |
| `/book/:token` | Public (booking link) |
| `/confirm/:token` | Public (appointment confirmation) |

`useAuth` drives `accessState`: `ready` → `needs_onboarding` → `blocked`.

## Key flows

**Login** — `LoginModal` → `check_email_has_account` RPC (invite-only gate) → `signInWithOtp` magic link → `AuthCallback` verifies OTP → `useAuth` redirects by `accessState`.

**Onboarding** — `FamilyOnboarding` creates `profiles.display_name`, inserts `families` row, creates primary `guardians` record, then redirects to `/dashboard`.

**Messaging** — DMs are constrained to `family↔admin` pairs. `create_or_get_dm_conversation` RPC enforces this at DB level. Unread state tracked via `conversation_members.last_read_at`.

**Enrollment leads** — `ContactPage` → `submit_enrollment_lead` RPC → inserts lead row visible to admins. Admin side uses `create_enrollment_lead` RPC for manual lead entry.

## Supabase

Migrations are in `supabase/migrations/` numbered 000–027. Apply in order.

**Note:** Migrations 007, 010, 011, and 019 each have two files (different feature names, same number). Both are applied; the Supabase CLI tracks by filename.

Critical security-definer RLS helpers — do not drop or redefine without updating all dependent policies:
`is_admin`, `is_conversation_member`, `is_family_to_staff_pair`, `is_valid_dm_conversation`

Edge functions in `supabase/functions/`: `send-email`, `invite-family`, `approve-enrollment-lead`, `deny-enrollment-lead`, `book-appointment`, `admin-book-appointment`, `confirm-appointment`, `resend-booking-link`.

## Lint notes

The following shadcn/ui files emit `react-refresh` and impure-function ESLint errors by design — do not modify them:
`ui/badge.tsx`, `ui/button.tsx`, `ui/form.tsx`, `ui/navigation-menu.tsx`, `ui/sidebar.tsx`, `ui/toggle.tsx`

Files in `src/experimental/` have known lint warnings that are acceptable for prototype code.
