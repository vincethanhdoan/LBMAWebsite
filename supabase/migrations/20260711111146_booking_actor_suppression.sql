-- notify admins about lead actions without notifying the actor

ALTER TABLE enrollment_lead_program_bookings ADD COLUMN IF NOT EXISTS updated_by uuid;

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

CREATE OR REPLACE FUNCTION notify_admins_new_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_notifications (recipient_user_id, type, reference_id, reference_type, actor_display_name)
  SELECT p.user_id, 'new_lead', NEW.lead_id, 'enrollment_lead', NEW.parent_name
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'admin' AND p.is_active
    AND p.user_id IS DISTINCT FROM auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_notification_settings s
      WHERE s.is_active AND s.notify_new_leads AND lower(s.email) = lower(u.email)
    );
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION notify_admins_booking_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_admins_new_lead() FROM PUBLIC, anon, authenticated;
