-- 048: fold program_type into upsert_appointment_slot
-- The slot upsert previously ignored program_type, forcing the client to follow
-- the RPC with a separate UPDATE. That second write could fail silently and
-- leave a slot with the wrong audience. This makes the upsert atomic: one RPC
-- writes every column, including program_type, under the existing admin guard.

-- Drop the 6-param signature before adding the 7-param replacement so the two
-- do not coexist as an ambiguous overload.
DROP FUNCTION IF EXISTS public.upsert_appointment_slot(UUID, INTEGER, TIME, TIME, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.upsert_appointment_slot(
  p_slot_id       UUID    DEFAULT NULL,
  p_day_of_week   INTEGER DEFAULT NULL,
  p_start_time    TIME    DEFAULT NULL,
  p_end_time      TIME    DEFAULT NULL,
  p_label         TEXT    DEFAULT NULL,
  p_week_of_month INTEGER DEFAULT NULL,
  p_program_type  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF p_program_type IS NOT NULL AND p_program_type NOT IN ('little_dragons', 'youth', 'all') THEN
    RAISE EXCEPTION 'program_type must be one of little_dragons, youth, or all';
  END IF;

  IF p_slot_id IS NOT NULL THEN
    UPDATE appointment_slots SET
      day_of_week   = COALESCE(p_day_of_week,  day_of_week),
      start_time    = COALESCE(p_start_time,   start_time),
      end_time      = COALESCE(p_end_time,     end_time),
      label         = COALESCE(p_label,        label),
      week_of_month = p_week_of_month,          -- no COALESCE: allows explicit reset to NULL
      program_type  = COALESCE(p_program_type, program_type)
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_end_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, end_time, and label are required when creating a new slot';
    END IF;
    INSERT INTO appointment_slots (day_of_week, start_time, end_time, label, week_of_month, program_type)
    VALUES (p_day_of_week, p_start_time, p_end_time, p_label, p_week_of_month, COALESCE(p_program_type, 'all'))
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(UUID, INTEGER, TIME, TIME, TEXT, INTEGER, TEXT) TO authenticated;
