# LBMAA

LBMAA is the family portal and admin system for a martial arts academy. It handles the full
family lifecycle: prospective families submit an enrollment lead from the public site, staff review
leads and book a trial appointment, and enrolled families use an authenticated portal for messaging,
announcements, and managing their students. Staff run the academy from a separate admin portal. The
public marketing site is currently behind an under-construction page while the academy rebrands, so
the login route is unlinked and only the enrollment form is publicly reachable.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 7
- **UI:** Tailwind CSS 4, shadcn/ui (Radix primitives), TanStack Query for server state, React Router 7
- **Backend:** Supabase — Postgres with row-level security, Auth via magic links, Realtime, Storage, and Edge Functions
- **Hosting:** Vercel

## Architecture

The app is a single-page React application backed entirely by Supabase. There is no custom backend
server; the browser talks to Postgres through PostgREST, and server-side logic that can't live in the
database (transactional email, privileged admin actions) runs in Supabase Edge Functions.

### Routes and access

Routing and access gating live in `src/App.tsx`, driven by the `accessState` enum from
`src/hooks/useAuth.ts`.

- `/` — public site (no auth; currently the under-construction page)
- `/dashboard` — family portal (authenticated, `role = 'family'`)
- `/admin` — admin portal (authenticated, `role = 'admin'`)
- `/onboarding` — first-login setup for family users who have no `families` record yet

Access is invite-only. The login flow checks that an email exists in `registered_emails` (via the
`check_email_has_account` RPC) before Supabase sends a magic link, so unknown emails never receive a
login link.

### Data layer

Every Supabase call goes through a thin wrapper in `src/lib/supabase/` rather than being issued
inline from components:

- `client.ts` — Supabase client instance and timeout-wrapped RPC helpers
- `selects.ts` — column-select string constants, shared by queries and mutations to prevent over-fetching
- `queries.ts` — read operations
- `mutations.ts` — write operations
- `realtime.ts` — Realtime subscription helpers
- `storage.ts` — message-attachment upload/download

`src/lib/types.ts` is the canonical TypeScript source for all domain types.

### Database security

Data access is enforced in the database, not just the UI. Tables are protected by row-level security
policies that call a small set of `SECURITY DEFINER` helper functions — `is_admin`, `is_owner`,
`is_conversation_member`, `is_family_to_staff_pair`, and `is_valid_dm_conversation`. Direct messages
are constrained to family↔admin pairs at the policy level, so a family-to-family DM cannot be created
even by calling the API directly. Function EXECUTE grants are locked down: `PUBLIC` execute is
revoked, and new functions receive no API-role access until a migration grants it explicitly.

## Local development

Prerequisites: Node 20 or newer.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your Supabase project credentials:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module replacement. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint over the project. |
| `npm run typecheck` | Type-check with `tsc --noEmit`. |
| `npm run format` | Format the codebase with Prettier. |
| `npm run format:check` | Verify formatting without writing changes. |

## Database

Migrations live in `supabase/migrations/` as numbered SQL files and are applied through the Supabase
SQL editor or CLI. The migration history is not a clean linear replay — it includes a 2026-07-10
rebaseline and a few out-of-band schema changes — so the live database is the authoritative schema.
Fetch a live function or table definition before rewriting it rather than trusting an older migration
file.

## Deployment

The app is hosted on Vercel and auto-deploys from `main`.

Engineering workflow, quality gates, and contribution conventions are documented in
[`docs/engineering.md`](docs/engineering.md).
