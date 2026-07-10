-- supabase/migrations/038_enrollment_lead_soft_delete_rls.sql
-- Exclude soft-deleted leads from the admin SELECT policy so that
-- leads marked deleted_at IS NOT NULL are not visible in the admin UI.

DROP POLICY IF EXISTS "Admins can view enrollment leads" ON public.enrollment_leads;

CREATE POLICY "Admins can view enrollment leads"
  ON public.enrollment_leads FOR SELECT
  USING (is_admin(auth.uid()) AND deleted_at IS NULL);
