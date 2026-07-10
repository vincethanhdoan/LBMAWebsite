-- Add enrollment_leads to the realtime publication so admin subscribers
-- receive lead changes; the table was missing from supabase_realtime.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enrollment_leads'
  ) then
    alter publication supabase_realtime add table public.enrollment_leads;
  end if;
end $$;
