-- allow 'reschedule' (sorry-we-missed-you) emails in the lead notification outbox

ALTER TABLE enrollment_lead_notifications
  DROP CONSTRAINT IF EXISTS enrollment_lead_notifications_type_check;
ALTER TABLE enrollment_lead_notifications
  ADD CONSTRAINT enrollment_lead_notifications_type_check
  CHECK (type = ANY (ARRAY[
    'new_lead'::text,
    'submission'::text,
    'approval'::text,
    'denial'::text,
    'booking_confirmation'::text,
    'reminder'::text,
    'reschedule'::text
  ]));
