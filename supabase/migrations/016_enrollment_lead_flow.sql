-- 016_enrollment_lead_flow.sql
-- Adds booking/appointment/denial columns to enrollment_leads,
-- new appointment_slots, appointment_slot_overrides, admin_notification_settings tables,
-- type column on enrollment_lead_notifications, and supporting RPCs.

-- ============================================
-- enrollment_leads — new columns
-- ============================================

ALTER TABLE public.enrollment_leads
  ADD COLUMN IF NOT EXISTS booking_token UUID,
  ADD COLUMN IF NOT EXISTS appointment_date DATE,
  ADD COLUMN IF NOT EXISTS appointment_time TIME,
  ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

-- Unique index on booking_token so token lookups are fast and tokens can't collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_leads_booking_token
  ON public.enrollment_leads(booking_token)
  WHERE booking_token IS NOT NULL;

-- Extend status check constraint to include new values
ALTER TABLE public.enrollment_leads
  DROP CONSTRAINT IF EXISTS enrollment_leads_status_check;

ALTER TABLE public.enrollment_leads
  ADD CONSTRAINT enrollment_leads_status_check
  CHECK (status IN ('new', 'approved', 'appointment_scheduled', 'appointment_confirmed', 'denied', 'enrolled', 'closed'));

-- ============================================
-- enrollment_lead_notifications — add type column
-- ============================================

ALTER TABLE public.enrollment_lead_notifications
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'new_lead';

ALTER TABLE public.enrollment_lead_notifications
  DROP CONSTRAINT IF EXISTS enrollment_lead_notifications_type_check;

ALTER TABLE public.enrollment_lead_notifications
  ADD CONSTRAINT enrollment_lead_notifications_type_check
  CHECK (type IN ('new_lead', 'approval', 'denial', 'booking_confirmation', 'reminder'));

-- Extend channel constraint to allow 'sms' for future use
ALTER TABLE public.enrollment_lead_notifications
  DROP CONSTRAINT IF EXISTS enrollment_lead_notifications_channel_check;

ALTER TABLE public.enrollment_lead_notifications
  ADD CONSTRAINT enrollment_lead_notifications_channel_check
  CHECK (channel IN ('email', 'sms'));

-- ============================================
-- appointment_slots
-- ============================================

