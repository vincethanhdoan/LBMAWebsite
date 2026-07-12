-- Add enrollment_lead_children to the realtime publication so admin lead
-- lists invalidate when another admin edits a lead's children.
-- Idempotent, same pattern as the baseline publication block.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='enrollment_lead_children') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_lead_children; END IF;
END $$;
