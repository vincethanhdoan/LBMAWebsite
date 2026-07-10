-- 023: add week_of_month to appointment_slots
-- Allows slots to fire on specific occurrences: 1st, 2nd, 3rd, 4th, or last weekday of the month.
-- NULL means "every occurrence" (existing behaviour preserved).

ALTER TABLE public.appointment_slots
  ADD COLUMN IF NOT EXISTS week_of_month INTEGER
  CHECK (week_of_month IN (-1, 1, 2, 3, 4));
-- -1 = last, 1–4 = nth occurrence, NULL = every week

-- ─── get_available_slots ────────────────────────────────────────────────────
-- Update to respect week_of_month when checking if a slot applies to a date.

CREATE OR REPLACE FUNCTION public.get_available_slots(target_date DATE)
RETURNS SETOF public.appointment_slots
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM appointment_slots s
  WHERE s.is_active = true
    AND EXTRACT(DOW FROM target_date)::INTEGER = s.day_of_week
    AND (
      s.week_of_month IS NULL
      OR (s.week_of_month = -1
          AND DATE_TRUNC('month', target_date + 7) <> DATE_TRUNC('month', target_date))
      OR (s.week_of_month BETWEEN 1 AND 4
          AND CEIL(EXTRACT(DAY FROM target_date) / 7.0)::INTEGER = s.week_of_month)
    )
    AND NOT EXISTS (
      SELECT 1 FROM appointment_slot_overrides o
      WHERE o.slot_id = s.slot_id AND o.override_date = target_date
    )
  ORDER BY s.start_time;
$$;

-- ─── get_upcoming_bookable_dates ─────────────────────────────────────────────
-- Updated to respect week_of_month. Default look-ahead raised to 20 weeks so
-- monthly-cadence slots return enough upcoming dates.

CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(
  p_slot_id UUID,
  p_weeks_ahead INT DEFAULT 20
)
RETURNS TABLE(available_date DATE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot appointment_slots%ROWTYPE;
  v_check_date DATE := CURRENT_DATE + 1;
  v_end_date   DATE := CURRENT_DATE + (p_weeks_ahead * 7);
BEGIN
  SELECT * INTO v_slot
  FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;

  IF NOT FOUND THEN RETURN; END IF;

  WHILE v_check_date <= v_end_date LOOP
    IF EXTRACT(DOW FROM v_check_date)::INTEGER = v_slot.day_of_week THEN
      -- week_of_month filter
      IF (
        v_slot.week_of_month IS NULL
        OR (v_slot.week_of_month = -1
            AND DATE_TRUNC('month', v_check_date + 7) <> DATE_TRUNC('month', v_check_date))
        OR (v_slot.week_of_month BETWEEN 1 AND 4
            AND CEIL(EXTRACT(DAY FROM v_check_date) / 7.0)::INTEGER = v_slot.week_of_month)
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM appointment_slot_overrides o
          WHERE o.slot_id = p_slot_id AND o.override_date = v_check_date
        ) THEN
          available_date := v_check_date;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
    v_check_date := v_check_date + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(UUID, INT) TO anon, authenticated;

-- ─── upsert_appointment_slot ─────────────────────────────────────────────────
-- Drop old 5-param signature before adding the 6-param replacement.

DROP FUNCTION IF EXISTS public.upsert_appointment_slot(UUID, INTEGER, TIME, TIME, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_appointment_slot(
  p_slot_id      UUID    DEFAULT NULL,
  p_day_of_week  INTEGER DEFAULT NULL,
  p_start_time   TIME    DEFAULT NULL,
  p_end_time     TIME    DEFAULT NULL,
  p_label        TEXT    DEFAULT NULL,
  p_week_of_month INTEGER DEFAULT NULL
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

  IF p_slot_id IS NOT NULL THEN
    UPDATE appointment_slots SET
      day_of_week   = COALESCE(p_day_of_week,  day_of_week),
      start_time    = COALESCE(p_start_time,   start_time),
      end_time      = COALESCE(p_end_time,     end_time),
      label         = COALESCE(p_label,        label),
      week_of_month = p_week_of_month           -- no COALESCE: allows explicit reset to NULL
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_end_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, end_time, and label are required when creating a new slot';
    END IF;
    INSERT INTO appointment_slots (day_of_week, start_time, end_time, label, week_of_month)
    VALUES (p_day_of_week, p_start_time, p_end_time, p_label, p_week_of_month)
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(UUID, INTEGER, TIME, TIME, TEXT, INTEGER) TO authenticated;
