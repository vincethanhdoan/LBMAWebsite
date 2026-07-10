-- Track admin-owned invite registration and expose a secure preregistration RPC.

ALTER TABLE public.registered_emails
  ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registered_emails_invitation_status_check'
      AND conrelid = 'public.registered_emails'::regclass
  ) THEN
    ALTER TABLE public.registered_emails
      ADD CONSTRAINT registered_emails_invitation_status_check
      CHECK (invitation_status IN ('invited', 'active'));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.register_invited_email(invited_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(trim(COALESCE(invited_email, '')));
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF length(normalized_email) < 5 OR position('@' IN normalized_email) <= 1 THEN
    RAISE EXCEPTION 'Please provide a valid email.';
  END IF;

  INSERT INTO public.registered_emails (email, invited_by_user_id, invited_at, invitation_status)
  VALUES (normalized_email, auth.uid(), NOW(), 'invited')
  ON CONFLICT (email) DO UPDATE
    SET invited_by_user_id = EXCLUDED.invited_by_user_id,
        invited_at = EXCLUDED.invited_at,
        invitation_status = CASE
          WHEN public.registered_emails.claimed_at IS NULL THEN 'invited'
          ELSE public.registered_emails.invitation_status
        END;

  RETURN normalized_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_invited_email(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name)
  VALUES (NEW.id, 'family', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.registered_emails (email, claimed_at, invitation_status)
  VALUES (lower(trim(NEW.email)), NOW(), 'active')
  ON CONFLICT (email) DO UPDATE
    SET claimed_at = COALESCE(public.registered_emails.claimed_at, EXCLUDED.claimed_at),
        invitation_status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
