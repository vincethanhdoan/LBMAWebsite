-- Create or return an existing direct-message conversation for two users.
-- Runs as SECURITY DEFINER to avoid client-side RLS insert failures while still enforcing role pairing rules.

CREATE OR REPLACE FUNCTION public.create_or_get_dm_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_id UUID := auth.uid();
  requester_role TEXT;
  other_role TEXT;
  existing_conversation_id UUID;
  new_conversation_id UUID;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF other_user_id IS NULL OR requester_id = other_user_id THEN
    RAISE EXCEPTION 'Invalid direct-message target';
  END IF;

  SELECT role INTO requester_role FROM public.profiles WHERE user_id = requester_id;
  SELECT role INTO other_role FROM public.profiles WHERE user_id = other_user_id;

  IF requester_role IS NULL OR other_role IS NULL THEN
    RAISE EXCEPTION 'Both users must have profiles';
  END IF;

  IF NOT is_family_to_staff_pair(requester_id, other_user_id) THEN
    RAISE EXCEPTION 'Direct messaging is not allowed for this user pair';
  END IF;

  SELECT c.conversation_id
  INTO existing_conversation_id
  FROM public.conversations c
  JOIN public.conversation_members cm1
    ON cm1.conversation_id = c.conversation_id AND cm1.user_id = requester_id
  JOIN public.conversation_members cm2
    ON cm2.conversation_id = c.conversation_id AND cm2.user_id = other_user_id
  WHERE c.type = 'dm'
    AND (
      SELECT COUNT(*)
      FROM public.conversation_members cm
      WHERE cm.conversation_id = c.conversation_id
    ) = 2
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  INSERT INTO public.conversations (type, created_by)
  VALUES ('dm', requester_id)
  RETURNING conversation_id INTO new_conversation_id;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (new_conversation_id, requester_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (new_conversation_id, other_user_id)
  ON CONFLICT DO NOTHING;

  RETURN new_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_dm_conversation(UUID) TO authenticated;
