> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# Supabase Guide

## Purpose

This folder contains SQL migrations that define schema, RLS policies, helper functions, and RPC endpoints for LBMAA.

## Migration Order

Apply in filename order:

1. `001_initial_schema.sql`
2. `002_public_enrollment_leads.sql`
3. `003_conversation_member_read_state.sql`
4. `004_profiles_admin_visibility_for_messaging.sql`
5. `005_create_or_get_dm_conversation_rpc.sql`

## What Is Defined Here

- Core application tables (profiles, families, students, communications, messaging, reviews)
- Security-definer helper functions for policy checks
- Invite-only login and enrollment submission RPCs
- Row-level security policies and grants
- Storage policy rules for message attachments

## Important Behavior Contracts

- Invite-only login relies on `registered_emails` and `check_email_has_account`.
- DM creation and message visibility are constrained by role-safe rules.
- Public contact form writes through `submit_enrollment_lead` RPC.
- Read-state in messaging relies on `conversation_members.last_read_at`.

## Configuration Notes

- Storage bucket expected by app: `message-attachments`
- Optional DB setting for enrollment notifications:
  - `app.lbmaa_faculty_notification_email`
