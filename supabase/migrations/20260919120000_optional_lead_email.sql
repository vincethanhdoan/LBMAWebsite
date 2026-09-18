-- Email becomes optional for staff-entered leads. A lead must still have a way
-- to be reached: an email or a phone. Family emails are queued through one
-- function so "no email, no notification" is decided in a single place.

ALTER TABLE public.enrollment_leads ALTER COLUMN parent_email DROP NOT NULL;

ALTER TABLE public.enrollment_leads
  DROP CONSTRAINT enrollment_leads_parent_email_min_len;
ALTER TABLE public.enrollment_leads
  ADD CONSTRAINT enrollment_leads_parent_email_min_len
  CHECK (parent_email IS NULL OR length(TRIM(BOTH FROM parent_email)) >= 5);

ALTER TABLE public.enrollment_leads
  ADD CONSTRAINT enrollment_leads_contact_method
  CHECK (parent_email IS NOT NULL OR phone IS NOT NULL);

-- Shared contact validation for the two admin RPCs. Returns the normalised
-- email (NULL when blank) and raises when the contact rule is broken.
CREATE OR REPLACE FUNCTION public.normalize_lead_contact(
  p_parent_email text,
  p_phone text,
  OUT email text,
  OUT phone text
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text;
BEGIN
  email := NULLIF(lower(btrim(COALESCE(p_parent_email, ''))), '');
  phone := NULLIF(btrim(COALESCE(p_phone, '')), '');

  IF email IS NOT NULL
     AND (length(email) < 5 OR length(email) > 254
          OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;

  IF email IS NULL THEN
    IF phone IS NULL THEN
      RAISE EXCEPTION 'A phone number is required when there is no email.';
    END IF;
    v_digits := regexp_replace(phone, '\D', '', 'g');
    IF NOT (length(v_digits) = 10
            OR (length(v_digits) = 11 AND left(v_digits, 1) = '1')) THEN
      RAISE EXCEPTION 'Please enter a valid 10-digit phone number.';
    END IF;
  END IF;
END $function$;

REVOKE ALL ON FUNCTION public.normalize_lead_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_lead_contact(text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_enrollment_lead(
  p_parent_name text,
  p_parent_email text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_children jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id       UUID;
  v_child         JSONB;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
  v_contact       RECORD;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_contact FROM normalize_lead_contact(p_parent_email, p_phone);

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, status)
  VALUES (
    trim(p_parent_name),
    v_contact.email,
    v_contact.phone,
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
$function$;

DO $$
DECLARE
  src text;
  v_old_email_check text := 'IF p_parent_email IS NULL OR btrim(p_parent_email) = '''' THEN RAISE EXCEPTION ''parent_email is required''; END IF;';
  v_old_email_set   text := 'parent_email = lower(btrim(p_parent_email)),';
  v_old_phone_set   text := 'phone = NULLIF(btrim(COALESCE(p_phone, '''')), '''')';
  v_old_decl        text := 'v_lead_status text;';
BEGIN
  SELECT pg_get_functiondef('public.update_enrollment_lead(uuid,text,text,text,jsonb)'::regprocedure)
    INTO src;

  -- Each guard checks the exact string its matching replace() searches for,
  -- from the same constant, so the guard and the replace can never diverge.
  IF position(v_old_email_check in src) = 0
     OR position(v_old_email_set in src) = 0
     OR position(v_old_phone_set in src) = 0
     OR position(v_old_decl in src) = 0 THEN
    RAISE EXCEPTION 'update_enrollment_lead no longer matches the expected body';
  END IF;

  src := replace(src, v_old_email_check,
    'SELECT * INTO v_contact FROM normalize_lead_contact(p_parent_email, p_phone);');
  src := replace(src, v_old_email_set, 'parent_email = v_contact.email,');
  src := replace(src, v_old_phone_set, 'phone = v_contact.phone');
  src := replace(src, v_old_decl, v_old_decl || chr(10) || '  v_contact record;');

  EXECUTE src;
END $$;

-- One place that queues an email to the family. Admin alerts (new_lead) are
-- addressed to the school and are not handled here.
CREATE OR REPLACE FUNCTION public.queue_family_notification(
  p_lead_id uuid,
  p_type text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  IF p_type NOT IN ('approval', 'reschedule', 'denial', 'booking_confirmation', 'reminder') THEN
    RAISE EXCEPTION 'queue_family_notification does not handle type %', p_type;
  END IF;

  SELECT parent_email INTO v_email FROM enrollment_leads WHERE lead_id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF v_email IS NULL THEN RETURN 'no_email'; END IF;

  -- A receipt or reminder still waiting to send already covers this request:
  -- both render the lead's current visits at send time.
  IF p_type IN ('booking_confirmation', 'reminder') AND EXISTS (
    SELECT 1 FROM enrollment_lead_notifications
    WHERE lead_id = p_lead_id AND type = p_type AND status = 'queued'
  ) THEN
    RETURN 'already_queued';
  END IF;

  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (p_lead_id, v_email, 'email', p_type, 'queued');
  RETURN 'queued';
END $function$;

REVOKE ALL ON FUNCTION public.queue_family_notification(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_family_notification(uuid, text) TO service_role;

-- Reminder cron: same selection as before, queued through the shared function
-- so leads without an email are skipped.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='appointment-reminders') THEN
    PERFORM cron.unschedule('appointment-reminders');
  END IF;
  PERFORM cron.schedule('appointment-reminders', '0 1,2 * * *', '
  SELECT queue_family_notification(el.lead_id, ''reminder'')
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND EXTRACT(HOUR FROM (now() AT TIME ZONE ''America/Los_Angeles'')) = 18
    AND el.status IN (''appointment_scheduled'', ''appointment_confirmed'')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.status IN (''scheduled'', ''confirmed'')
        AND elpb.appointment_date >= (now() AT TIME ZONE ''America/Los_Angeles'')::date
    ) = ((now() AT TIME ZONE ''America/Los_Angeles'')::date + INTERVAL ''2 days'')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = ''reminder''
        AND (eln.created_at AT TIME ZONE ''America/Los_Angeles'')::date = (now() AT TIME ZONE ''America/Los_Angeles'')::date
    );
  ');
END $$;
