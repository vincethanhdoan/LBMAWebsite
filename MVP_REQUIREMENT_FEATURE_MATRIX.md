> **Superseded in part (2026-07-16).** The R1-R3 requirements remain binding in intent, but implementation references here are outdated: migrations were rebaselined on 2026-07-10 (numbered files now in `supabase/migrations_archive/`), and deactivation (R3) is enforced via `profiles.is_active` checked by `is_admin`/`is_owner`, not `students.status`. See `CLAUDE.md` for the current model.

# LBMAA MVP Requirement-to-Feature Matrix (Frozen)

Last updated: 2026-02-26
Owner: Product + Engineering
Scope status: Frozen for MVP delivery

This document is the MVP source of truth for requirement coverage and acceptance criteria for:
- Invite-only account access
- Direct message (DM) limits
- Deactivation behavior

## Freeze Rules

- The acceptance criteria in this file are locked for MVP.
- Any proposed change requires explicit sign-off from product + engineering before implementation.
- New non-critical enhancements are deferred to post-MVP backlog.

## Requirement-to-Feature Matrix

| Requirement ID | Requirement | Current Feature Mapping | Key Files / DB Objects | MVP Acceptance Criteria (Frozen) | Verification Scenarios |
|---|---|---|---|---|---|
| R1 | Invite-only portal access | Login flow checks whether an email exists in pre-registered records before sending a magic link. Unauthorized emails are blocked with guidance text. | `src/components/LoginModal.tsx`, `src/lib/supabase/client.ts`, `supabase/migrations/001_initial_schema.sql` (`check_email_has_account`, `registered_emails`) | 1) Only pre-registered emails can request a magic link. 2) Unknown emails must never receive a login link. 3) Unauthorized users must see a clear “not invited/contact academy” message. 4) Protected routes remain inaccessible without a valid authenticated user session. | A) Submit a registered email -> magic link is sent. B) Submit an unregistered email -> request is blocked with user-facing message. C) Try opening `/dashboard` or `/admin` while signed out -> redirected to `/`. |
| R2 | DM policy: no private parent-to-parent messaging | Messaging UI labels DMs as family-to-instructor and provides global group chat for community communication. Conversation and membership write paths exist and are constrained by RLS membership rules. | `src/components/dashboard/MessagesTab.tsx`, `src/lib/supabase/mutations.ts`, `src/lib/supabase/queries.ts`, `supabase/migrations/001_initial_schema.sql` (`conversations`, `conversation_members`, `messages` policies) | 1) Family users can participate in group/community spaces. 2) Family users may DM staff/admin only. 3) Family-to-family private DM creation is blocked at backend policy level (not UI-only). 4) Attempts to bypass UI via direct API/database calls must fail. | A) Family -> staff DM succeeds. B) Family -> family DM attempt fails (policy rejection). C) Family can post in group chat/blog/comments. D) Admin can still moderate and participate per role permissions. |
| R3 | Deactivation semantics preserve history and block active access | Student status supports `active`/`inactive`; admin views derive family activity from student statuses. Route protection uses authenticated sessions and profile roles. | `src/components/admin/AdminUsersTab.tsx`, `src/hooks/useAuth.ts`, `src/App.tsx`, `supabase/migrations/001_initial_schema.sql` (`students.status`, RLS policies) | 1) Admin can deactivate an account without deleting historical records. 2) Deactivated families/users lose portal access until reactivated. 3) Existing historical data (messages, announcements, profile history) remains intact and visible to authorized users. 4) Reactivation restores access without data recreation. | A) Mark family/user inactive -> next login/access attempt is denied. B) Historical messages/content remain queryable by authorized roles. C) Reactivate account -> access restored using same account identity. |

## MVP Definition of Done for Assigned Scope

- Requirements `R1`, `R2`, and `R3` are implemented and validated against all verification scenarios above.
- UI behavior and backend/RLS behavior are consistent (no policy gaps).
- Regression checks pass for login, route gating, messaging, and admin management flows.
- Any remaining deviations are explicitly tracked as blockers before release.

## Current Gap Notes (To Resolve During Delivery)

- `R2` likely needs additional backend hardening to guarantee family-to-family DM creation is impossible in all paths.
- `R3` currently models active/inactive primarily at student level; explicit family/user-level access disable checks should be enforced during auth/profile loading.
- Admin invite flow currently sends OTP directly; final invite-only onboarding should require pre-registration workflow ownership by admin records.
