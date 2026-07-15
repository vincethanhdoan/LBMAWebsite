-- Remove the dead on-new-enrollment-lead notification path.
-- The AFTER INSERT trigger on enrollment_leads POSTed to the on-new-enrollment-lead
-- edge function using app.supabase_url / app.supabase_anon_key GUCs, which are unset
-- in every environment (inert since the 2026-07-10 baseline). The live admin-notification
-- flow is enrollment_lead_notifications -> enrollment_lead_notification_notify -> send-email.
-- Drop the trigger and its function; the on-new-enrollment-lead edge function is deleted
-- out-of-band (it exists only on production).

DROP TRIGGER IF EXISTS on_new_enrollment_lead_trigger ON public.enrollment_leads;
DROP FUNCTION IF EXISTS public.trigger_new_enrollment_lead_notification();
