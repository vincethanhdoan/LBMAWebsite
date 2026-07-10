-- supabase/migrations/040_handle_new_user_invitation_status_guard.sql
-- Guard the handle_new_user trigger's role lookup so it only reads
-- invited_as_role when invitation_status = 'invited' (not already claimed).
-- Falls back to 'family' if the email has no pending invitation row.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT COALESCE(invited_as_role, 'family') INTO v_role
  FROM public.registered_emails
  WHERE email = lower(trim(NEW.email))
    AND invitation_status = 'invited';

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
