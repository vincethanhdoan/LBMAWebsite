-- Replace dashboard-configured webhook with a SQL trigger.
-- The dashboard webhook sends a custom hex secret that can't reliably be
-- matched via WEBHOOK_SECRET env var. This uses net.http_post with the
-- anon key directly, matching the pattern from 021_portal_email_queue_trigger.

DROP TRIGGER IF EXISTS "send-enrollment-notification" ON public.enrollment_lead_notifications;

CREATE OR REPLACE FUNCTION public.enrollment_lead_notification_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://qfyeguikxxwwxpxleqrr.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeWVndWlreHh3d3hweGxlcXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NTA3NDcsImV4cCI6MjA4NDUyNjc0N30.aiivbIi5R-2aRouB9d2_Lgje82e8yl0iQTUUF2iZmhs'
    ),
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     to_jsonb(NEW),
      'old_record', NULL
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrollment_lead_notification_notify_trigger ON public.enrollment_lead_notifications;
CREATE TRIGGER enrollment_lead_notification_notify_trigger
  AFTER INSERT ON public.enrollment_lead_notifications
  FOR EACH ROW EXECUTE FUNCTION public.enrollment_lead_notification_notify();
