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

-- A client-generated idempotency key. Random, never guessable, and never
-- reused across leads, so a retry can only ever fetch the receipt it made
-- itself, never one it merely guesses the shape of.
ALTER TABLE public.enrollment_leads
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_leads_request_id
  ON public.enrollment_leads (request_id)
  WHERE request_id IS NOT NULL;

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

-- The one place age maps to program, so the rule can't drift between the
-- validation pass and the insert pass. NULL means the age is out of range.
CREATE OR REPLACE FUNCTION public.program_for_age(p_age integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_age BETWEEN 4 AND 7 THEN 'little_dragons'
    WHEN p_age BETWEEN 8 AND 17 THEN 'youth'
    ELSE NULL
  END;
$function$;

REVOKE ALL ON FUNCTION public.program_for_age(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.program_for_age(integer) TO service_role;

-- The 8-argument version predates p_request_id. CREATE OR REPLACE cannot
-- change an argument list, so the old signature has to go first.
DROP FUNCTION IF EXISTS public.submit_trial_booking(text, text, text, jsonb, jsonb, text, text, text);

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
  p_request_id uuid DEFAULT NULL,
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
  v_name              text := trim(COALESCE(p_parent_name, ''));
  v_email             text := lower(trim(COALESCE(p_parent_email, '')));
  v_phone             text := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_digits            text;
  v_message           text := NULLIF(trim(COALESCE(p_message, '')), '');
  v_source_raw        text := NULLIF(trim(COALESCE(p_source_page, '')), '');
  v_source            text := CASE WHEN v_source_raw IS NULL OR length(v_source_raw) > 50
                                    THEN 'contact' ELSE v_source_raw END;
  v_language          text := CASE WHEN p_language = 'es' THEN 'es' ELSE 'en' END;
  v_today             date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  v_child             jsonb;
  v_child_name        text;
  v_age_text          text;
  v_age               integer;
  v_programs          text[] := '{}';
  v_booking           jsonb;
  v_booking_slot_text text;
  v_booking_date_text text;
  v_seen              text[] := '{}';
  v_program           text;
  v_slot_id           uuid;
  v_date              date;
  v_status            text;
  v_time              time;
  v_existing          uuid;
  v_lead_id           uuid;
  v_notif_email       text;
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
    -- Validate the age's shape before it is ever cast, so a malformed value
    -- (missing, non-numeric, decimal) fails with our message, not a raw
    -- Postgres cast error.
    v_age_text := v_child->>'age';
    IF v_age_text IS NULL OR v_age_text !~ '^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Child age must be between 4 and 17.';
    END IF;
    v_age := v_age_text::integer;
    v_program := public.program_for_age(v_age);
    IF v_program IS NULL THEN
      RAISE EXCEPTION 'Child age must be between 4 and 17.';
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
    v_booking_slot_text := v_booking->>'slot_id';
    v_booking_date_text := v_booking->>'date';
    -- Validate slot_id and date shape before either is cast: a malformed
    -- value fails with invalid_booking_request, not a raw Postgres cast error.
    IF v_program IS NULL OR NOT (v_program = ANY (v_programs)) OR v_program = ANY (v_seen)
       OR v_booking_slot_text IS NULL
       OR v_booking_slot_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       OR v_booking_date_text IS NULL
       OR v_booking_date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'invalid_booking_request';
    END IF;
    v_seen := v_seen || v_program;
  END LOOP;

  -- The form gives up waiting after 12 seconds while this can still commit,
  -- so a retry carrying the same request id returns the visit it already
  -- made; the id is random and never leaves the parent's browser, so nobody
  -- else can ask for that receipt. The advisory lock makes a concurrent
  -- double submit of the same id wait for the first to finish instead of
  -- racing it into the unique index.
  IF p_request_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('trial_booking:' || p_request_id::text, 0));

    SELECT lead_id INTO v_existing
    FROM enrollment_leads
    WHERE request_id = p_request_id
      AND parent_email = v_email
      AND deleted_at IS NULL;

    IF v_existing IS NOT NULL THEN
      RETURN public.trial_booking_receipt(v_existing);
    END IF;
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
  -- Counts only public submissions (source_page <> 'admin'), so staff typing
  -- in leads by hand can never block the public form.
  IF (SELECT count(*) FROM enrollment_leads
      WHERE created_at > now() - interval '1 hour' AND source_page <> 'admin') >= 10 THEN
    RAISE EXCEPTION 'Too many requests right now. Please try again later.' USING ERRCODE = 'P0429';
  END IF;

  INSERT INTO enrollment_leads
    (parent_name, parent_email, phone, message, source_page, status,
     preferred_language, notification_status, notified_at, request_id)
  VALUES (v_name, v_email, v_phone, v_message, v_source, 'new', v_language, 'queued', now(), p_request_id)
  RETURNING lead_id INTO v_lead_id;

  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_age := (v_child->>'age')::integer;
    INSERT INTO enrollment_lead_children (lead_id, name, age, program_type)
    VALUES (v_lead_id, trim(v_child->>'name'), v_age, public.program_for_age(v_age));
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
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_booking_request';
    END IF;
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

REVOKE ALL ON FUNCTION public.submit_trial_booking(text, text, text, jsonb, jsonb, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_trial_booking(text, text, text, jsonb, jsonb, uuid, text, text, text)
  TO anon, authenticated;
