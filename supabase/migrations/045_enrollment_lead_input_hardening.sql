-- Harden the public submit_enrollment_lead RPC against abuse.
-- Adds server-side input limits and real email/phone validation, and tightens
-- rate limits. Validation failures raise the default P0001; rate-limit guards
-- keep SQLSTATE 'P0429' (the client special-cases it).
--   * parent_name: length 2-100
--   * parent_email: length 5-254 and must match a real email shape
--   * phone (if present): raw length <= 20, digits-only count 10, or 11 with '1'
--   * message: length <= 1500
--   * children: 1-6 entries; each name length 1-60
--   * rate limits: keep 30s per-email cooldown, add 5-per-24h per-email cap,
--     raise global cap from 20/hr to 60/hr
-- Everything else (inserts, notifications, program bookings) is unchanged.

CREATE OR REPLACE FUNCTION public.submit_enrollment_lead(
  p_parent_name  TEXT,
  p_parent_email TEXT,
  p_phone        TEXT DEFAULT NULL,
  p_message      TEXT DEFAULT NULL,
  p_source_page  TEXT DEFAULT 'contact',
  p_children     JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id       UUID;
  v_notif_email   TEXT;
  v_parent_name   TEXT := trim(COALESCE(p_parent_name,''));
  v_parent_email  TEXT := lower(trim(COALESCE(p_parent_email,'')));
  v_phone         TEXT := NULLIF(trim(COALESCE(p_phone,'')),'');
  v_phone_digits  TEXT;
  v_message       TEXT := NULLIF(trim(COALESCE(p_message,'')),'');
  v_source_page   TEXT := COALESCE(NULLIF(trim(COALESCE(p_source_page,'')),''),'contact');
  v_child         JSONB;
  v_child_name    TEXT;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
BEGIN
  IF length(v_parent_name) < 2 OR length(v_parent_name) > 100 THEN
    RAISE EXCEPTION 'Parent name must be between 2 and 100 characters.';
  END IF;

  IF length(v_parent_email) < 5 OR length(v_parent_email) > 254
     OR v_parent_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Please provide a valid email.';
  END IF;

  IF v_phone IS NOT NULL THEN
    IF length(v_phone) > 20 THEN RAISE EXCEPTION 'Please provide a valid phone number.'; END IF;
    v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
    IF NOT (length(v_phone_digits) = 10
            OR (length(v_phone_digits) = 11 AND left(v_phone_digits, 1) = '1')) THEN
      RAISE EXCEPTION 'Please provide a valid phone number.';
    END IF;
  END IF;

  IF v_message IS NOT NULL AND length(v_message) > 1500 THEN
    RAISE EXCEPTION 'Message must be 1500 characters or fewer.';
  END IF;

  IF p_children IS NULL OR jsonb_typeof(p_children) <> 'array'
     OR jsonb_array_length(p_children) < 1 OR jsonb_array_length(p_children) > 6 THEN
    RAISE EXCEPTION 'Please list between 1 and 6 children.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.enrollment_leads
    WHERE parent_email = v_parent_email
      AND created_at > NOW() - INTERVAL '30 seconds'
  ) THEN
    RAISE EXCEPTION 'Please wait a moment before submitting again.'
      USING ERRCODE = 'P0429';
  END IF;

  IF (
    SELECT count(*) FROM public.enrollment_leads
    WHERE parent_email = v_parent_email
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'You have reached the maximum number of submissions for today. Please try again later.'
      USING ERRCODE = 'P0429';
  END IF;

  IF (
    SELECT count(*) FROM public.enrollment_leads
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) >= 60 THEN
    RAISE EXCEPTION 'Too many requests right now. Please try again later.'
      USING ERRCODE = 'P0429';
  END IF;

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
      v_child_name := trim(COALESCE(v_child->>'name',''));
      IF length(v_child_name) < 1 OR length(v_child_name) > 60 THEN
        RAISE EXCEPTION 'Each child name must be between 1 and 60 characters.';
      END IF;
      v_age := (v_child->>'age')::INTEGER;
      IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
      ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
      ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
      END IF;
      INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (v_lead_id, v_child_name, v_age, v_program);
      IF NOT (v_program = ANY(v_programs_seen)) THEN
        INSERT INTO public.enrollment_lead_program_bookings (lead_id, program_type, status)
        VALUES (v_lead_id, v_program, 'pending');
        v_programs_seen := v_programs_seen || v_program;
      END IF;
    END LOOP;
  END IF;

  RETURN v_lead_id;
END;
$function$;
