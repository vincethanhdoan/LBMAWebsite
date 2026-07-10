-- Grant service_role access to tables read/written by the send-email edge function.
-- The service_role has BYPASSRLS but still requires table-level grants.

GRANT SELECT ON public.enrollment_leads TO service_role;
GRANT SELECT, UPDATE ON public.enrollment_lead_notifications TO service_role;
GRANT SELECT ON public.conversation_members TO service_role;
GRANT SELECT ON public.profiles TO service_role;
