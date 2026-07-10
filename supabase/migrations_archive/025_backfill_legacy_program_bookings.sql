-- Backfill enrollment_lead_children for legacy leads that have a student name
INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
SELECT
  el.lead_id,
  el.student_name,
  COALESCE(el.student_age, 8),
  CASE WHEN COALESCE(el.student_age, 8) BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END
FROM enrollment_leads el
WHERE el.booking_token IS NOT NULL
  AND el.student_name IS NOT NULL
  AND el.status NOT IN ('denied')
  AND el.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM enrollment_lead_program_bookings pb WHERE pb.lead_id = el.lead_id)
  AND NOT EXISTS (SELECT 1 FROM enrollment_lead_children c WHERE c.lead_id = el.lead_id);

-- Backfill enrollment_lead_program_bookings for legacy leads, preserving the
-- existing booking_token so already-sent emails continue to work
INSERT INTO public.enrollment_lead_program_bookings
  (lead_id, program_type, booking_token, appointment_date, appointment_time, status)
SELECT
  el.lead_id,
  CASE WHEN COALESCE(el.student_age, 8) BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END,
  el.booking_token,
  el.appointment_date,
  el.appointment_time,
  CASE el.status
    WHEN 'appointment_scheduled' THEN 'scheduled'
    WHEN 'appointment_confirmed' THEN 'confirmed'
    ELSE 'link_sent'
  END
FROM enrollment_leads el
WHERE el.booking_token IS NOT NULL
  AND el.status NOT IN ('denied')
  AND el.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM enrollment_lead_program_bookings pb WHERE pb.lead_id = el.lead_id);

-- Fix new-flow leads whose program bookings have null booking_token
-- (caused by approve-enrollment-lead not being redeployed after multi-child changes).
-- Uses a CTE so we can also queue re-approval emails for the affected leads in one shot.
WITH fixed_bookings AS (
  UPDATE public.enrollment_lead_program_bookings
  SET booking_token = gen_random_uuid(), status = 'link_sent'
  WHERE booking_token IS NULL AND status = 'pending'
  RETURNING lead_id
)
INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
SELECT DISTINCT fl.lead_id, el.parent_email, 'email', 'approval', 'queued'
FROM fixed_bookings fl
JOIN enrollment_leads el ON el.lead_id = fl.lead_id
WHERE NOT EXISTS (
  SELECT 1 FROM enrollment_lead_notifications n
  WHERE n.lead_id = fl.lead_id AND n.type = 'approval' AND n.status = 'queued'
);
