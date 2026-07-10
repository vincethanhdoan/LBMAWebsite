-- Function EXECUTE grant hardening: remove implicit PUBLIC execute, grant per caller category.
-- Defense-in-depth: internal is_admin() checks remain the primary gate for authenticated callers.

-- Category A: anon-facing RPCs (contact form, login gate, booking-token links)
revoke execute on function public.check_email_has_account(text) from public;
grant execute on function public.check_email_has_account(text) to anon, authenticated, service_role;
revoke execute on function public.get_available_slots(date) from public;
grant execute on function public.get_available_slots(date) to anon, authenticated, service_role;
revoke execute on function public.get_lead_by_token(uuid) from public;
grant execute on function public.get_lead_by_token(uuid) to anon, authenticated, service_role;
revoke execute on function public.get_program_booking_by_token(uuid) from public;
grant execute on function public.get_program_booking_by_token(uuid) to anon, authenticated, service_role;
revoke execute on function public.get_upcoming_bookable_dates(uuid, integer) from public;
grant execute on function public.get_upcoming_bookable_dates(uuid, integer) to anon, authenticated, service_role;
revoke execute on function public.submit_enrollment_lead(text, text, text, text, text, jsonb) from public;
grant execute on function public.submit_enrollment_lead(text, text, text, text, text, jsonb) to anon, authenticated, service_role;

-- Category B: authenticated-only RPCs (family/admin portals; internal checks gate admin actions)
revoke execute on function public.add_blocked_dates(date, date, text) from public, anon;
grant execute on function public.add_blocked_dates(date, date, text) to authenticated, service_role;
revoke execute on function public.create_enrollment_lead(text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_enrollment_lead(text, text, text, text, jsonb) to authenticated, service_role;
revoke execute on function public.create_or_get_dm_conversation(uuid) from public, anon;
grant execute on function public.create_or_get_dm_conversation(uuid) to authenticated, service_role;
revoke execute on function public.deactivate_admin(uuid) from public, anon;
grant execute on function public.deactivate_admin(uuid) to authenticated, service_role;
revoke execute on function public.delete_admin_notification_setting(uuid) from public, anon;
grant execute on function public.delete_admin_notification_setting(uuid) to authenticated, service_role;
revoke execute on function public.delete_appointment_slot(uuid) from public, anon;
grant execute on function public.delete_appointment_slot(uuid) to authenticated, service_role;
revoke execute on function public.get_admin_emails() from public, anon;
grant execute on function public.get_admin_emails() to authenticated, service_role;
revoke execute on function public.get_admin_notification_settings() from public, anon;
grant execute on function public.get_admin_notification_settings() to authenticated, service_role;
revoke execute on function public.get_total_unread_count() from public, anon;
grant execute on function public.get_total_unread_count() to authenticated, service_role;
revoke execute on function public.join_global_conversation() from public, anon;
grant execute on function public.join_global_conversation() to authenticated, service_role;
revoke execute on function public.reactivate_admin(uuid) from public, anon;
grant execute on function public.reactivate_admin(uuid) to authenticated, service_role;
revoke execute on function public.register_invited_email(text) from public, anon;
grant execute on function public.register_invited_email(text) to authenticated, service_role;
revoke execute on function public.remove_blocked_dates(uuid) from public, anon;
grant execute on function public.remove_blocked_dates(uuid) to authenticated, service_role;
revoke execute on function public.set_admin_owner_status(uuid, boolean) from public, anon;
grant execute on function public.set_admin_owner_status(uuid, boolean) to authenticated, service_role;
revoke execute on function public.set_primary_guardian(uuid) from public, anon;
grant execute on function public.set_primary_guardian(uuid) to authenticated, service_role;
revoke execute on function public.upsert_admin_notification_setting(text, boolean) from public, anon;
grant execute on function public.upsert_admin_notification_setting(text, boolean) to authenticated, service_role;
revoke execute on function public.upsert_appointment_slot(uuid, integer, time, time, text, integer, text) from public, anon;
grant execute on function public.upsert_appointment_slot(uuid, integer, time, time, text, integer, text) to authenticated, service_role;

-- Category C: security helpers. anon keeps EXECUTE on the four RLS helpers because
-- policies with roles={public} evaluate them as the querying role; service_role needs
-- is_admin/is_owner for edge function auth checks.
revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;
revoke execute on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to anon, authenticated, service_role;
revoke execute on function public.is_family_to_staff_pair(uuid, uuid) from public;
grant execute on function public.is_family_to_staff_pair(uuid, uuid) to anon, authenticated, service_role;
revoke execute on function public.is_valid_dm_conversation(uuid) from public;
grant execute on function public.is_valid_dm_conversation(uuid) to anon, authenticated, service_role;
revoke execute on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_owner(uuid) to authenticated, service_role;

-- Category D: trigger functions. Fired by triggers only; Postgres does not check
-- caller EXECUTE at fire time, and PostgREST never exposes trigger-returning functions.
revoke execute on function public.enrollment_lead_notification_notify() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_deleted() from public, anon, authenticated;
revoke execute on function public.notify_announcement_comment() from public, anon, authenticated;
revoke execute on function public.notify_blog_comment() from public, anon, authenticated;
revoke execute on function public.notify_new_announcement() from public, anon, authenticated;
revoke execute on function public.notify_new_blog_post() from public, anon, authenticated;
revoke execute on function public.portal_email_queue_notify() from public, anon, authenticated;
revoke execute on function public.trigger_new_enrollment_lead_notification() from public, anon, authenticated;
revoke execute on function public.update_conversation_updated_at() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;

-- Future functions created by postgres in schema public are no longer PUBLIC-executable.
-- New RPCs must ship an explicit GRANT EXECUTE to the roles that call them.
alter default privileges for role postgres in schema public revoke execute on functions from public;
