-- Atomically sets exactly one guardian as primary contact for a family.
-- Clears is_primary_contact on all other guardians in the same family.
-- Only callable by admins.

CREATE OR REPLACE FUNCTION set_primary_guardian(p_guardian_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  IF NOT is_admin() THEN
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
$$;

GRANT EXECUTE ON FUNCTION set_primary_guardian TO authenticated;
