-- Every rule about whether a trial visit can be booked lives here, so the
-- dates a family is shown and the bookings that are accepted cannot drift.

-- Why a slot is not bookable on a date, or NULL when it is. p_allow_today and
-- p_horizon_days are trusted arguments set by the caller, never derived from
-- the request. p_lead_id lets a family's own bookings be ignored, matching
-- prevent_slot_double_booking. Raises invalid_booking_request when p_date,
-- p_allow_today, or p_horizon_days is NULL; a missing p_slot_id resolves to
-- slot_inactive like any slot that doesn't exist.
CREATE OR REPLACE FUNCTION public.slot_date_block_reason(
  p_slot_id uuid,
  p_date date,
  p_allow_today boolean,
  p_horizon_days integer,
  p_lead_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot  appointment_slots%ROWTYPE;
  v_now   timestamp := now() AT TIME ZONE 'America/Los_Angeles';
  v_today date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
BEGIN
  IF p_date IS NULL OR p_allow_today IS NULL OR p_horizon_days IS NULL THEN
    RAISE EXCEPTION 'invalid_booking_request';
  END IF;

  SELECT * INTO v_slot FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN 'slot_inactive'; END IF;

  IF p_date < v_today THEN RETURN 'past'; END IF;
  -- Today is staff-only, and only until the arrival time has passed.
  IF p_date = v_today
     AND (NOT p_allow_today OR v_now::time >= v_slot.start_time) THEN
    RETURN 'past';
  END IF;
  IF p_date > v_today + p_horizon_days THEN RETURN 'outside_window'; END IF;

  IF EXTRACT(DOW FROM p_date)::integer <> v_slot.day_of_week THEN
    RETURN 'wrong_day';
  END IF;
  IF NOT (
    v_slot.week_of_month IS NULL
    OR (v_slot.week_of_month = -1
        AND DATE_TRUNC('month', p_date + 7) <> DATE_TRUNC('month', p_date))
    OR (v_slot.week_of_month BETWEEN 1 AND 4
        AND CEIL(EXTRACT(DAY FROM p_date) / 7.0)::integer = v_slot.week_of_month)
  ) THEN
    RETURN 'wrong_day';
  END IF;

  IF EXISTS (
    SELECT 1 FROM blocked_dates b
    WHERE p_date BETWEEN b.start_date AND b.end_date
  ) THEN
    RETURN 'blocked';
  END IF;

  IF EXISTS (
    SELECT 1 FROM enrollment_lead_program_bookings pb
    WHERE pb.appointment_slot_id = p_slot_id
      AND pb.appointment_date = p_date
      AND pb.status IN ('scheduled', 'confirmed')
      AND pb.lead_id IS DISTINCT FROM p_lead_id
  ) THEN
    RETURN 'taken';
  END IF;

  RETURN NULL;
END $function$;

REVOKE ALL ON FUNCTION public.slot_date_block_reason(uuid, date, boolean, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slot_date_block_reason(uuid, date, boolean, integer, uuid) TO service_role;

-- The dates shown to families and staff. Families and the public see three
-- weeks and never today; staff see the window they ask for and may book today.
-- Keeps its existing anon/authenticated grants: CREATE OR REPLACE preserves
-- grants already set on a function, unlike the four functions below, which
-- are new here and need their own REVOKE/GRANT.
CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(
  p_slot_id uuid,
  p_weeks_ahead integer DEFAULT 20,
  p_include_today boolean DEFAULT false
)
RETURNS TABLE(available_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin      boolean := public.is_admin(auth.uid());
  v_today         date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  v_weeks         integer := COALESCE(p_weeks_ahead, 20);
  v_include_today boolean := COALESCE(p_include_today, false);
  v_horizon       integer := CASE WHEN v_is_admin THEN v_weeks * 7
                                  ELSE LEAST(v_weeks * 7, 21) END;
  v_date          date;
BEGIN
  FOR v_date IN
    SELECT d::date FROM generate_series(v_today, v_today + v_horizon, interval '1 day') AS d
  LOOP
    IF public.slot_date_block_reason(
         p_slot_id, v_date, v_is_admin AND v_include_today, v_horizon, NULL
       ) IS NULL THEN
      available_date := v_date;
      RETURN NEXT;
    END IF;
  END LOOP;
END $function$;

-- Validates a booking request and says how it lands. Raises named errors the
-- edge functions map to HTTP responses.
CREATE OR REPLACE FUNCTION public.resolve_program_booking(
  p_program_type text,
  p_slot_id uuid,
  p_date date,
  p_allow_today boolean,
  p_horizon_days integer,
  p_lead_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_program text;
  v_reason       text;
  v_today        date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
BEGIN
  SELECT program_type INTO v_slot_program FROM appointment_slots
  WHERE slot_id = p_slot_id;
  IF v_slot_program IS NOT NULL
     AND v_slot_program NOT IN (p_program_type, 'all') THEN
    RAISE EXCEPTION 'slot_mismatch';
  END IF;

  v_reason := public.slot_date_block_reason(
    p_slot_id, p_date, p_allow_today, p_horizon_days, p_lead_id);
  IF v_reason = 'taken' THEN
    RAISE EXCEPTION 'slot_taken' USING ERRCODE = '23P01';
  ELSIF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'date_unavailable' USING DETAIL = v_reason;
  END IF;

  -- A visit two days away or less needs no separate confirmation.
  RETURN CASE WHEN p_date - v_today <= 2 THEN 'confirmed' ELSE 'scheduled' END;
END $function$;

REVOKE ALL ON FUNCTION public.resolve_program_booking(text, uuid, date, boolean, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_program_booking(text, uuid, date, boolean, integer, uuid) TO service_role;

-- A lead's status follows its active (non-cancelled) visits. Finished leads
-- never move; a missed visit reopens only when a new visit is booked; a lead
-- nobody has invited yet never becomes "invited" by itself.
CREATE OR REPLACE FUNCTION public.recalculate_lead_status(p_lead_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status    text;
  v_total     integer;
  v_active    integer;
  v_booked    integer;
  v_confirmed integer;
  v_upcoming  integer;
  v_result    text;
  v_today     date := (now() AT TIME ZONE 'America/Los_Angeles')::date;
  v_now       timestamp := now() AT TIME ZONE 'America/Los_Angeles';
BEGIN
  SELECT status INTO v_status FROM enrollment_leads WHERE lead_id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF v_status IN ('denied', 'closed', 'attended') THEN RETURN v_status; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE status <> 'cancelled'),
         count(*) FILTER (WHERE status IN ('scheduled', 'confirmed')),
         count(*) FILTER (WHERE status = 'confirmed'),
         count(*) FILTER (WHERE status IN ('scheduled', 'confirmed')
                            AND (appointment_date > v_today
                                 OR (appointment_date = v_today AND appointment_time > v_now::time)))
    INTO v_total, v_active, v_booked, v_confirmed, v_upcoming
  FROM enrollment_lead_program_bookings
  WHERE lead_id = p_lead_id;

  -- Legacy leads carry their visit on the lead row, not in program bookings.
  IF v_total = 0 THEN RETURN v_status; END IF;
  IF v_status = 'no_show' AND v_upcoming = 0 THEN RETURN v_status; END IF;

  v_result := CASE
    WHEN v_active = 0 THEN 'approved'
    WHEN v_confirmed = v_active THEN 'appointment_confirmed'
    WHEN v_booked = v_active THEN 'appointment_scheduled'
    ELSE 'approved'
  END;
  IF v_status = 'new' AND v_result = 'approved' THEN RETURN v_status; END IF;

  UPDATE enrollment_leads SET status = v_result
  WHERE lead_id = p_lead_id AND status IS DISTINCT FROM v_result;
  RETURN v_result;
END $function$;

REVOKE ALL ON FUNCTION public.recalculate_lead_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_lead_status(uuid) TO service_role;

-- Books or moves one program's visit: validate, write, recalculate, in one
-- transaction. p_actor is the admin making the change, or NULL for a family,
-- and keeps notify_admins_booking_change from notifying the person who acted.
CREATE OR REPLACE FUNCTION public.book_program_appointment(
  p_booking_id uuid,
  p_slot_id uuid,
  p_date date,
  p_allow_today boolean,
  p_horizon_days integer,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking     enrollment_lead_program_bookings%ROWTYPE;
  v_lead_status text;
  v_new_status  text;
  v_time        time;
BEGIN
  IF p_slot_id IS NULL THEN RAISE EXCEPTION 'invalid_booking_request'; END IF;

  SELECT * INTO v_booking FROM enrollment_lead_program_bookings
  WHERE booking_id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;

  SELECT status INTO v_lead_status FROM enrollment_leads
  WHERE lead_id = v_booking.lead_id;
  -- A finished lead's link can't book a new visit; staff use Reopen first.
  IF v_lead_status IN ('denied', 'closed', 'attended') THEN
    RAISE EXCEPTION 'lead_closed';
  END IF;

  v_new_status := public.resolve_program_booking(
    v_booking.program_type, p_slot_id, p_date,
    p_allow_today, p_horizon_days, v_booking.lead_id);

  SELECT start_time INTO v_time FROM appointment_slots WHERE slot_id = p_slot_id;

  UPDATE enrollment_lead_program_bookings SET
    appointment_slot_id = p_slot_id,
    appointment_date = p_date,
    appointment_time = v_time,
    status = v_new_status,
    updated_by = p_actor
  WHERE booking_id = p_booking_id;

  PERFORM public.recalculate_lead_status(v_booking.lead_id);

  RETURN jsonb_build_object(
    'status', v_new_status,
    'appointment_date', p_date,
    'appointment_time', v_time,
    'lead_id', v_booking.lead_id
  );
END $function$;

REVOKE ALL ON FUNCTION public.book_program_appointment(uuid, uuid, date, boolean, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_program_appointment(uuid, uuid, date, boolean, integer, uuid) TO service_role;

-- update_enrollment_lead recomputes the lead's own status using the shared
-- recalculate_lead_status function instead of its own inline copy of the rule.
DO $$
DECLARE
  src     text;
  v_start integer;
  v_end   integer;
  v_open  text := '  -- Only active post-approval statuses move; ''new'' and terminal states stay.' || chr(10) || '  IF v_lead_status IN (''approved'', ''appointment_scheduled'', ''appointment_confirmed'') THEN' || chr(10) || '    UPDATE enrollment_leads SET status = (';
  v_close text := '    WHERE lead_id = p_lead_id;' || chr(10) || '  END IF;' || chr(10) || 'END';
BEGIN
  SELECT pg_get_functiondef('public.update_enrollment_lead(uuid,text,text,text,jsonb)'::regprocedure)
    INTO src;

  -- Already rewritten by a previous run of this migration; nothing to do.
  IF position('recalculate_lead_status' in src) > 0 THEN RETURN; END IF;

  v_start := position(v_open in src);
  v_end   := position(v_close in src);
  IF v_start = 0 OR v_end = 0 OR v_end < v_start THEN
    RAISE EXCEPTION 'update_enrollment_lead no longer matches the expected body';
  END IF;

  src := substr(src, 1, v_start - 1)
      || '  -- recalculate_lead_status owns the rule, including which statuses never move.' || chr(10)
      || '  PERFORM public.recalculate_lead_status(p_lead_id);' || chr(10)
      || 'END'
      || substr(src, v_end + length(v_close));

  EXECUTE src;
END $$;
