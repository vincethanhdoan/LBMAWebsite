-- 018_submission_notification_and_admin_emails.sql
-- Extends notification type to include 'submission' (thank-you to prospect on form submit).
-- Adds get_admin_emails() RPC for the admin notification recipient picker UI.
-- Updates submit_enrollment_lead to insert a 'submission' notification to the prospect.

-- ============================================
-- Extend type constraint to include 'submission'
-- ============================================

ALTER TABLE public.enrollment_lead_notifications
  DROP CONSTRAINT IF EXISTS enrollment_lead_notifications_type_check;

ALTER TABLE public.enrollment_lead_notifications
  ADD CONSTRAINT enrollment_lead_notifications_type_check
  CHECK (type IN ('new_lead', 'submission', 'approval', 'denial', 'booking_confirmation', 'reminder'));

-- ============================================
-- get_admin_emails: returns email + display_name for all admin users
-- Used by the notification recipient picker in admin settings UI.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, u.email::TEXT, p.display_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.role = 'admin'
  ORDER BY p.display_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated;

-- ============================================
-- Update submit_enrollment_lead to also insert a 'submission' notification to prospect
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_enrollment_lead(
  p_parent_name TEXT,
  p_parent_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_student_name TEXT DEFAULT NULL,
  p_student_age INTEGER DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_source_page TEXT DEFAULT 'contact'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_parent_name TEXT := trim(p_parent_name);
  v_parent_email TEXT := lower(trim(p_parent_email));
  v_phone TEXT := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_student_name TEXT := NULLIF(trim(COALESCE(p_student_name, '')), '');
  v_message TEXT := NULLIF(trim(COALESCE(p_message, '')), '');
  v_source_page TEXT := COALESCE(NULLIF(trim(COALESCE(p_source_page, '')), ''), 'contact');
  v_notification_recipient TEXT;
BEGIN
  IF v_parent_name = '' OR v_parent_email = '' THEN
    RAISE EXCEPTION 'Parent name and email are required';
  END IF;

  v_notification_recipient := lower(
    COALESCE(
      NULLIF(trim(current_setting('app.lbmaa_faculty_notification_email', true)), ''),
      'vincethanhdoan@gmail.com'
    )
  );

  INSERT INTO public.enrollment_leads (
    parent_name,
    parent_email,
    phone,
    student_name,
    student_age,
    message,
    source_page,
    notification_status,
    notified_at
  )
  VALUES (
    v_parent_name,
    v_parent_email,
    v_phone,
    v_student_name,
    p_student_age,
    v_message,
    v_source_page,
    'queued',
    NOW()
  )
  RETURNING lead_id INTO v_lead_id;

  -- Admin new_lead notification
  INSERT INTO public.enrollment_lead_notifications (
    lead_id,
    recipient_email,
    channel,
    type,
    status
  )
  VALUES (
    v_lead_id,
    v_notification_recipient,
    'email',
    'new_lead',
    'queued'
  );

  -- Prospect submission confirmation (thank-you email)
  INSERT INTO public.enrollment_lead_notifications (
    lead_id,
    recipient_email,
    channel,
    type,
    status
  )
  VALUES (
    v_lead_id,
    v_parent_email,
    'email',
    'submission',
    'queued'
  );

  RETURN v_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
