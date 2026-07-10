-- supabase/migrations/019_enrollment_lead_admin_notes.sql
alter table enrollment_leads
  add column if not exists admin_notes text;
