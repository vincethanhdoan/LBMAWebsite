-- allow admins to book same-day appointments; families still can't see today

DROP FUNCTION IF EXISTS public.get_upcoming_bookable_dates(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(
  p_slot_id uuid,
  p_weeks_ahead integer DEFAULT 20,
  p_include_today boolean DEFAULT false
)
RETURNS TABLE(available_date date)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot       appointment_slots%ROWTYPE;
  v_check_date DATE;
  v_end_date   DATE := CURRENT_DATE + (p_weeks_ahead * 7);
BEGIN
  -- Same-day availability is admin-only; strip the flag for anyone else so
  -- an anon or family caller can never surface today by passing it.
  IF p_include_today AND NOT public.is_admin(auth.uid()) THEN
    p_include_today := false;
  END IF;

  SELECT * INTO v_slot FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  v_check_date := CASE WHEN p_include_today THEN CURRENT_DATE ELSE CURRENT_DATE + 1 END;

  WHILE v_check_date <= v_end_date LOOP
    -- Drop today once the slot's start time has already passed in Pacific time.
    IF v_check_date = CURRENT_DATE
       AND (now() AT TIME ZONE 'America/Los_Angeles')::time >= v_slot.start_time THEN
      v_check_date := v_check_date + 1;
      CONTINUE;
    END IF;

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
$function$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(uuid, integer, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(uuid, integer, boolean) TO authenticated;
