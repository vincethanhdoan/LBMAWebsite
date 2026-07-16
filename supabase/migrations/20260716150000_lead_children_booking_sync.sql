-- Lead state coherence: children edits reconcile program bookings, and a
-- denied/closed lead's booking links stop resolving.
--
-- 1. update_enrollment_lead previously rewrote enrollment_lead_children but
--    never touched enrollment_lead_program_bookings, so editing a child across
--    the program boundary (7 -> 8), adding a child in a new program, or
--    removing a program's last child left the bookings contradicting the
--    children. It now reconciles bookings after the children sync:
--      - a program with children but no booking gets one (with a live link
--        when the lead was already approved, so "Resend booking link" works);
--      - a childless program's never-booked rows are deleted (their links die);
--      - a childless program's booked visit is cancelled and its link killed;
--      - the lead status is recomputed from the surviving bookings.
--
-- 2. get_program_booking_by_token / get_lead_by_token returned rows for
--    denied and closed leads. Since cancelled bookings became rebookable
--    (20260716120300), that would have let a denied lead's family keep using
--    their links. Both lookups now treat those links as gone; the booking
--    edge functions enforce the same rule server-side.

CREATE OR REPLACE FUNCTION public.update_enrollment_lead(
  p_lead_id uuid,
  p_parent_name text,
  p_parent_email text,
  p_phone text,
  p_children jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_child jsonb;
  v_keep uuid[] := '{}';
  v_id uuid;
  v_age integer;
  v_lead_status text;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_parent_name IS NULL OR btrim(p_parent_name) = '' THEN RAISE EXCEPTION 'parent_name is required'; END IF;
  IF p_parent_email IS NULL OR btrim(p_parent_email) = '' THEN RAISE EXCEPTION 'parent_email is required'; END IF;
  IF p_children IS NULL OR jsonb_array_length(p_children) < 1 THEN RAISE EXCEPTION 'at least one child is required'; END IF;

  UPDATE enrollment_leads SET
    parent_name = btrim(p_parent_name),
    parent_email = lower(btrim(p_parent_email)),
    phone = NULLIF(btrim(COALESCE(p_phone, '')), '')
  WHERE lead_id = p_lead_id
  RETURNING status INTO v_lead_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_age := (v_child->>'age')::integer;
    IF v_age < 4 OR v_age > 17 THEN RAISE EXCEPTION 'child age must be between 4 and 17'; END IF;
    IF v_child->>'name' IS NULL OR btrim(v_child->>'name') = '' THEN RAISE EXCEPTION 'child name is required'; END IF;
    IF v_child->>'child_id' IS NOT NULL THEN
      UPDATE enrollment_lead_children SET
        name = btrim(v_child->>'name'),
        age = v_age,
        program_type = CASE WHEN v_age BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END
      WHERE child_id = (v_child->>'child_id')::uuid AND lead_id = p_lead_id
      RETURNING child_id INTO v_id;
      IF v_id IS NULL THEN RAISE EXCEPTION 'child not found on this lead'; END IF;
    ELSE
      INSERT INTO enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (p_lead_id, btrim(v_child->>'name'), v_age,
              CASE WHEN v_age BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END)
      RETURNING child_id INTO v_id;
    END IF;
    v_keep := array_append(v_keep, v_id);
  END LOOP;

  DELETE FROM enrollment_lead_children
  WHERE lead_id = p_lead_id AND NOT (child_id = ANY (v_keep));

  -- Reconcile program bookings with the children that now exist.

  -- A program that gained children needs a booking. When the lead is already
  -- past approval, mint the link now so "Resend booking link" includes it;
  -- otherwise it stays pending and approval mints the link as usual.
  INSERT INTO enrollment_lead_program_bookings (lead_id, program_type, status, booking_token)
  SELECT
    p_lead_id,
    c.program_type,
    CASE WHEN v_lead_status IN ('approved', 'appointment_scheduled', 'appointment_confirmed')
         THEN 'link_sent' ELSE 'pending' END,
    CASE WHEN v_lead_status IN ('approved', 'appointment_scheduled', 'appointment_confirmed')
         THEN gen_random_uuid() END
  FROM (SELECT DISTINCT program_type FROM enrollment_lead_children WHERE lead_id = p_lead_id) c
  WHERE NOT EXISTS (
    SELECT 1 FROM enrollment_lead_program_bookings b
    WHERE b.lead_id = p_lead_id AND b.program_type = c.program_type
  );

  -- A childless program's booking that never held a visit disappears, link
  -- and all.
  DELETE FROM enrollment_lead_program_bookings b
  WHERE b.lead_id = p_lead_id
    AND b.status IN ('pending', 'link_sent')
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_children c
      WHERE c.lead_id = p_lead_id AND c.program_type = b.program_type
    );

  -- A childless program's booked visit is cancelled (date kept for history,
  -- slot freed) and its link killed so the family cannot rebook a program
  -- they no longer have a child in. updated_by keeps the booking-change
  -- trigger from notifying the acting admin.
  UPDATE enrollment_lead_program_bookings b
  SET status = 'cancelled', booking_token = NULL, updated_by = auth.uid()
  WHERE b.lead_id = p_lead_id
    AND b.status IN ('scheduled', 'confirmed')
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_children c
      WHERE c.lead_id = p_lead_id AND c.program_type = b.program_type
    );

  -- Already-cancelled childless bookings lose their (rebookable) link too.
  UPDATE enrollment_lead_program_bookings b
  SET booking_token = NULL
  WHERE b.lead_id = p_lead_id
    AND b.status = 'cancelled'
    AND b.booking_token IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_children c
      WHERE c.lead_id = p_lead_id AND c.program_type = b.program_type
    );

  -- Recompute the lead's own status from the surviving bookings, using the
  -- same rule as the booking edge functions (cancelled rows don't count).
  -- Only active post-approval statuses move; 'new' and terminal states stay.
  IF v_lead_status IN ('approved', 'appointment_scheduled', 'appointment_confirmed') THEN
    UPDATE enrollment_leads SET status = (
      SELECT CASE
        WHEN count(*) FILTER (WHERE b.status NOT IN ('cancelled')) = 0 THEN 'approved'
        WHEN count(*) FILTER (WHERE b.status = 'confirmed')
             = count(*) FILTER (WHERE b.status NOT IN ('cancelled')) THEN 'appointment_confirmed'
        WHEN count(*) FILTER (WHERE b.status IN ('scheduled', 'confirmed'))
             = count(*) FILTER (WHERE b.status NOT IN ('cancelled')) THEN 'appointment_scheduled'
        ELSE 'approved'
      END
      FROM enrollment_lead_program_bookings b
      WHERE b.lead_id = p_lead_id
    )
    WHERE lead_id = p_lead_id;
  END IF;
END $function$;

-- Token lookups: a denied or closed lead's links are dead.

CREATE OR REPLACE FUNCTION public.get_program_booking_by_token(p_token uuid)
RETURNS TABLE(
  booking_id uuid,
  program_type text,
  status text,
  appointment_date date,
  appointment_time time without time zone,
  parent_name text,
  child_names text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND el.status NOT IN ('denied', 'closed')
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token uuid)
RETURNS TABLE(
  status text,
  parent_name text,
  parent_email text,
  appointment_date date,
  appointment_time time without time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT status, parent_name, parent_email, appointment_date, appointment_time
  FROM enrollment_leads
  WHERE booking_token = p_token
    AND status NOT IN ('denied', 'closed')
  LIMIT 1;
$function$;
