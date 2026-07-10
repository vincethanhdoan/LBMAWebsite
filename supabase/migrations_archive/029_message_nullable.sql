-- Make message optional on enrollment leads
ALTER TABLE public.enrollment_leads ALTER COLUMN message DROP NOT NULL;

-- Remove the fallback default from submit_enrollment_lead
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

  -- No fallback: leave v_message as NULL when no message was provided

  v_notif_email := lower(COALESCE(
    NULLIF(trim(current_setting('app.lbmaa_faculty_notification_email', true)),''),
    'vincethanhdoan@gmail.com'
  ));

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, notification_status, notified_at)
  VALUES (v_parent_name, v_parent_email, v_phone, v_message, v_source_page, 'queued', NOW())
  RETURNING lead_id INTO v_lead_id;

  -- Admin notification
  INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (v_lead_id, v_notif_email, 'email', 'new_lead', 'queued');

  -- Prospect thank-you email
  INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (v_lead_id, v_parent_email, 'email', 'submission', 'queued');

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

-- Backfill: clear the placeholder string from existing rows
UPDATE public.enrollment_leads
SET message = NULL
WHERE message = 'Enrollment lead submitted from public website.';
