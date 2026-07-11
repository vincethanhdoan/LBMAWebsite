-- edit lead details and sync children

CREATE OR REPLACE FUNCTION public.update_enrollment_lead(
  p_lead_id uuid,
  p_parent_name text,
  p_parent_email text,
  p_phone text,
  p_children jsonb  -- [{ "child_id": "uuid-or-null", "name": "...", "age": 7 }]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_child jsonb;
  v_keep uuid[] := '{}';
  v_id uuid;
  v_age integer;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_parent_name IS NULL OR btrim(p_parent_name) = '' THEN RAISE EXCEPTION 'parent_name is required'; END IF;
  IF p_parent_email IS NULL OR btrim(p_parent_email) = '' THEN RAISE EXCEPTION 'parent_email is required'; END IF;
  IF p_children IS NULL OR jsonb_array_length(p_children) < 1 THEN RAISE EXCEPTION 'at least one child is required'; END IF;

  UPDATE enrollment_leads SET
    parent_name = btrim(p_parent_name),
    parent_email = lower(btrim(p_parent_email)),
    phone = NULLIF(btrim(COALESCE(p_phone, '')), '')
  WHERE lead_id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;

  FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
    v_age := (v_child->>'age')::integer;
    IF v_age < 4 OR v_age > 17 THEN RAISE EXCEPTION 'child age must be between 4 and 17'; END IF;
    IF v_child->>'name' IS NULL OR btrim(v_child->>'name') = '' THEN RAISE EXCEPTION 'child name is required'; END IF;
    IF v_child->>'child_id' IS NOT NULL THEN
      UPDATE enrollment_lead_children SET
        name = btrim(v_child->>'name'),
        age = v_age,
        program_type = CASE WHEN v_age BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END
      WHERE child_id = (v_child->>'child_id')::uuid AND lead_id = p_lead_id
      RETURNING child_id INTO v_id;
      IF v_id IS NULL THEN RAISE EXCEPTION 'child not found on this lead'; END IF;
    ELSE
      INSERT INTO enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (p_lead_id, btrim(v_child->>'name'), v_age,
              CASE WHEN v_age BETWEEN 4 AND 7 THEN 'little_dragons' ELSE 'youth' END)
      RETURNING child_id INTO v_id;
    END IF;
    v_keep := array_append(v_keep, v_id);
  END LOOP;

  DELETE FROM enrollment_lead_children
  WHERE lead_id = p_lead_id AND NOT (child_id = ANY (v_keep));
END $$;

REVOKE EXECUTE ON FUNCTION public.update_enrollment_lead(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_enrollment_lead(uuid, text, text, text, jsonb) TO authenticated;
