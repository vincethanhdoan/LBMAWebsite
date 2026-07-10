-- admin portal overhaul: schema groundwork

-- 1. allow cancelled program bookings
ALTER TABLE enrollment_lead_program_bookings DROP CONSTRAINT IF EXISTS enrollment_lead_program_bookings_status_check;
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'link_sent'::text, 'scheduled'::text, 'confirmed'::text, 'cancelled'::text]));

-- 2. slot duration (source of truth for end_time going forward)
ALTER TABLE appointment_slots ADD COLUMN IF NOT EXISTS duration_minutes integer;
UPDATE appointment_slots
SET duration_minutes = LEAST(240, GREATEST(15, (ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 900) * 15)::integer))
WHERE duration_minutes IS NULL;
ALTER TABLE appointment_slots ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE appointment_slots ALTER COLUMN duration_minutes SET DEFAULT 60;
ALTER TABLE appointment_slots DROP CONSTRAINT IF EXISTS appointment_slots_duration_check;
ALTER TABLE appointment_slots ADD CONSTRAINT appointment_slots_duration_check
  CHECK (duration_minutes >= 15 AND duration_minutes <= 240 AND duration_minutes % 15 = 0);

-- 3. lead event notification types
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
  CHECK (type = ANY (ARRAY['comment_reply'::text, 'post_comment'::text, 'new_lead'::text, 'appointment_booked'::text, 'appointment_confirmed'::text]));
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_reference_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_reference_type_check
  CHECK (reference_type = ANY (ARRAY['announcement_comment'::text, 'blog_comment'::text, 'enrollment_lead'::text]));

-- 4. admins can see archived leads (client filters deleted_at explicitly)
DROP POLICY IF EXISTS "Admins can view enrollment leads" ON enrollment_leads;
CREATE POLICY "Admins can view enrollment leads" ON public.enrollment_leads AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

-- 5. supporting indexes
CREATE INDEX IF NOT EXISTS idx_bookings_slot_date ON enrollment_lead_program_bookings (appointment_slot_id, appointment_date)
  WHERE status IN ('scheduled', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON enrollment_leads (status, created_at DESC);
