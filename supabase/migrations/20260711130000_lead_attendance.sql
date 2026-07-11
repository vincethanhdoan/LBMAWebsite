-- record whether the family attended their appointment
ALTER TABLE enrollment_leads
  ADD COLUMN IF NOT EXISTS attendance_status text
    CHECK (attendance_status IN ('attended', 'no_show')),
  ADD COLUMN IF NOT EXISTS attendance_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_recorded_by uuid;
