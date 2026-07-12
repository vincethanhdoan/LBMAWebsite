-- Appointment slots no longer carry a length. These are tour bookings: families
-- pick a start time only, and duration_minutes/end_time were never read anywhere
-- outside the admin config screen (verified: no triggers, views, generated columns,
-- or other routines reference them; get_upcoming_bookable_dates uses only
-- day_of_week/week_of_month; the book-appointment edge function selects explicit
-- columns). This drops the dead columns and removes the duration parameter from the
-- upsert RPC. The duration CHECK constraint is dropped automatically with the column.

-- The signature changes (a parameter is removed), so DROP + CREATE, not REPLACE.
DROP FUNCTION IF EXISTS public.upsert_appointment_slot(
  uuid, integer, time without time zone, integer, text, integer, text
);

CREATE FUNCTION public.upsert_appointment_slot(
  p_slot_id       uuid    DEFAULT NULL,
  p_day_of_week   integer DEFAULT NULL,
  p_start_time    time    DEFAULT NULL,
  p_label         text    DEFAULT NULL,
  p_week_of_month integer DEFAULT NULL,
  p_program_type  text    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_program_type IS NOT NULL
     AND p_program_type NOT IN ('little_dragons','youth','all') THEN
    RAISE EXCEPTION 'program_type must be one of little_dragons, youth, or all';
  END IF;

  IF p_slot_id IS NOT NULL THEN
    UPDATE appointment_slots SET
      day_of_week   = COALESCE(p_day_of_week, day_of_week),
      start_time    = COALESCE(p_start_time, start_time),
      label         = COALESCE(p_label, label),
      week_of_month = p_week_of_month,
      program_type  = COALESCE(p_program_type, program_type)
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, and label are required when creating a new slot';
    END IF;
    INSERT INTO appointment_slots (day_of_week, start_time, label, week_of_month, program_type)
    VALUES (p_day_of_week, p_start_time, p_label, p_week_of_month, COALESCE(p_program_type,'all'))
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END $$;

-- PUBLIC execute is revoked globally, so grant the api role explicitly (matches the
-- prior grants: owner postgres + authenticated).
GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(
  uuid, integer, time, text, integer, text
) TO authenticated;

ALTER TABLE public.appointment_slots DROP COLUMN IF EXISTS end_time;
ALTER TABLE public.appointment_slots DROP COLUMN IF EXISTS duration_minutes;
