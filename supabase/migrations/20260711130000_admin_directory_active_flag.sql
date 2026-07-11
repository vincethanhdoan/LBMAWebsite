-- Notification recipients UI needs to exclude deactivated and pending admins.
DROP FUNCTION IF EXISTS public.get_admin_emails();
CREATE FUNCTION public.get_admin_emails()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  is_active boolean,
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
    SELECT p.user_id, u.email::text, p.display_name, p.is_active, u.last_sign_in_at, re.invited_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN public.registered_emails re ON re.email = lower(u.email)
    WHERE p.role = 'admin'
    ORDER BY p.display_name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated, service_role;
