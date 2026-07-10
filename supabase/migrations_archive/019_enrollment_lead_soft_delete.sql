alter table enrollment_leads
  add column if not exists deleted_at timestamptz null;
