-- admin portal overhaul: functions and triggers

-- 1. double-booking guard: one active booking per slot+date across different leads.
-- Same lead may hold both program bookings on one slot+date (siblings, one visit).
CREATE OR REPLACE FUNCTION prevent_slot_double_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('scheduled', 'confirmed')
     AND NEW.appointment_slot_id IS NOT NULL
     AND NEW.appointment_date IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.appointment_slot_id::text || NEW.appointment_date::text, 0));
    IF EXISTS (
      SELECT 1 FROM enrollment_lead_program_bookings b
      WHERE b.appointment_slot_id = NEW.appointment_slot_id
        AND b.appointment_date = NEW.appointment_date
        AND b.status IN ('scheduled', 'confirmed')
        AND b.lead_id <> NEW.lead_id
        AND b.booking_id <> NEW.booking_id
    ) THEN
      RAISE EXCEPTION 'slot_taken' USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_slot_double_booking ON enrollment_lead_program_bookings;
CREATE TRIGGER trg_prevent_slot_double_booking
  BEFORE INSERT OR UPDATE ON enrollment_lead_program_bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_slot_double_booking();

-- 2. slot upsert takes duration; computes end_time; rejects midnight crossing
DROP FUNCTION IF EXISTS public.upsert_appointment_slot(uuid, integer, time without time zone, time without time zone, text, integer, text);

CREATE OR REPLACE FUNCTION public.upsert_appointment_slot(
  p_slot_id uuid DEFAULT NULL,
  p_day_of_week integer DEFAULT NULL,
  p_start_time time without time zone DEFAULT NULL,
  p_duration_minutes integer DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_week_of_month integer DEFAULT NULL,
  p_program_type text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_start time;
  v_duration integer;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_program_type IS NOT NULL AND p_program_type NOT IN ('little_dragons', 'youth', 'all') THEN
    RAISE EXCEPTION 'program_type must be one of little_dragons, youth, or all';
  END IF;
  IF p_duration_minutes IS NOT NULL AND (p_duration_minutes < 15 OR p_duration_minutes > 240 OR p_duration_minutes % 15 <> 0) THEN
    RAISE EXCEPTION 'duration_minutes must be a multiple of 15 between 15 and 240';
  END IF;

  IF p_slot_id IS NOT NULL THEN
    SELECT COALESCE(p_start_time, start_time), COALESCE(p_duration_minutes, duration_minutes)
      INTO v_start, v_duration
    FROM appointment_slots WHERE slot_id = p_slot_id;
    IF v_start IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, and label are required when creating a new slot';
    END IF;
    v_start := p_start_time;
    v_duration := COALESCE(p_duration_minutes, 60);
  END IF;

  IF v_start > time '24:00' - make_interval(mins => v_duration) THEN
    RAISE EXCEPTION 'slot cannot cross midnight';
  END IF;

  IF p_slot_id IS NOT NULL THEN
    UPDATE appointment_slots SET
      day_of_week      = COALESCE(p_day_of_week, day_of_week),
      start_time       = v_start,
      duration_minutes = v_duration,
      end_time         = v_start + make_interval(mins => v_duration),
      label            = COALESCE(p_label, label),
      week_of_month    = p_week_of_month,
      program_type     = COALESCE(p_program_type, program_type)
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
  ELSE
    INSERT INTO appointment_slots (day_of_week, start_time, end_time, duration_minutes, label, week_of_month, program_type)
    VALUES (p_day_of_week, v_start, v_start + make_interval(mins => v_duration), v_duration, p_label, p_week_of_month, COALESCE(p_program_type, 'all'))
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(uuid, integer, time without time zone, integer, text, integer, text) TO authenticated;

-- 3. close/deny with booking cascade
CREATE OR REPLACE FUNCTION public.close_enrollment_lead(
  p_lead_id uuid,
  p_new_status text,
  p_denial_message text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_admin(auth.uid()) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_new_status NOT IN ('denied', 'closed') THEN
    RAISE EXCEPTION 'status must be denied or closed';
  END IF;

  UPDATE enrollment_leads SET
    status = p_new_status,
    denied_at = CASE WHEN p_new_status = 'denied' THEN now() ELSE denied_at END,
    denial_message = CASE WHEN p_new_status = 'denied' THEN COALESCE(p_denial_message, denial_message) ELSE denial_message END
  WHERE lead_id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  UPDATE enrollment_lead_program_bookings SET status = 'cancelled'
  WHERE lead_id = p_lead_id AND status IN ('pending', 'link_sent', 'scheduled', 'confirmed');
END $$;

GRANT EXECUTE ON FUNCTION public.close_enrollment_lead(uuid, text, text) TO authenticated;

-- 4. in-app admin notifications for lead events
CREATE OR REPLACE FUNCTION notify_admins_new_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_notifications (recipient_user_id, type, reference_id, reference_type, actor_display_name)
  SELECT p.user_id, 'new_lead', NEW.lead_id, 'enrollment_lead', NEW.parent_name
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'admin' AND p.is_active
    AND EXISTS (
      SELECT 1 FROM admin_notification_settings s
      WHERE s.is_active AND s.notify_new_leads AND lower(s.email) = lower(u.email)
    );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_lead ON enrollment_leads;
CREATE TRIGGER trg_notify_admins_new_lead
  AFTER INSERT ON enrollment_leads
  FOR EACH ROW EXECUTE FUNCTION notify_admins_new_lead();

CREATE OR REPLACE FUNCTION notify_admins_booking_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_parent_name text;
  v_type text;
BEGIN
  IF NEW.status NOT IN ('scheduled', 'confirmed') OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  v_type := CASE NEW.status WHEN 'scheduled' THEN 'appointment_booked' ELSE 'appointment_confirmed' END;
  SELECT parent_name INTO v_parent_name FROM enrollment_leads WHERE lead_id = NEW.lead_id;

  -- skip recipients who already have an unread notification of this type for this lead
  INSERT INTO user_notifications (recipient_user_id, type, reference_id, reference_type, actor_display_name)
  SELECT p.user_id, v_type, NEW.lead_id, 'enrollment_lead', v_parent_name
  FROM profiles p
  WHERE p.role = 'admin' AND p.is_active
    AND NOT EXISTS (
      SELECT 1 FROM user_notifications n
      WHERE n.recipient_user_id = p.user_id AND n.type = v_type
        AND n.reference_id = NEW.lead_id AND n.is_read = false
    );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_booking_change ON enrollment_lead_program_bookings;
CREATE TRIGGER trg_notify_admins_booking_change
  AFTER UPDATE OF status ON enrollment_lead_program_bookings
  FOR EACH ROW EXECUTE FUNCTION notify_admins_booking_change();
