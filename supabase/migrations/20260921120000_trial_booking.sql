-- Booking a trial visit at signup. The public form will call
-- submit_trial_booking (PR 3b); submit_enrollment_lead stays until then.

ALTER TABLE public.enrollment_leads
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollment_leads_preferred_language_check'
  ) THEN
    ALTER TABLE public.enrollment_leads
      ADD CONSTRAINT enrollment_leads_preferred_language_check
      CHECK (preferred_language IN ('en', 'es'));
  END IF;
END $$;

-- What the form needs to show a receipt: the lead and its booked visits.
CREATE OR REPLACE FUNCTION public.trial_booking_receipt(p_lead_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'lead_id', p_lead_id,
    'visits', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'program_type', b.program_type,
               'booking_token', b.booking_token,
               'appointment_date', b.appointment_date,
               'appointment_time', b.appointment_time,
               'status', b.status)
             ORDER BY b.appointment_date, b.appointment_time)
      FROM enrollment_lead_program_bookings b
      WHERE b.lead_id = p_lead_id
        AND b.status IN ('scheduled', 'confirmed')
    ), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION public.trial_booking_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trial_booking_receipt(uuid) TO service_role;

-- Creates a lead and books its visits in one transaction. Any failure,
-- including a slot taken a moment ago, rolls the whole submission back, so a
-- web lead either exists with its visits or does not exist at all. The booking
-- window (21 days) and same-day rule (never) are fixed here, not parameters.
CREATE OR REPLACE FUNCTION public.submit_trial_booking(
  p_parent_name text,
  p_parent_email text,
  p_phone text,
  p_children jsonb,
  p_bookings jsonb,
  p_language text DEFAULT 'en',
  p_message text DEFAULT NULL,
  p_source_page text DEFAULT 'contact'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name         text := trim(COALESCE(p_parent_name, ''));
  v_email        text := lower(trim(COALESCE(p_parent_email, '')));
  v_phone        text := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_digits       text;
  v_message      text := NULLIF(trim(COALESCE(p_message, '')), '');
  v_source       text := COALESCE(NULLIF(trim(COALESCE(p_source_page, '')), ''), 'contact');
  v_language     text := CASE WHEN p_language = 'es' THEN 'es' ELSE 'en' END;
  v_today        date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  v_child        jsonb;
  v_child_name   text;
  v_age          integer;
  v_programs     text[] := '{}';
  v_booking      jsonb;
  v_seen         text[] := '{}';
  v_program      text;
  v_slot_id      uuid;
  v_date         date;
  v_status       text;
  v_time         time;
  v_existing     uuid;
  v_lead_id      uuid;
  v_notif_email  text;
BEGIN
  IF length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Parent name must be between 2 and 100 characters.';
  END IF;
  IF length(v_email) < 5 OR length(v_email) > 254
     OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Please provide a valid email.';
  END IF;
  IF v_phone IS NULL OR length(v_phone) > 20 THEN
    RAISE EXCEPTION 'Please provide a valid phone number.';
  END IF;
  v_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  IF NOT (length(v_digits) = 10 OR (length(v_digits) = 11 AND left(v_digits, 1) = '1')) THEN
    RAISE EXCEPTION 'Please provide a valid phone number.';
  END IF;
  v_digits := right(v_digits, 10);
  IF v_message IS NOT NULL AND length(v_message) > 1500 THEN
    RAISE EXCEPTION 'Message must be 1500 characters or fewer.';
  END IF;

  IF p_children IS NULL OR jsonb_typeof(p_children) <> 'array'
     OR jsonb_array_length(p_children) < 1 OR jsonb_array_length(p_children) > 6 THEN
    RAISE EXCEPTION 'Please list between 1 and 6 children.';
  END IF;
  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_child_name := trim(COALESCE(v_child->>'name', ''));
    IF length(v_child_name) < 1 OR length(v_child_name) > 60 THEN
      RAISE EXCEPTION 'Each child name must be between 1 and 60 characters.';
    END IF;
    v_age := (v_child->>'age')::integer;
    IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
    ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
    ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
    END IF;
    IF NOT (v_program = ANY (v_programs)) THEN v_programs := v_programs || v_program; END IF;
  END LOOP;

  -- Exactly one visit per program the children fall into.
  IF p_bookings IS NULL OR jsonb_typeof(p_bookings) <> 'array'
     OR jsonb_array_length(p_bookings) <> cardinality(v_programs) THEN
    RAISE EXCEPTION 'invalid_booking_request';
  END IF;
  FOR v_booking IN SELECT * FROM jsonb_array_elements(p_bookings) LOOP
    v_program := v_booking->>'program_type';
    IF v_program IS NULL OR NOT (v_program = ANY (v_programs)) OR v_program = ANY (v_seen)
       OR v_booking->>'slot_id' IS NULL OR v_booking->>'date' IS NULL THEN
      RAISE EXCEPTION 'invalid_booking_request';
    END IF;
    v_seen := v_seen || v_program;
  END LOOP;

  -- The form gives up waiting after 12 seconds while this can still commit.
  -- A retry of the same request returns the visit it already made.
  SELECT l.lead_id INTO v_existing
  FROM enrollment_leads l
  WHERE l.parent_email = v_email
    AND l.deleted_at IS NULL
    AND l.created_at > now() - interval '10 minutes'
    AND (SELECT count(*) FROM enrollment_lead_program_bookings b
         WHERE b.lead_id = l.lead_id AND b.status IN ('scheduled', 'confirmed'))
        = jsonb_array_length(p_bookings)
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_bookings) r
      WHERE NOT EXISTS (
        SELECT 1 FROM enrollment_lead_program_bookings b
        WHERE b.lead_id = l.lead_id
          AND b.program_type = r->>'program_type'
          AND b.appointment_slot_id = (r->>'slot_id')::uuid
          AND b.appointment_date = (r->>'date')::date
          AND b.status IN ('scheduled', 'confirmed')))
  ORDER BY l.created_at DESC
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN public.trial_booking_receipt(v_existing);
  END IF;

  -- One upcoming visit per family per program. A second one would take a
  -- slot another family could use; they change theirs through their link.
  IF EXISTS (
    SELECT 1
    FROM enrollment_leads l
    JOIN enrollment_lead_program_bookings b ON b.lead_id = l.lead_id
    WHERE l.deleted_at IS NULL
      AND l.status NOT IN ('denied', 'closed')
      AND (l.parent_email = v_email
           OR right(regexp_replace(COALESCE(l.phone, ''), '[^0-9]', '', 'g'), 10) = v_digits)
      AND b.status IN ('scheduled', 'confirmed')
      AND b.appointment_date >= v_today
      AND b.program_type = ANY (v_programs)
  ) THEN
    RAISE EXCEPTION 'already_booked' USING ERRCODE = 'P0409';
  END IF;

  IF EXISTS (SELECT 1 FROM enrollment_leads
             WHERE parent_email = v_email AND created_at > now() - interval '30 seconds') THEN
    RAISE EXCEPTION 'Please wait a moment before submitting again.' USING ERRCODE = 'P0429';
  END IF;
  IF (SELECT count(*) FROM enrollment_leads
      WHERE created_at > now() - interval '24 hours'
        AND (parent_email = v_email
             OR right(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = v_digits)) >= 5 THEN
    RAISE EXCEPTION 'You have reached the maximum number of submissions for today. Please try again later.'
      USING ERRCODE = 'P0429';
  END IF;
  -- Real volume is about ten a week; every booking here takes a real slot.
  IF (SELECT count(*) FROM enrollment_leads WHERE created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many requests right now. Please try again later.' USING ERRCODE = 'P0429';
  END IF;

  INSERT INTO enrollment_leads
    (parent_name, parent_email, phone, message, source_page, status,
     preferred_language, notification_status, notified_at)
  VALUES (v_name, v_email, v_phone, v_message, v_source, 'new', v_language, 'queued', now())
  RETURNING lead_id INTO v_lead_id;

  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_age := (v_child->>'age')::integer;
    INSERT INTO enrollment_lead_children (lead_id, name, age, program_type)
    VALUES (v_lead_id, trim(v_child->>'name'), v_age,
            CASE WHEN v_age BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END);
  END LOOP;

  -- Visits are inserted already booked, in a fixed order so two submissions
  -- cannot deadlock on the slot locks. Inserting (not updating) keeps
  -- notify_admins_booking_change quiet: admins get one new-lead bell.
  FOR v_booking IN
    SELECT * FROM jsonb_array_elements(p_bookings) r
    ORDER BY r->>'slot_id', r->>'date'
  LOOP
    v_program := v_booking->>'program_type';
    v_slot_id := (v_booking->>'slot_id')::uuid;
    v_date    := (v_booking->>'date')::date;
    v_status  := public.resolve_program_booking(v_program, v_slot_id, v_date, false, 21, v_lead_id);
    SELECT start_time INTO v_time FROM appointment_slots WHERE slot_id = v_slot_id;
    INSERT INTO enrollment_lead_program_bookings
      (lead_id, program_type, booking_token, appointment_slot_id,
       appointment_date, appointment_time, status)
    VALUES (v_lead_id, v_program, gen_random_uuid(), v_slot_id, v_date, v_time, v_status);
  END LOOP;

  PERFORM public.recalculate_lead_status(v_lead_id);

  v_notif_email := lower(COALESCE(
    NULLIF(trim(current_setting('app.lbmaa_faculty_notification_email', true)), ''),
    'LosBanosMartialArts@gmail.com'));
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (v_lead_id, v_notif_email, 'email', 'new_lead', 'queued');
  PERFORM public.queue_family_notification(v_lead_id, 'booking_confirmation');

  RETURN public.trial_booking_receipt(v_lead_id);
END $function$;

REVOKE ALL ON FUNCTION public.submit_trial_booking(text, text, text, jsonb, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_trial_booking(text, text, text, jsonb, jsonb, text, text, text)
  TO anon, authenticated;
