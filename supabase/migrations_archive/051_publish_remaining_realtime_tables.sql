-- Add the remaining tables that src/lib/supabase/realtime.ts subscribes to
-- into the realtime publication so those postgres_changes subscriptions
-- actually receive events. Guarded so re-running is a no-op.

do $$
declare
  t text;
  tables text[] := array[
    'messages',
    'conversations',
    'announcements',
    'announcement_comments',
    'blog_posts',
    'blog_comments',
    'reviews',
    'user_notifications'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
