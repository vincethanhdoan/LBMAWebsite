-- set_primary_guardian called is_admin() with no arguments, but only
-- is_admin(uuid) exists, so every invocation raised at runtime and the
-- admin "make primary guardian" action has never worked. Pass auth.uid().

CREATE OR REPLACE FUNCTION public.set_primary_guardian(p_guardian_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_family_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT family_id INTO v_family_id
  FROM guardians
  WHERE guardian_id = p_guardian_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Guardian not found';
  END IF;

  UPDATE guardians
  SET is_primary_contact = (guardian_id = p_guardian_id),
      updated_at = NOW()
  WHERE family_id = v_family_id;
END;
$function$;
