-- supabase/migrations/007_multi_child_enrollment.sql

-- 1. program_type on appointment_slots
ALTER TABLE public.appointment_slots
  ADD COLUMN IF NOT EXISTS program_type TEXT NOT NULL DEFAULT 'all'
    CHECK (program_type IN ('little_dragons', 'youth', 'all'));

-- 2. enrollment_lead_children
CREATE TABLE IF NOT EXISTS public.enrollment_lead_children (
  child_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES public.enrollment_leads(lead_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  age          INTEGER NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('little_dragons', 'youth')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT children_age_range CHECK (age >= 4 AND age <= 17)
);
CREATE INDEX IF NOT EXISTS idx_elc_lead_id ON public.enrollment_lead_children(lead_id);

-- 3. enrollment_lead_program_bookings
CREATE TABLE IF NOT EXISTS public.enrollment_lead_program_bookings (
  booking_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID NOT NULL REFERENCES public.enrollment_leads(lead_id) ON DELETE CASCADE,
  program_type        TEXT NOT NULL CHECK (program_type IN ('little_dragons', 'youth')),
  booking_token       UUID UNIQUE,
  appointment_slot_id UUID REFERENCES public.appointment_slots(slot_id),
  appointment_date    DATE,
  appointment_time    TIME,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','link_sent','scheduled','confirmed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, program_type)
);
CREATE INDEX IF NOT EXISTS idx_elpb_lead_id ON public.enrollment_lead_program_bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_elpb_token  ON public.enrollment_lead_program_bookings(booking_token);

-- 4. RLS
ALTER TABLE public.enrollment_lead_children         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_lead_program_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view enrollment lead children" ON public.enrollment_lead_children;
CREATE POLICY "Admins can view enrollment lead children"
  ON public.enrollment_lead_children FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update enrollment lead children" ON public.enrollment_lead_children;
CREATE POLICY "Admins can update enrollment lead children"
  ON public.enrollment_lead_children FOR UPDATE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view enrollment lead program bookings" ON public.enrollment_lead_program_bookings;
CREATE POLICY "Admins can view enrollment lead program bookings"
  ON public.enrollment_lead_program_bookings FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update enrollment lead program bookings" ON public.enrollment_lead_program_bookings;
CREATE POLICY "Admins can update enrollment lead program bookings"
  ON public.enrollment_lead_program_bookings FOR UPDATE USING (is_admin(auth.uid()));

GRANT SELECT, UPDATE ON public.enrollment_lead_children         TO authenticated;
GRANT SELECT, UPDATE ON public.enrollment_lead_program_bookings TO authenticated;

-- 5. get_upcoming_bookable_dates — exclude already-booked slot+date pairs
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
          SELECT 1 FROM appointment_slot_overrides o
          WHERE o.slot_id = p_slot_id AND o.override_date = v_check_date
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

