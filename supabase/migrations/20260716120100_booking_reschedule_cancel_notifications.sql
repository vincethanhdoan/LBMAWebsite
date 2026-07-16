-- notify admins on reschedule and cancel; fire the trigger on date/time changes too

ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
  CHECK (type = ANY (ARRAY[
    'comment_reply'::text,
    'post_comment'::text,
    'new_lead'::text,
    'appointment_booked'::text,
    'appointment_confirmed'::text,
    'appointment_rescheduled'::text,
    'appointment_cancelled'::text
  ]));

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

  IF OLD.appointment_date IS NOT NULL
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

DROP TRIGGER IF EXISTS trg_notify_admins_booking_change ON enrollment_lead_program_bookings;
CREATE TRIGGER trg_notify_admins_booking_change
  AFTER UPDATE OF status, appointment_date, appointment_time ON enrollment_lead_program_bookings
  FOR EACH ROW EXECUTE FUNCTION notify_admins_booking_change();
