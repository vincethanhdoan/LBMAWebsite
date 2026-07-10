-- Fix appointment-reminders cron: changed from 8am UTC (~1am Pacific) to 4pm Pacific.
-- 0 23 * * * = 4pm PDT (summer) / 3pm PST (winter).

DO $$ BEGIN
  PERFORM cron.unschedule('appointment-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'appointment-reminders',
  '0 23 * * *',
  $$
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, 'email', 'reminder', 'queued'
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND el.status IN ('appointment_scheduled', 'appointment_confirmed')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.appointment_date IS NOT NULL
    ) = (CURRENT_DATE + INTERVAL '2 days')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = 'reminder'
    );
  $$
);
