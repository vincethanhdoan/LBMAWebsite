-- review fixes: Pacific-anchored bookable dates; reschedule vs rebook-after-cancel

-- 1. get_upcoming_bookable_dates anchored to Pacific "today" instead of the UTC
--    date, so evenings (when UTC has already rolled to the next day) compute the
--    window and the today-gate against the correct Pacific date.
DROP FUNCTION IF EXISTS public.get_upcoming_bookable_dates(uuid, integer, boolean);

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
  v_today      DATE := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  v_check_date DATE;
  v_end_date   DATE;
BEGIN
  -- Same-day availability is admin-only; strip the flag for anyone else so
  -- an anon or family caller can never surface today by passing it.
  IF p_include_today AND NOT public.is_admin(auth.uid()) THEN
    p_include_today := false;
  END IF;

  SELECT * INTO v_slot FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  v_check_date := CASE WHEN p_include_today THEN v_today ELSE v_today + 1 END;
  v_end_date   := v_today + (p_weeks_ahead * 7);

  WHILE v_check_date <= v_end_date LOOP
    -- Drop today once the slot's start time has already passed in Pacific time.
    IF v_check_date = v_today
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

-- 2. notify_admins_booking_change: a cancelled booking keeps its date, so
--    re-booking a new date after cancelling must read as a new booking, not a
--    reschedule. The reschedule branch now also requires the OLD row to have
--    been an active (scheduled/confirmed) visit.
CREATE OR REPLACE FUNCTION notify_admins_booking_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_name text;
  v_type text;
BEGIN
  -- Nothing meaningful changed.
  IF NEW.status = OLD.status
     AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
     AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('scheduled', 'confirmed')
     AND OLD.appointment_date IS NOT NULL
     AND (NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
          OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time)
     AND NEW.status IN ('scheduled', 'confirmed') THEN
    -- A moved visit reads as a reschedule even when it crosses the
    -- auto-confirm boundary and lands as confirmed.
    v_type := 'appointment_rescheduled';
  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('scheduled', 'confirmed') THEN
    v_type := 'appointment_cancelled';
  ELSIF NEW.status = 'scheduled' AND OLD.status IS DISTINCT FROM 'scheduled' THEN
    v_type := 'appointment_booked';
  ELSIF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    v_type := 'appointment_confirmed';
  ELSE
    RETURN NEW;
  END IF;

  SELECT parent_name INTO v_parent_name FROM enrollment_leads WHERE lead_id = NEW.lead_id;

  INSERT INTO user_notifications (recipient_user_id, type, reference_id, reference_type, actor_display_name)
  SELECT p.user_id, v_type, NEW.lead_id, 'enrollment_lead', v_parent_name
  FROM profiles p
  WHERE p.role = 'admin' AND p.is_active
    AND p.user_id IS DISTINCT FROM NEW.updated_by
    AND NOT EXISTS (
      SELECT 1 FROM user_notifications n
      WHERE n.recipient_user_id = p.user_id AND n.type = v_type
        AND n.reference_id = NEW.lead_id AND n.is_read = false
    );
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION notify_admins_booking_change() FROM PUBLIC, anon, authenticated;
