> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# Database and Security Documentation

## 1) Migration Files

- `001_initial_schema.sql`
  - Core tables, indexes, helper functions, triggers, RLS, storage policies, grants
- `002_public_enrollment_leads.sql`
  - Public enrollment lead + notification queue tables and submit RPC
- `003_conversation_member_read_state.sql`
  - Adds `conversation_members.last_read_at` and update policy
- `004_profiles_admin_visibility_for_messaging.sql`
  - Allows authenticated users to view admin profiles for DM target discovery
- `005_create_or_get_dm_conversation_rpc.sql`
  - Adds secure, idempotent DM conversation RPC

## 2) Core Tables

- Identity and family domain:
  - `profiles`
  - `families`
  - `guardians`
  - `students`
- Communication domain:
  - `announcements`
  - `announcement_comments`
  - `blog_posts`
  - `blog_comments`
  - `conversations`
  - `conversation_members`
  - `messages`
  - `message_attachments`
- Public-facing and ratings:
  - `reviews`
  - `registered_emails`
  - `enrollment_leads`
  - `enrollment_lead_notifications`

## 3) Key Helper Functions

- `update_updated_at_column()`
  - Trigger helper for `updated_at` maintenance
- `handle_new_user()`
  - Creates default profile and syncs `registered_emails`
- `handle_user_deleted()`
  - Removes email from `registered_emails`
- `is_admin(user_uuid)`
  - Security-definer helper for policy checks
- `is_conversation_member(conv_id, user_uuid)`
  - Membership helper for message/conversation policies
- `is_family_to_staff_pair(user_a, user_b)`
  - Enforces DM role pair constraints
- `is_valid_dm_conversation(conv_id)`
  - Validates DM composition and allowed pairing
- `check_email_has_account(check_email)`
  - Invite-only login pre-check
- `submit_enrollment_lead(...)`
  - Public lead insert + notification queue seed
- `create_or_get_dm_conversation(other_user_id)`
  - Idempotent DM creation/retrieval for allowed user pairs

## 4) RLS Model Summary

RLS is enabled across primary portal tables.

High-level rules:

- Users can manage their own profile/family records.
- Admins can broadly view/manage family/guardian/student records.
- Authenticated users can view announcements/blog and create comments/posts per policy.
- Conversation/message access is membership-scoped.
- DM participation is constrained by role pair validation.
- Review reads are public; writes are constrained to authenticated family ownership.
- Enrollment lead tables are admin-visible/updateable only.

## 5) Messaging Security Model

Messaging security is multi-layered:

1. Conversation membership RLS checks
2. DM participant-pair checks (`family<->admin`, `admin<->admin`)
3. `is_valid_dm_conversation` checks on message and attachment access
4. Dedicated DM RPC that enforces role pairing during creation
5. Read state ownership constraints on `conversation_members.last_read_at`

## 6) Storage Policies

Bucket: `message-attachments`

Policy intent:

- Insert requires authenticated role and object path scoped to current user prefix.
- Select requires attachment linkage to accessible conversation messages.
- Delete requires ownership of user-prefixed object path.
- File extension and size constraints are enforced by policy and app-side checks.

## 7) Grants

Core patterns from migrations:

- `anon`:
  - select public reviews
  - execute invite-check and public-enrollment RPCs
- `authenticated`:
  - CRUD grants on portal tables (still constrained by RLS)
  - execute messaging/account RPCs

## 8) Operational Notes

- Migrations are written to be largely idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` patterns).
- Conversation unread behavior depends on `last_read_at`; migration `003` backfills historical memberships.
- Enrollment notification recipient defaults to a fallback email but supports override through DB setting:
  - `app.lbmaa_faculty_notification_email`
