-- Add enrollment lead child tables to the realtime publication so admin
-- subscribers receive program-booking and notification-status changes.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enrollment_lead_program_bookings'
  ) then
    alter publication supabase_realtime add table public.enrollment_lead_program_bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enrollment_lead_notifications'
  ) then
    alter publication supabase_realtime add table public.enrollment_lead_notifications;
  end if;
end $$;
