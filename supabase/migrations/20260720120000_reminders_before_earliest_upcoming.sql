-- send the confirmation email once, two days before the earliest upcoming
-- appointment, instead of two days before every booking

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='appointment-reminders') THEN
    PERFORM cron.unschedule('appointment-reminders');
  END IF;
  PERFORM cron.schedule('appointment-reminders', '0 1,2 * * *', '
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, ''email'', ''reminder'', ''queued''
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND EXTRACT(HOUR FROM (now() AT TIME ZONE ''America/Los_Angeles'')) = 18
    AND el.status IN (''appointment_scheduled'', ''appointment_confirmed'')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.status IN (''scheduled'', ''confirmed'')
        AND elpb.appointment_date >= (now() AT TIME ZONE ''America/Los_Angeles'')::date
    ) = ((now() AT TIME ZONE ''America/Los_Angeles'')::date + INTERVAL ''2 days'')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = ''reminder''
        AND (eln.created_at AT TIME ZONE ''America/Los_Angeles'')::date = (now() AT TIME ZONE ''America/Los_Angeles'')::date
    );
  ');
END $$;
