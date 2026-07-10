-- supabase/migrations/022_notification_table_grants.sql
-- Migration 020 created these tables without GRANT statements, causing 403s.

GRANT SELECT, INSERT, UPDATE ON public.user_section_last_seen TO authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_notification_preferences TO authenticated;
