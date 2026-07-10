-- Public enrollment lead capture + faculty notification queue

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.enrollment_leads (
  lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  phone TEXT,
  student_name TEXT,
  student_age INTEGER,
  message TEXT NOT NULL,
  source_page TEXT NOT NULL DEFAULT 'contact',
  notification_status TEXT NOT NULL DEFAULT 'queued',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrollment_leads_parent_name_min_len CHECK (length(trim(parent_name)) >= 2),
  CONSTRAINT enrollment_leads_parent_email_min_len CHECK (length(trim(parent_email)) >= 5),
  CONSTRAINT enrollment_leads_student_age_range CHECK (student_age IS NULL OR (student_age >= 3 AND student_age <= 99)),
  CONSTRAINT enrollment_leads_notification_status_check CHECK (notification_status IN ('queued', 'sent', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.enrollment_lead_notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.enrollment_leads(lead_id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrollment_lead_notifications_channel_check CHECK (channel IN ('email')),
  CONSTRAINT enrollment_lead_notifications_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_enrollment_leads_created_at
  ON public.enrollment_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollment_leads_notification_status
  ON public.enrollment_leads(notification_status);

CREATE INDEX IF NOT EXISTS idx_enrollment_lead_notifications_lead_id
  ON public.enrollment_lead_notifications(lead_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_lead_notifications_status
  ON public.enrollment_lead_notifications(status);

-- ============================================
-- RPC (PUBLIC SUBMIT)
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
  v_notification_recipient TEXT;
  v_parent_name TEXT := trim(COALESCE(p_parent_name, ''));
  v_parent_email TEXT := lower(trim(COALESCE(p_parent_email, '')));
  v_phone TEXT := NULLIF(trim(COALESCE(p_phone, '')), '');
  v_student_name TEXT := NULLIF(trim(COALESCE(p_student_name, '')), '');
  v_message TEXT := NULLIF(trim(COALESCE(p_message, '')), '');
  v_source_page TEXT := NULLIF(trim(COALESCE(p_source_page, '')), '');
BEGIN
  IF length(v_parent_name) < 2 THEN
    RAISE EXCEPTION 'Parent name must be at least 2 characters.';
  END IF;

  IF length(v_parent_email) < 5 OR position('@' IN v_parent_email) <= 1 THEN
    RAISE EXCEPTION 'Please provide a valid email.';
  END IF;

  IF p_student_age IS NOT NULL AND (p_student_age < 3 OR p_student_age > 99) THEN
    RAISE EXCEPTION 'Student age must be between 3 and 99.';
  END IF;

  IF v_source_page IS NULL THEN
    v_source_page := 'contact';
  END IF;

  IF v_message IS NULL THEN
    v_message := 'Enrollment lead submitted from public website.';
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

  INSERT INTO public.enrollment_lead_notifications (
    lead_id,
    recipient_email,
    channel,
    status
  )
  VALUES (
    v_lead_id,
    v_notification_recipient,
    'email',
    'queued'
  );

  RETURN v_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.enrollment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_lead_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view enrollment leads" ON public.enrollment_leads;
CREATE POLICY "Admins can view enrollment leads"
  ON public.enrollment_leads FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update enrollment leads" ON public.enrollment_leads;
CREATE POLICY "Admins can update enrollment leads"
  ON public.enrollment_leads FOR UPDATE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view enrollment lead notifications" ON public.enrollment_lead_notifications;
CREATE POLICY "Admins can view enrollment lead notifications"
  ON public.enrollment_lead_notifications FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update enrollment lead notifications" ON public.enrollment_lead_notifications;
CREATE POLICY "Admins can update enrollment lead notifications"
  ON public.enrollment_lead_notifications FOR UPDATE
  USING (is_admin(auth.uid()));

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, UPDATE ON public.enrollment_leads TO authenticated;
GRANT SELECT, UPDATE ON public.enrollment_lead_notifications TO authenticated;
