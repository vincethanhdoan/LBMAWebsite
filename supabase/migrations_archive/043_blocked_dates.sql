-- 043: replace per-slot appointment_slot_overrides with day-level blocked_dates.
-- A block applies to all slots. A single blocked day has start_date = end_date.
-- Blocks prevent new bookings only; existing appointments are untouched.

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  block_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage blocked dates" ON public.blocked_dates;
CREATE POLICY "Admins can manage blocked dates"
  ON public.blocked_dates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Public read for booking page availability checks
DROP POLICY IF EXISTS "Public can view blocked dates" ON public.blocked_dates;
CREATE POLICY "Public can view blocked dates"
  ON public.blocked_dates FOR SELECT
  USING (true);

GRANT SELECT ON public.blocked_dates TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;

-- Migrate existing per-slot overrides: distinct dates collapse into single-day blocks.
INSERT INTO public.blocked_dates (start_date, end_date, reason)
SELECT DISTINCT ON (override_date) override_date, override_date, reason
FROM public.appointment_slot_overrides
ORDER BY override_date;

DROP FUNCTION IF EXISTS public.add_slot_override(UUID, DATE, TEXT);
DROP FUNCTION IF EXISTS public.remove_slot_override(UUID);
DROP TABLE public.appointment_slot_overrides;

-- ─── admin RPCs ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_blocked_dates(
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
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

  INSERT INTO blocked_dates (start_date, end_date, reason)
  VALUES (p_start_date, COALESCE(p_end_date, p_start_date), p_reason)
  RETURNING block_id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_blocked_dates(DATE, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_blocked_dates(p_block_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM blocked_dates WHERE block_id = p_block_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_blocked_dates(UUID) TO authenticated;

-- ─── get_available_slots ─────────────────────────────────────────────────────
-- Same as the live (023) version except the block check is day-level.

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
      SELECT 1 FROM blocked_dates b
      WHERE target_date BETWEEN b.start_date AND b.end_date
    )
  ORDER BY s.start_time;
$$;

-- ─── get_upcoming_bookable_dates ─────────────────────────────────────────────
-- Same as the live (007_multi_child) version — INCLUDING the already-booked
-- exclusion — except the block check is day-level.

CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(
  p_slot_id    UUID,
  p_weeks_ahead INT DEFAULT 20
)
RETURNS TABLE(available_date DATE)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slot       appointment_slots%ROWTYPE;
  v_check_date DATE := CURRENT_DATE + 1;
  v_end_date   DATE := CURRENT_DATE + (p_weeks_ahead * 7);
BEGIN
  SELECT * INTO v_slot FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  WHILE v_check_date <= v_end_date LOOP
    IF EXTRACT(DOW FROM v_check_date)::INTEGER = v_slot.day_of_week THEN
      IF (
        v_slot.week_of_month IS NULL
        OR (v_slot.week_of_month = -1
            AND DATE_TRUNC('month', v_check_date + 7) <> DATE_TRUNC('month', v_check_date))
        OR (v_slot.week_of_month BETWEEN 1 AND 4
            AND CEIL(EXTRACT(DAY FROM v_check_date) / 7.0)::INTEGER = v_slot.week_of_month)
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM blocked_dates b
          WHERE v_check_date BETWEEN b.start_date AND b.end_date
        )
        AND NOT EXISTS (
          SELECT 1 FROM enrollment_lead_program_bookings pb
          WHERE pb.appointment_slot_id = p_slot_id
            AND pb.appointment_date = v_check_date
            AND pb.status IN ('scheduled','confirmed')
        )
        THEN
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
