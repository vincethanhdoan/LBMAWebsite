# Environments

The app runs against three environments. Production data is never touched by local
development or preview deployments.

| Environment | Runs when | Frontend | Supabase project |
| --- | --- | --- | --- |
| **Local** | `npm run dev` on your machine | reads `.env` | staging |
| **Preview** | every PR / non-`main` branch on Vercel | Preview-scoped Vercel env vars | staging |
| **Production** | `main` deployed on Vercel | Production-scoped Vercel env vars | production |

- **Production** — `qfyeguikxxwwxpxleqrr` — real family data. Source of truth for the schema.
- **Staging** — `btjeppigvvlccnsrkpjy` (`lbma-staging`) — a schema copy of production with
  disposable seed data. Safe to break, wipe, and rebuild.

## How the wiring works

The frontend reads exactly two variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- **Local:** set in `.env` (git-ignored). Points at staging; production values are kept in
  the same file, commented out, for a quick manual switch.
- **Vercel:** each variable exists twice — one entry scoped to **Production** (production
  values) and one scoped to **Preview** (staging values). Vercel selects the matching entry
  per deployment. Development scope is unused; local dev reads `.env`, not Vercel.

Keys live in each project's dashboard (Settings → API). Never commit the `service_role` key.

## Sentry error reporting and source maps

- `VITE_SENTRY_DSN` — Sentry project DSN. Set on Vercel Production and Preview. Absent
  locally, which disables reporting.
- `VITE_SENTRY_ENVIRONMENT` — `production` on the Production target, `preview` on Preview.
  Tags events so they can be filtered.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — build-time only, Vercel Production +
  Preview. Enable source map upload. Never `VITE_`-prefixed: they must not reach the client
  bundle.

Source maps upload from the **Vercel** build, not GitHub Actions: `@sentry/vite-plugin` in
`vite.config.js` only activates when `SENTRY_AUTH_TOKEN` is present, and that token is set in
Vercel env vars only. CI builds run without it and silently skip upload.

## Migrations

Production is the source of truth for the schema; its migration history is not linearly
replayable from arbitrary points, so treat `supabase/migrations/` as the record and apply
changes deliberately.

- **Staging** is CLI-managed. Apply migrations with:
  ```bash
  npx supabase link --project-ref btjeppigvvlccnsrkpjy   # one-time, needs staging DB password
  npx supabase db push --linked
  ```
- New migrations should apply cleanly to a fresh project (the `20260710000000_baseline.sql`
  snapshot plus the numbered migrations). Every new RPC must `GRANT EXECUTE` explicitly
  (see `docs/engineering.md`).
- Do **not** point the CLI at production for `db push`. Production schema changes are made
  deliberately through the SQL editor / MCP.

## Rebuilding staging from scratch

If staging drifts or needs a reset, recreate it (all steps are reproducible):

1. Create a free Supabase project; enable Data API, auto-RLS.
2. `supabase link --project-ref <new-ref>` then `supabase db push --linked` to load the schema.
3. Set the database default search path so migrations resolve extension functions:
   `ALTER DATABASE postgres SET search_path TO "$user", public, extensions;`
4. Rewrite the two notify functions (`enrollment_lead_notification_notify`,
   `portal_email_queue_notify`) so their `net.http_post` URL and bearer token target the new
   project — otherwise they fire at production.
5. Deploy edge functions: `supabase functions deploy <name> --use-api` (add `--no-verify-jwt`
   for all except `admin-book-appointment`, `invite-family`, `admin-confirm-appointment`).
6. Unschedule the `appointment-reminders` cron so staging never sends email on a timer.
7. Point Vercel Preview env vars and local `.env` at the new project.

## Testing the portal on staging

The app is invite-only, so a fresh staging database has no accounts. To log in:

1. Configure staging Auth (Authentication → URL Configuration): Site URL `http://localhost:5173`;
   Redirect URLs `http://localhost:5173/**` and `https://*.vercel.app/**`.
2. Register an admin: insert the email into `registered_emails` with
   `invited_as_role = 'admin'`, `invitation_status = 'invited'`, then create the account via
   the Admin API (`POST /auth/v1/admin/users` with the service key, `email_confirm: true`).
   The `handle_new_user` trigger assigns the admin role; set `is_owner = true` on the profile
   for full access.
3. Request a magic link from the login screen. Staging's built-in email service delivers it
   (rate-limited; fine for testing). App transactional emails (booking confirmations) need
   `RESEND_API_KEY` set in the staging edge-function secrets — optional for portal testing.
