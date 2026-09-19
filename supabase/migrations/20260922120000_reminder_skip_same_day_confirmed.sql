-- A web lead that books today for a visit two days out is already
-- appointment_confirmed and just received its receipt in the same breath.
-- Reminding that family the same day to "confirm" a visit that was never
-- left unconfirmed is noise, not a nudge. A lead created today whose visit
-- is still merely scheduled (an admin booked it, or the receipt hasn't been
-- read as a confirmation) still gets the reminder, as does any lead from an
-- earlier day.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='appointment-reminders') THEN
    PERFORM cron.unschedule('appointment-reminders');
  END IF;
  PERFORM cron.schedule('appointment-reminders', '0 1,2 * * *', '
  SELECT queue_family_notification(el.lead_id, ''reminder'')
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
    )
    AND NOT (
      (el.created_at AT TIME ZONE ''America/Los_Angeles'')::date
        = (now() AT TIME ZONE ''America/Los_Angeles'')::date
      AND NOT EXISTS (
        SELECT 1 FROM enrollment_lead_program_bookings elpb2
        WHERE elpb2.lead_id = el.lead_id
          AND elpb2.status = ''scheduled''
      )
    );
  ');
END $$;
