-- supabase/migrations/033_owner_role.sql

-- 1. Add is_owner column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false;

-- 2. Add invited_as_role to registered_emails
ALTER TABLE public.registered_emails
  ADD COLUMN IF NOT EXISTS invited_as_role TEXT NOT NULL DEFAULT 'family'
    CHECK (invited_as_role IN ('family', 'admin'));

-- 3. is_owner() helper (mirrors is_admin pattern)
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_uuid AND is_owner = true
  );
$$;

-- 4. Update handle_new_user trigger to read invited_as_role
--    Previously hardcoded role = 'family'. Now reads from registered_emails.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT COALESCE(invited_as_role, 'family') INTO v_role
  FROM public.registered_emails
  WHERE email = lower(trim(NEW.email));

  INSERT INTO public.profiles (user_id, role, display_name)
  VALUES (
    NEW.id,
    COALESCE(v_role, 'family'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.registered_emails (email, claimed_at, invitation_status)
  VALUES (lower(trim(NEW.email)), NOW(), 'active')
  ON CONFLICT (email) DO UPDATE
    SET claimed_at = COALESCE(public.registered_emails.claimed_at, EXCLUDED.claimed_at),
        invitation_status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. RPC: deactivate an admin account (owner only)
CREATE OR REPLACE FUNCTION public.deactivate_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot deactivate your own account';
  END IF;
  UPDATE public.profiles
  SET is_active = false, deactivated_at = NOW()
  WHERE user_id = target_user_id AND role = 'admin';
END;
$$;

-- 6. RPC: reactivate an admin account (owner only)
CREATE OR REPLACE FUNCTION public.reactivate_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;
  UPDATE public.profiles
  SET is_active = true, deactivated_at = NULL
  WHERE user_id = target_user_id AND role = 'admin';
END;
$$;

-- 7. RPC: grant or revoke owner status (owner only, last-owner guard)
CREATE OR REPLACE FUNCTION public.set_admin_owner_status(target_user_id UUID, make_owner BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_count INT;
BEGIN
  IF NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;
  IF NOT make_owner THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM (
      SELECT 1 FROM public.profiles
      WHERE is_owner = true AND is_active = true AND role = 'admin'
      FOR UPDATE
    ) sub;
    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last owner';
    END IF;
  END IF;
  UPDATE public.profiles
  SET is_owner = make_owner
  WHERE user_id = target_user_id AND role = 'admin';
END;
$$;

-- 8. Grant execute on RPCs to authenticated role
GRANT EXECUTE ON FUNCTION public.is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_owner_status(UUID, BOOLEAN) TO authenticated;

-- 9. Bootstrap: seed vincethanhdoan@gmail.com as owner
UPDATE public.profiles
SET is_owner = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'vincethanhdoan@gmail.com'
);
