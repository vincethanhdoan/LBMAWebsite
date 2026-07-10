-- Restrict get_admin_emails() to admin callers only.
-- Previously callable by any authenticated user, exposing admin PII to family users.

CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT p.user_id, u.email::TEXT, p.display_name
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.role = 'admin'
    ORDER BY p.display_name;
END;
$$;

-- Any authenticated user can attempt the call; access is enforced at runtime via is_admin() above
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated;
