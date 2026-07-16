-- R3: deactivation blocks all API access. Revoke the deactivated user's sessions
-- and gate messaging/ownership RLS on the *current* user being active. The DM
-- counterparty is intentionally unaffected (is_family_to_staff_pair untouched) so
-- deactivating one party preserves the other party's access to shared history.

-- 1) Current-user active check (role-agnostic sibling of is_admin/is_owner).
CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_active); $$;

GRANT EXECUTE ON FUNCTION public.current_user_is_active() TO anon, authenticated, service_role;

-- 2) A deactivated user is no longer a "member" for access purposes. Called only
--    with auth.uid(), so this gates the current user; the counterparty's own
--    membership check (with their uid) is unaffected.
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = user_uuid
  ) AND EXISTS (
    SELECT 1 FROM profiles WHERE user_id = user_uuid AND is_active
  );
END;
$function$;

-- 3) Gate the ownership + message-author policies on the current user being active.
ALTER POLICY "Users can view their own family" ON public.families
  USING ((owner_user_id = auth.uid()) AND current_user_is_active());
ALTER POLICY "Users can update their own family" ON public.families
  USING ((owner_user_id = auth.uid()) AND current_user_is_active());

ALTER POLICY "Users can manage guardians of their family" ON public.guardians
  USING ((EXISTS (SELECT 1 FROM families WHERE families.family_id = guardians.family_id AND families.owner_user_id = auth.uid())) AND current_user_is_active());
ALTER POLICY "Users can view guardians of their family" ON public.guardians
  USING ((EXISTS (SELECT 1 FROM families WHERE families.family_id = guardians.family_id AND families.owner_user_id = auth.uid())) AND current_user_is_active());

ALTER POLICY "Users can manage students of their family" ON public.students
  USING ((EXISTS (SELECT 1 FROM families WHERE families.family_id = students.family_id AND families.owner_user_id = auth.uid())) AND current_user_is_active());
ALTER POLICY "Users can view students of their family" ON public.students
  USING ((EXISTS (SELECT 1 FROM families WHERE families.family_id = students.family_id AND families.owner_user_id = auth.uid())) AND current_user_is_active());

ALTER POLICY "Users can delete their own messages" ON public.messages
  USING ((author_user_id = auth.uid()) AND current_user_is_active());
ALTER POLICY "Users can update their own messages" ON public.messages
  USING ((author_user_id = auth.uid()) AND current_user_is_active());

-- 4) Revoke the target's auth sessions on deactivation (kills refresh; RLS above
--    denies the still-valid access token immediately). Body otherwise unchanged.
CREATE OR REPLACE FUNCTION public.deactivate_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
END;
$function$;
