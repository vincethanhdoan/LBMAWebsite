-- supabase/migrations/021_portal_email_queue_trigger.sql
--
-- Replaces the manual dashboard webhook with a SQL trigger using pg_net.
-- Fires the send-email edge function whenever a row is inserted into
-- portal_email_queue.

CREATE OR REPLACE FUNCTION portal_email_queue_notify()
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

DROP TRIGGER IF EXISTS portal_email_queue_notify_trigger ON portal_email_queue;
CREATE TRIGGER portal_email_queue_notify_trigger
  AFTER INSERT ON portal_email_queue
  FOR EACH ROW EXECUTE FUNCTION portal_email_queue_notify();