-- 6. submit_enrollment_lead — accept children JSONB, remove student_name/age params
CREATE OR REPLACE FUNCTION public.submit_enrollment_lead(
  p_parent_name  TEXT,
  p_parent_email TEXT,
  p_phone        TEXT DEFAULT NULL,
  p_message      TEXT DEFAULT NULL,
  p_source_page  TEXT DEFAULT 'contact',
  p_children     JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead_id       UUID;
  v_notif_email   TEXT;
  v_parent_name   TEXT := trim(COALESCE(p_parent_name,''));
  v_parent_email  TEXT := lower(trim(COALESCE(p_parent_email,'')));
  v_phone         TEXT := NULLIF(trim(COALESCE(p_phone,'')),'');
  v_message       TEXT := NULLIF(trim(COALESCE(p_message,'')),'');
  v_source_page   TEXT := COALESCE(NULLIF(trim(COALESCE(p_source_page,'')),''),'contact');
  v_child         JSONB;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
BEGIN
  IF length(v_parent_name) < 2 THEN RAISE EXCEPTION 'Parent name must be at least 2 characters.'; END IF;
  IF length(v_parent_email) < 5 OR position('@' IN v_parent_email) <= 1 THEN RAISE EXCEPTION 'Please provide a valid email.'; END IF;
  IF v_message IS NULL THEN v_message := 'Enrollment lead submitted from public website.'; END IF;

  v_notif_email := lower(COALESCE(
    NULLIF(trim(current_setting('app.lbmaa_faculty_notification_email', true)),''),
    'vincethanhdoan@gmail.com'
  ));

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, notification_status, notified_at)
  VALUES (v_parent_name, v_parent_email, v_phone, v_message, v_source_page, 'queued', NOW())
  RETURNING lead_id INTO v_lead_id;

  INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, status)
  VALUES (v_lead_id, v_notif_email, 'email', 'queued');

  IF p_children IS NOT NULL AND jsonb_array_length(p_children) > 0 THEN
    FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
      v_age := (v_child->>'age')::INTEGER;
      IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
      ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
      ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
      END IF;
      INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (v_lead_id, trim(v_child->>'name'), v_age, v_program);
      IF NOT (v_program = ANY(v_programs_seen)) THEN
        INSERT INTO public.enrollment_lead_program_bookings (lead_id, program_type, status)
        VALUES (v_lead_id, v_program, 'pending');
        v_programs_seen := v_programs_seen || v_program;
      END IF;
    END LOOP;
  END IF;

  RETURN v_lead_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.submit_enrollment_lead(TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT,TEXT);

-- 7. create_enrollment_lead (admin) — same treatment
CREATE OR REPLACE FUNCTION public.create_enrollment_lead(
  p_parent_name  TEXT,
  p_parent_email TEXT,
  p_phone        TEXT DEFAULT NULL,
  p_notes        TEXT DEFAULT NULL,
  p_children     JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lead_id       UUID;
  v_child         JSONB;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, status)
  VALUES (
    trim(p_parent_name),
    lower(trim(p_parent_email)),
    NULLIF(trim(COALESCE(p_phone,'')),''),
    COALESCE(NULLIF(trim(COALESCE(p_notes,'')),''), 'Lead created manually by admin.'),
    'admin', 'new'
  )
  RETURNING lead_id INTO v_lead_id;

  IF p_children IS NOT NULL AND jsonb_array_length(p_children) > 0 THEN
    FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
      v_age := (v_child->>'age')::INTEGER;
      IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
      ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
      ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
      END IF;
      INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (v_lead_id, trim(v_child->>'name'), v_age, v_program);
      IF NOT (v_program = ANY(v_programs_seen)) THEN
        INSERT INTO public.enrollment_lead_program_bookings (lead_id, program_type, status)
        VALUES (v_lead_id, v_program, 'pending');
        v_programs_seen := v_programs_seen || v_program;
      END IF;
    END LOOP;
  END IF;

  RETURN v_lead_id;
END;
$$;
DROP FUNCTION IF EXISTS public.create_enrollment_lead(TEXT,TEXT,TEXT,TEXT,INTEGER,TEXT);
GRANT EXECUTE ON FUNCTION public.create_enrollment_lead(TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

-- 8. get_program_booking_by_token — resolves a booking token to booking + children
CREATE OR REPLACE FUNCTION public.get_program_booking_by_token(p_token UUID)
RETURNS TABLE(
  booking_id       UUID,
  program_type     TEXT,
  status           TEXT,
  appointment_date DATE,
  appointment_time TIME,
  parent_name      TEXT,
  child_names      TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    pb.booking_id,
    pb.program_type,
    pb.status,
    pb.appointment_date,
    pb.appointment_time,
    el.parent_name,
    ARRAY(
      SELECT c.name FROM enrollment_lead_children c
      WHERE c.lead_id = pb.lead_id AND c.program_type = pb.program_type
      ORDER BY c.created_at
    ) AS child_names
  FROM enrollment_lead_program_bookings pb
  JOIN enrollment_leads el ON el.lead_id = pb.lead_id
  WHERE pb.booking_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_program_booking_by_token(UUID) TO anon, authenticated;
