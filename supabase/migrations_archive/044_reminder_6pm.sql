-- Move appointment-reminders cron to 6pm Pacific, DST-safe.
--
-- pg_cron fires on a fixed UTC schedule, so a single UTC hour drifts across
-- daylight saving. Instead we run at both UTC hours that can correspond to 6pm
-- Pacific (01:00 UTC during PDT, 02:00 UTC during PST) and gate the actual send
-- on the Pacific wall-clock hour being 18. Exactly one of the two daily runs
-- passes the guard year-round.
--
-- The "2 days before" window is also computed against the Pacific date, not
-- CURRENT_DATE (UTC): at 6pm Pacific the UTC clock has already rolled to the
-- next day, so UTC's date would be off by one.

DO $$ BEGIN
  PERFORM cron.unschedule('appointment-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'appointment-reminders',
  '0 1,2 * * *',
  $$
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, 'email', 'reminder', 'queued'
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'America/Los_Angeles')) = 18
    AND el.status IN ('appointment_scheduled', 'appointment_confirmed')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.appointment_date IS NOT NULL
    ) = ((now() AT TIME ZONE 'America/Los_Angeles')::date + INTERVAL '2 days')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = 'reminder'
    );
  $$
);