CREATE TABLE IF NOT EXISTS public.appointment_slots (
  slot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage appointment slots" ON public.appointment_slots;
CREATE POLICY "Admins can manage appointment slots"
  ON public.appointment_slots FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Public read for the booking page (anon token lookup)
DROP POLICY IF EXISTS "Public can view active appointment slots" ON public.appointment_slots;
CREATE POLICY "Public can view active appointment slots"
  ON public.appointment_slots FOR SELECT
  USING (is_active = true);

GRANT SELECT ON public.appointment_slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.appointment_slots TO authenticated;

-- ============================================
-- appointment_slot_overrides
-- ============================================

CREATE TABLE IF NOT EXISTS public.appointment_slot_overrides (
  override_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES public.appointment_slots(slot_id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(slot_id, override_date)
);

ALTER TABLE public.appointment_slot_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage slot overrides" ON public.appointment_slot_overrides;
CREATE POLICY "Admins can manage slot overrides"
  ON public.appointment_slot_overrides FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Public read for booking page availability checks
DROP POLICY IF EXISTS "Public can view slot overrides" ON public.appointment_slot_overrides;
CREATE POLICY "Public can view slot overrides"
  ON public.appointment_slot_overrides FOR SELECT
  USING (true);

GRANT SELECT ON public.appointment_slot_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.appointment_slot_overrides TO authenticated;

-- ============================================
-- admin_notification_settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  notify_new_leads BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage notification settings" ON public.admin_notification_settings;
CREATE POLICY "Admins can manage notification settings"
  ON public.admin_notification_settings FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_settings TO service_role;

-- ============================================
-- service_role grants for new tables
-- ============================================

GRANT SELECT, UPDATE ON public.enrollment_leads TO service_role;
GRANT SELECT, INSERT ON public.enrollment_lead_notifications TO service_role;
GRANT SELECT ON public.appointment_slots TO service_role;
GRANT SELECT ON public.appointment_slot_overrides TO service_role;

-- ============================================
-- RPCs
-- ============================================

-- get_available_slots: returns active slots not blocked by overrides on a given date
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
    AND NOT EXISTS (
      SELECT 1 FROM appointment_slot_overrides o
      WHERE o.slot_id = s.slot_id AND o.override_date = target_date
    )
  ORDER BY s.start_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(DATE) TO anon, authenticated;

-- get_upcoming_bookable_dates: returns next N available dates for a slot
CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(
  p_slot_id UUID,
  p_weeks_ahead INT DEFAULT 8
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
  v_end_date DATE := CURRENT_DATE + (p_weeks_ahead * 7);
BEGIN
  SELECT * INTO v_slot FROM appointment_slots WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  WHILE v_check_date <= v_end_date LOOP
    IF EXTRACT(DOW FROM v_check_date)::INTEGER = v_slot.day_of_week THEN
      IF NOT EXISTS (
        SELECT 1 FROM appointment_slot_overrides o
        WHERE o.slot_id = p_slot_id AND o.override_date = v_check_date
      ) THEN
        available_date := v_check_date;
        RETURN NEXT;
      END IF;
    END IF;
    v_check_date := v_check_date + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(UUID, INT) TO anon, authenticated;

-- create_enrollment_lead: admin manual lead creation
CREATE OR REPLACE FUNCTION public.create_enrollment_lead(
  p_parent_name TEXT,
  p_parent_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_student_name TEXT DEFAULT NULL,
  p_student_age INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.enrollment_leads (
    parent_name, parent_email, phone, student_name, student_age, message, source_page, status
  )
  VALUES (
    trim(p_parent_name),
    lower(trim(p_parent_email)),
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    NULLIF(trim(COALESCE(p_student_name, '')), ''),
    p_student_age,
    COALESCE(NULLIF(trim(COALESCE(p_notes, '')), ''), 'Lead created manually by admin.'),
    'admin',
    'new'
  )
  RETURNING lead_id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_enrollment_lead(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

-- Admin notification settings RPCs
CREATE OR REPLACE FUNCTION public.get_admin_notification_settings()
RETURNS SETOF public.admin_notification_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY SELECT * FROM admin_notification_settings WHERE is_active = true ORDER BY created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_notification_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_admin_notification_setting(
  p_email TEXT,
  p_notify_new_leads BOOLEAN DEFAULT true
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

  INSERT INTO admin_notification_settings (email, notify_new_leads)
  VALUES (lower(trim(p_email)), p_notify_new_leads)
  ON CONFLICT (email) DO UPDATE SET notify_new_leads = EXCLUDED.notify_new_leads, is_active = true
  RETURNING setting_id INTO v_id;

  RETURN v_id;
END;
$$;

-- Need a unique constraint on email for the ON CONFLICT above
ALTER TABLE public.admin_notification_settings
  DROP CONSTRAINT IF EXISTS admin_notification_settings_email_key;
ALTER TABLE public.admin_notification_settings
  ADD CONSTRAINT admin_notification_settings_email_key UNIQUE (email);

GRANT EXECUTE ON FUNCTION public.upsert_admin_notification_setting(TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_admin_notification_setting(p_setting_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE admin_notification_settings SET is_active = false WHERE setting_id = p_setting_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_admin_notification_setting(UUID) TO authenticated;

-- Appointment slot management RPCs
CREATE OR REPLACE FUNCTION public.upsert_appointment_slot(
  p_slot_id UUID DEFAULT NULL,
  p_day_of_week INTEGER DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_end_time TIME DEFAULT NULL,
  p_label TEXT DEFAULT NULL
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
      day_of_week = COALESCE(p_day_of_week, day_of_week),
      start_time = COALESCE(p_start_time, start_time),
      end_time = COALESCE(p_end_time, end_time),
      label = COALESCE(p_label, label)
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_end_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, end_time, and label are required when creating a new slot';
    END IF;
    INSERT INTO appointment_slots (day_of_week, start_time, end_time, label)
    VALUES (p_day_of_week, p_start_time, p_end_time, p_label)
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(UUID, INTEGER, TIME, TIME, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_appointment_slot(p_slot_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE appointment_slots SET is_active = false WHERE slot_id = p_slot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_appointment_slot(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_slot_override(
  p_slot_id UUID,
  p_override_date DATE,
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

  INSERT INTO appointment_slot_overrides (slot_id, override_date, reason)
  VALUES (p_slot_id, p_override_date, p_reason)
  ON CONFLICT (slot_id, override_date) DO UPDATE SET reason = EXCLUDED.reason
  RETURNING override_id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_slot_override(UUID, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_slot_override(p_override_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM appointment_slot_overrides WHERE override_id = p_override_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_slot_override(UUID) TO authenticated;
