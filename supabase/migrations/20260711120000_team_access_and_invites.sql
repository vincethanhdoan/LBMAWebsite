-- Deactivated accounts must lose API access (MVP requirement R3).
-- Every caller passes auth.uid(); messaging pair validation uses profiles.role
-- directly, so tightening these does not affect DM history visibility.
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uuid AND role = 'admin' AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_uuid AND is_owner = true AND is_active = true
  );
$$;

-- Return type changes, so DROP + CREATE + explicit re-grant.
DROP FUNCTION IF EXISTS public.get_admin_emails();
CREATE FUNCTION public.get_admin_emails()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  last_sign_in_at timestamptz,
  invited_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT p.user_id, u.email::text, p.display_name, u.last_sign_in_at, re.invited_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN public.registered_emails re ON re.email = lower(u.email)
    WHERE p.role = 'admin'
    ORDER BY p.display_name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated, service_role;

-- Service-role-only lookup used by the invite-admin edge function to give
-- precise 409s instead of corrupting registered_emails on duplicate invites.
CREATE OR REPLACE FUNCTION public.admin_lookup_email(p_email text)
RETURNS TABLE(user_id uuid, role text, is_active boolean, has_signed_in boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.role, p.is_active, u.last_sign_in_at IS NOT NULL
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(trim(p_email));
$$;
REVOKE ALL ON FUNCTION public.admin_lookup_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lookup_email(text) TO service_role;

-- Live admin-list updates for concurrently open owner sessions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END;
$$;
