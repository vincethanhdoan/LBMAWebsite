> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# Design Documentation

## 1) Product Goals

LBMAA website combines public marketing and a protected portal with these goals:

- Keep family/staff access invite-based and controlled
- Provide lightweight, secure communication channels
- Preserve historical records when accounts are disabled
- Support operational intake from the public contact flow

## 2) Primary User Roles

- **Public Visitor**
  - Browse public website content
  - Submit enrollment interest form
- **Family User**
  - Access family portal after invite-based login
  - Read announcements/blog and participate in comments
  - Message instructors/admin via policy-constrained channels
  - Manage family/student profile records
- **Admin User**
  - Manage communications and moderation workflows
  - Manage family lifecycle and student status
  - Invite families and oversee enrollment lead flow

## 3) Core UX Journeys

### 3.1 Invite-Only Authentication Journey

1. User opens login modal from public site.
2. Email is verified against registered account records before OTP send.
3. Valid account receives magic link; invalid account gets explicit guidance.
4. Post-login, route guard sends user to onboarding, dashboard, or blocked state.

Design intent:

- Avoid accidental account creation from unknown emails.
- Reduce confusion by showing precise failure reasons.

### 3.2 Family Onboarding Journey

1. Newly authenticated family with no `families` row is redirected to onboarding.
2. User enters primary guardian details.
3. System creates family + primary guardian in one flow.
4. User enters main dashboard with essential profile scaffolding established.

Design intent:

- Ensure downstream tabs have minimal valid data shape.
- Keep first-time setup short and friction-light.

### 3.3 Messaging Journey

1. User can access global group conversation.
2. User can open direct threads only with policy-allowed recipients.
3. Message read state updates unread counters.
4. Optional attachments are validated by file type/size and served via signed URL.

Design intent:

- Support staff-family coordination while preventing private family-to-family DMs.
- Keep moderation and policy enforcement in backend controls, not UI-only.

### 3.4 Admin Family Lifecycle Journey

1. Admin can deactivate/reactivate/archive family accounts.
2. Deactivation blocks active access while preserving data history.
3. Student statuses can be adjusted without deleting records.

Design intent:

- Preserve operational history and compliance records.
- Avoid destructive account workflows.

### 3.5 Public Enrollment Capture Journey

1. Public visitor submits enrollment interest form.
2. Server-side RPC validates and stores lead details.
3. Notification queue row is created for faculty follow-up.
4. Admin role can review/update status through secure data access.

Design intent:

- Keep public write path narrow and auditable.
- Minimize spam/noise with server-side validation checks.

## 4) Design Constraints

- Access control must remain role-aware (`family`, `admin`) and ownership-aware.
- Data writes should prefer typed wrapper functions from `src/lib/supabase`.
- RLS and RPC contracts are the source of truth for permission boundaries.
- Route guards must continue to enforce blocked/onboarding states.

## 5) UX and Product Consistency Notes

- Public and portal experiences intentionally share visual language but have different trust boundaries.
- Messaging, announcements, and blog emphasize community while preserving admin moderation authority.
- Family management flows prioritize "disable and retain history" over deletion.

## 6) Known Limitations (Current State)

- Repository includes legacy JS prototype files alongside active TS implementation.
- ESLint configuration is currently JS-focused; TS-specific linting is not yet formalized.
