-- LBMAA schema baseline
-- Introspected from the live Supabase database on 2026-07-10.
-- Single source-of-truth migration: recreates the full public schema (tables,
-- constraints, indexes, functions, triggers, RLS policies), storage buckets and
-- policies, realtime publication membership, and the appointment-reminder cron
-- job. Supersedes the archived 000-051 migrations, which no longer replay.
--
-- Deliberately omitted (see migrations_archive/README and rebaseline report):
--   * the "send-message-notification" webhook trigger on public.messages
--     (Supabase dashboard-managed database webhook; embeds a webhook secret).
--   * platform-managed extensions pg_stat_statements and supabase_vault.

SET check_function_bodies = false;

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- Tables -----------------------------------------------------------------

CREATE TABLE admin_notification_preferences (
    user_id uuid NOT NULL,
    notify_messages boolean NOT NULL DEFAULT true,
    notify_blog_posts boolean NOT NULL DEFAULT true,
    notify_comment_replies boolean NOT NULL DEFAULT true,
    notify_post_comments boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE admin_notification_settings (
    setting_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email text NOT NULL,
    notify_new_leads boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE announcement_comments (
    comment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    announcement_id uuid NOT NULL,
    author_user_id uuid NOT NULL DEFAULT auth.uid(),
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_comment_id uuid
);

CREATE TABLE announcements (
    announcement_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    author_user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    image_url text
);

CREATE TABLE appointment_slots (
    slot_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    label text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    week_of_month integer,
    program_type text NOT NULL DEFAULT 'all'::text
);

CREATE TABLE blocked_dates (
    block_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE blog_comments (
    comment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    post_id uuid NOT NULL,
    author_user_id uuid NOT NULL DEFAULT auth.uid(),
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_comment_id uuid
);

CREATE TABLE blog_posts (
    post_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    author_user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE conversation_members (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone DEFAULT now()
);

CREATE TABLE conversations (
    conversation_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    type text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    hidden boolean NOT NULL DEFAULT false
);

CREATE TABLE enrollment_lead_children (
    child_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    lead_id uuid NOT NULL,
    name text NOT NULL,
    age integer NOT NULL,
    program_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE enrollment_lead_notifications (
    notification_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    lead_id uuid NOT NULL,
    recipient_email text NOT NULL,
    channel text NOT NULL DEFAULT 'email'::text,
    status text NOT NULL DEFAULT 'queued'::text,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    type text NOT NULL DEFAULT 'new_lead'::text
);

CREATE TABLE enrollment_lead_program_bookings (
    booking_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    lead_id uuid NOT NULL,
    program_type text NOT NULL,
    booking_token uuid,
    appointment_slot_id uuid,
    appointment_date date,
    appointment_time time without time zone,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE enrollment_leads (
    lead_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_name text NOT NULL,
    parent_email text NOT NULL,
    phone text,
    student_name text,
    student_age integer,
    message text,
    source_page text NOT NULL DEFAULT 'contact'::text,
    notification_status text NOT NULL DEFAULT 'queued'::text,
    notified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'new'::text,
    approved_at timestamp with time zone,
    approval_email_sent_at timestamp with time zone,
    booking_token uuid,
    appointment_date date,
    appointment_time time without time zone,
    denied_at timestamp with time zone,
    denial_message text,
    admin_notes text,
    deleted_at timestamp with time zone
);

CREATE TABLE families (
    family_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    owner_user_id uuid NOT NULL,
    primary_email text NOT NULL,
    address text,
    city text,
    state text,
    zip text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_status text NOT NULL DEFAULT 'active'::text,
    deactivated_at timestamp with time zone
);

CREATE TABLE feedback_tests (
    test_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    test_date date NOT NULL,
    test_time time without time zone,
    description text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE guardians (
    guardian_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    family_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone_number text,
    relationship text,
    is_primary_contact boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE message_attachments (
    attachment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    size_bytes bigint,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE messages (
    message_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE portal_email_queue (
    queue_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    recipient_email text NOT NULL,
    type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'queued'::text,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id uuid NOT NULL,
    role text NOT NULL,
    display_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true,
    deactivated_at timestamp with time zone,
    avatar_url text,
    is_owner boolean NOT NULL DEFAULT false
);

CREATE TABLE registered_emails (
    email text NOT NULL,
    invited_by_user_id uuid,
    invited_at timestamp with time zone,
    claimed_at timestamp with time zone,
    invitation_status text NOT NULL DEFAULT 'active'::text,
    invited_as_role text NOT NULL DEFAULT 'family'::text
);

CREATE TABLE reviews (
    review_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    family_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    rating integer NOT NULL,
    review text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    display_name text
);

CREATE TABLE student_feedback (
    feedback_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    test_id uuid NOT NULL
);

CREATE TABLE students (
    student_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    family_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date,
    belt_level text,
    status text NOT NULL DEFAULT 'active'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    photo_url text
);

CREATE TABLE user_notification_preferences (
    user_id uuid NOT NULL,
    notify_messages boolean NOT NULL DEFAULT true,
    notify_announcements boolean NOT NULL DEFAULT true,
    notify_blog_posts boolean NOT NULL DEFAULT false,
    notify_comment_replies boolean NOT NULL DEFAULT true,
    notify_post_comments boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE user_notifications (
    notification_id uuid NOT NULL DEFAULT uuid_generate_v4(),
    recipient_user_id uuid NOT NULL,
    type text NOT NULL,
    reference_id uuid NOT NULL,
    reference_type text NOT NULL,
    actor_display_name text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE user_section_last_seen (
    user_id uuid NOT NULL,
    section text NOT NULL,
    last_seen_at timestamp with time zone NOT NULL DEFAULT now()
);


-- Constraints ------------------------------------------------------------

ALTER TABLE admin_notification_preferences ADD CONSTRAINT admin_notification_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE admin_notification_settings ADD CONSTRAINT admin_notification_settings_pkey PRIMARY KEY (setting_id);
ALTER TABLE announcement_comments ADD CONSTRAINT announcement_comments_pkey PRIMARY KEY (comment_id);
ALTER TABLE announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (announcement_id);
ALTER TABLE appointment_slots ADD CONSTRAINT appointment_slots_pkey PRIMARY KEY (slot_id);
ALTER TABLE blocked_dates ADD CONSTRAINT blocked_dates_pkey PRIMARY KEY (block_id);
ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_pkey PRIMARY KEY (comment_id);
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (post_id);
ALTER TABLE conversation_members ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (conversation_id, user_id);
ALTER TABLE conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id);
ALTER TABLE enrollment_lead_children ADD CONSTRAINT enrollment_lead_children_pkey PRIMARY KEY (child_id);
ALTER TABLE enrollment_lead_notifications ADD CONSTRAINT enrollment_lead_notifications_pkey PRIMARY KEY (notification_id);
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_pkey PRIMARY KEY (booking_id);
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_pkey PRIMARY KEY (lead_id);
ALTER TABLE families ADD CONSTRAINT families_pkey PRIMARY KEY (family_id);
ALTER TABLE feedback_tests ADD CONSTRAINT feedback_tests_pkey PRIMARY KEY (test_id);
ALTER TABLE guardians ADD CONSTRAINT guardians_pkey PRIMARY KEY (guardian_id);
ALTER TABLE message_attachments ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (attachment_id);
ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);
ALTER TABLE portal_email_queue ADD CONSTRAINT portal_email_queue_pkey PRIMARY KEY (queue_id);
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);
ALTER TABLE registered_emails ADD CONSTRAINT registered_emails_pkey PRIMARY KEY (email);
ALTER TABLE reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);
ALTER TABLE student_feedback ADD CONSTRAINT student_feedback_pkey PRIMARY KEY (feedback_id);
ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);
ALTER TABLE user_notification_preferences ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (notification_id);
ALTER TABLE user_section_last_seen ADD CONSTRAINT user_section_last_seen_pkey PRIMARY KEY (user_id, section);
ALTER TABLE admin_notification_settings ADD CONSTRAINT admin_notification_settings_email_key UNIQUE (email);
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_booking_token_key UNIQUE (booking_token);
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_lead_id_program_type_key UNIQUE (lead_id, program_type);
ALTER TABLE reviews ADD CONSTRAINT reviews_family_id_author_user_id_key UNIQUE (family_id, author_user_id);
ALTER TABLE appointment_slots ADD CONSTRAINT appointment_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE appointment_slots ADD CONSTRAINT appointment_slots_program_type_check CHECK ((program_type = ANY (ARRAY['little_dragons'::text, 'youth'::text, 'all'::text])));
ALTER TABLE appointment_slots ADD CONSTRAINT appointment_slots_week_of_month_check CHECK ((week_of_month = ANY (ARRAY['-1'::integer, 1, 2, 3, 4])));
ALTER TABLE blocked_dates ADD CONSTRAINT blocked_dates_check CHECK ((end_date >= start_date));
ALTER TABLE conversations ADD CONSTRAINT conversations_type_check CHECK ((type = ANY (ARRAY['global'::text, 'dm'::text])));
ALTER TABLE enrollment_lead_children ADD CONSTRAINT children_age_range CHECK (((age >= 4) AND (age <= 17)));
ALTER TABLE enrollment_lead_children ADD CONSTRAINT enrollment_lead_children_program_type_check CHECK ((program_type = ANY (ARRAY['little_dragons'::text, 'youth'::text])));
ALTER TABLE enrollment_lead_notifications ADD CONSTRAINT enrollment_lead_notifications_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text])));
ALTER TABLE enrollment_lead_notifications ADD CONSTRAINT enrollment_lead_notifications_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text])));
ALTER TABLE enrollment_lead_notifications ADD CONSTRAINT enrollment_lead_notifications_type_check CHECK ((type = ANY (ARRAY['new_lead'::text, 'submission'::text, 'approval'::text, 'denial'::text, 'booking_confirmation'::text, 'reminder'::text])));
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_program_type_check CHECK ((program_type = ANY (ARRAY['little_dragons'::text, 'youth'::text])));
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'link_sent'::text, 'scheduled'::text, 'confirmed'::text])));
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_notification_status_check CHECK ((notification_status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text])));
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_parent_email_min_len CHECK ((length(TRIM(BOTH FROM parent_email)) >= 5));
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_parent_name_min_len CHECK ((length(TRIM(BOTH FROM parent_name)) >= 2));
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'approved'::text, 'appointment_scheduled'::text, 'appointment_confirmed'::text, 'denied'::text, 'enrolled'::text, 'closed'::text])));
ALTER TABLE enrollment_leads ADD CONSTRAINT enrollment_leads_student_age_range CHECK (((student_age IS NULL) OR ((student_age >= 3) AND (student_age <= 99))));
ALTER TABLE families ADD CONSTRAINT families_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])));
ALTER TABLE feedback_tests ADD CONSTRAINT feedback_tests_title_min_len CHECK ((length(TRIM(BOTH FROM title)) >= 2));
ALTER TABLE message_attachments ADD CONSTRAINT message_attachments_size_bytes_check CHECK (((size_bytes IS NULL) OR ((size_bytes > 0) AND (size_bytes <= 10485760))));
ALTER TABLE portal_email_queue ADD CONSTRAINT portal_email_queue_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text])));
ALTER TABLE portal_email_queue ADD CONSTRAINT portal_email_queue_type_check CHECK ((type = ANY (ARRAY['announcement'::text, 'blog_post'::text, 'comment_reply'::text, 'post_comment'::text])));
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'family'::text])));
ALTER TABLE registered_emails ADD CONSTRAINT registered_emails_invitation_status_check CHECK ((invitation_status = ANY (ARRAY['invited'::text, 'active'::text])));
ALTER TABLE registered_emails ADD CONSTRAINT registered_emails_invited_as_role_check CHECK ((invited_as_role = ANY (ARRAY['family'::text, 'admin'::text])));
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE student_feedback ADD CONSTRAINT student_feedback_body_min_len CHECK ((length(TRIM(BOTH FROM body)) >= 2));
ALTER TABLE students ADD CONSTRAINT students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_reference_type_check CHECK ((reference_type = ANY (ARRAY['announcement_comment'::text, 'blog_comment'::text])));
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check CHECK ((type = ANY (ARRAY['comment_reply'::text, 'post_comment'::text])));
ALTER TABLE user_section_last_seen ADD CONSTRAINT user_section_last_seen_section_check CHECK ((section = ANY (ARRAY['announcements'::text, 'blog'::text, 'feedback'::text])));
ALTER TABLE admin_notification_preferences ADD CONSTRAINT admin_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE announcement_comments ADD CONSTRAINT announcement_comments_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(announcement_id) ON DELETE CASCADE;
ALTER TABLE announcement_comments ADD CONSTRAINT announcement_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE announcement_comments ADD CONSTRAINT announcement_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES announcement_comments(comment_id) ON DELETE CASCADE;
ALTER TABLE announcements ADD CONSTRAINT announcements_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES blog_comments(comment_id) ON DELETE CASCADE;
ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES blog_posts(post_id) ON DELETE CASCADE;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE conversation_members ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE;
ALTER TABLE conversation_members ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE conversations ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE enrollment_lead_children ADD CONSTRAINT enrollment_lead_children_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES enrollment_leads(lead_id) ON DELETE CASCADE;
ALTER TABLE enrollment_lead_notifications ADD CONSTRAINT enrollment_lead_notifications_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES enrollment_leads(lead_id) ON DELETE CASCADE;
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_appointment_slot_id_fkey FOREIGN KEY (appointment_slot_id) REFERENCES appointment_slots(slot_id);
ALTER TABLE enrollment_lead_program_bookings ADD CONSTRAINT enrollment_lead_program_bookings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES enrollment_leads(lead_id) ON DELETE CASCADE;
ALTER TABLE families ADD CONSTRAINT families_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE feedback_tests ADD CONSTRAINT feedback_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE guardians ADD CONSTRAINT guardians_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(family_id) ON DELETE CASCADE;
ALTER TABLE message_attachments ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE registered_emails ADD CONSTRAINT registered_emails_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD CONSTRAINT reviews_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(family_id) ON DELETE CASCADE;
ALTER TABLE student_feedback ADD CONSTRAINT student_feedback_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE student_feedback ADD CONSTRAINT student_feedback_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
ALTER TABLE student_feedback ADD CONSTRAINT student_feedback_test_id_fkey FOREIGN KEY (test_id) REFERENCES feedback_tests(test_id) ON DELETE CASCADE;
ALTER TABLE students ADD CONSTRAINT students_family_id_fkey FOREIGN KEY (family_id) REFERENCES families(family_id) ON DELETE CASCADE;
ALTER TABLE user_notification_preferences ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_section_last_seen ADD CONSTRAINT user_section_last_seen_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- Indexes ----------------------------------------------------------------

CREATE INDEX idx_announcement_comments_announcement_id ON public.announcement_comments USING btree (announcement_id);
CREATE INDEX idx_announcement_comments_author_user_id ON public.announcement_comments USING btree (author_user_id);
CREATE INDEX idx_announcements_author_user_id ON public.announcements USING btree (author_user_id);
CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at DESC);
CREATE INDEX idx_announcements_is_pinned ON public.announcements USING btree (is_pinned);
CREATE INDEX idx_blog_comments_author_user_id ON public.blog_comments USING btree (author_user_id);
CREATE INDEX idx_blog_comments_post_id ON public.blog_comments USING btree (post_id);
CREATE INDEX idx_blog_posts_author_user_id ON public.blog_posts USING btree (author_user_id);
CREATE INDEX idx_blog_posts_created_at ON public.blog_posts USING btree (created_at DESC);
CREATE INDEX idx_conversation_members_conversation_id ON public.conversation_members USING btree (conversation_id);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members USING btree (user_id);
CREATE INDEX idx_conversations_created_by ON public.conversations USING btree (created_by);
CREATE INDEX idx_conversations_type ON public.conversations USING btree (type);
CREATE INDEX idx_elc_lead_id ON public.enrollment_lead_children USING btree (lead_id);
CREATE INDEX idx_enrollment_lead_notifications_lead_id ON public.enrollment_lead_notifications USING btree (lead_id);
CREATE INDEX idx_enrollment_lead_notifications_status ON public.enrollment_lead_notifications USING btree (status);
CREATE INDEX idx_elpb_lead_id ON public.enrollment_lead_program_bookings USING btree (lead_id);
CREATE INDEX idx_elpb_token ON public.enrollment_lead_program_bookings USING btree (booking_token);
CREATE UNIQUE INDEX idx_enrollment_leads_booking_token ON public.enrollment_leads USING btree (booking_token) WHERE (booking_token IS NOT NULL);
CREATE INDEX idx_enrollment_leads_created_at ON public.enrollment_leads USING btree (created_at DESC);
CREATE INDEX idx_enrollment_leads_notification_status ON public.enrollment_leads USING btree (notification_status);
CREATE INDEX idx_enrollment_leads_status ON public.enrollment_leads USING btree (status);
CREATE INDEX idx_families_owner_user_id ON public.families USING btree (owner_user_id);
CREATE INDEX idx_families_primary_email ON public.families USING btree (primary_email);
CREATE INDEX idx_feedback_tests_test_date ON public.feedback_tests USING btree (test_date DESC);
CREATE INDEX idx_guardians_family_id ON public.guardians USING btree (family_id);
CREATE INDEX idx_guardians_is_primary_contact ON public.guardians USING btree (is_primary_contact);
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments USING btree (message_id);
CREATE INDEX idx_messages_author_user_id ON public.messages USING btree (author_user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);
CREATE INDEX idx_reviews_author_user_id ON public.reviews USING btree (author_user_id);
CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at DESC);
CREATE INDEX idx_reviews_family_id ON public.reviews USING btree (family_id);
CREATE INDEX idx_student_feedback_author_user_id ON public.student_feedback USING btree (author_user_id);
CREATE INDEX idx_student_feedback_created_at ON public.student_feedback USING btree (created_at DESC);
CREATE INDEX idx_student_feedback_student_id ON public.student_feedback USING btree (student_id);
CREATE INDEX idx_student_feedback_test_id ON public.student_feedback USING btree (test_id);
CREATE INDEX idx_students_family_id ON public.students USING btree (family_id);
CREATE INDEX idx_students_status ON public.students USING btree (status);
CREATE INDEX user_notifications_recipient_unread ON public.user_notifications USING btree (recipient_user_id, is_read);


-- Functions --------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_blocked_dates(p_start_date date, p_end_date date DEFAULT NULL::date, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO blocked_dates (start_date, end_date, reason)
  VALUES (p_start_date, COALESCE(p_end_date, p_start_date), p_reason)
  RETURNING block_id INTO v_id;

  RETURN v_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.check_email_has_account(check_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.registered_emails WHERE email = lower(trim(check_email)));
END;
$function$

CREATE OR REPLACE FUNCTION public.create_enrollment_lead(p_parent_name text, p_parent_email text, p_phone text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_children jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id       UUID;
  v_child         JSONB;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, status)
  VALUES (
    trim(p_parent_name),
    lower(trim(p_parent_email)),
    NULLIF(trim(COALESCE(p_phone,'')),''),
    COALESCE(NULLIF(trim(COALESCE(p_notes,'')),''), 'Lead created manually by admin.'),
    'admin', 'new'
  )
  RETURNING lead_id INTO v_lead_id;

  IF p_children IS NOT NULL AND jsonb_array_length(p_children) > 0 THEN
    FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
      v_age := (v_child->>'age')::INTEGER;
      IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
      ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
      ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
      END IF;
      INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (v_lead_id, trim(v_child->>'name'), v_age, v_program);
      IF NOT (v_program = ANY(v_programs_seen)) THEN
        INSERT INTO public.enrollment_lead_program_bookings (lead_id, program_type, status)
        VALUES (v_lead_id, v_program, 'pending');
        v_programs_seen := v_programs_seen || v_program;
      END IF;
    END LOOP;
  END IF;

  RETURN v_lead_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.create_or_get_dm_conversation(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.deactivate_admin(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
END;
$function$

CREATE OR REPLACE FUNCTION public.delete_admin_notification_setting(p_setting_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE admin_notification_settings SET is_active = false WHERE setting_id = p_setting_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.delete_appointment_slot(p_slot_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE appointment_slots SET is_active = false WHERE slot_id = p_slot_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.enrollment_lead_notification_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM net.http_post(
    url     := 'https://qfyeguikxxwwxpxleqrr.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeWVndWlreHh3d3hweGxlcXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NTA3NDcsImV4cCI6MjA4NDUyNjc0N30.aiivbIi5R-2aRouB9d2_Lgje82e8yl0iQTUUF2iZmhs'
    ),
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     to_jsonb(NEW),
      'old_record', NULL
    )
  );
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_admin_emails()
 RETURNS TABLE(user_id uuid, email text, display_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT p.user_id, u.email::TEXT, p.display_name
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.role = 'admin'
    ORDER BY p.display_name;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_admin_notification_settings()
 RETURNS SETOF admin_notification_settings
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY SELECT * FROM admin_notification_settings WHERE is_active = true ORDER BY created_at;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_available_slots(target_date date)
 RETURNS SETOF appointment_slots
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.*
  FROM appointment_slots s
  WHERE s.is_active = true
    AND EXTRACT(DOW FROM target_date)::INTEGER = s.day_of_week
    AND (
      s.week_of_month IS NULL
      OR (s.week_of_month = -1
          AND DATE_TRUNC('month', target_date + 7) <> DATE_TRUNC('month', target_date))
      OR (s.week_of_month BETWEEN 1 AND 4
          AND CEIL(EXTRACT(DAY FROM target_date) / 7.0)::INTEGER = s.week_of_month)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_dates b
      WHERE target_date BETWEEN b.start_date AND b.end_date
    )
  ORDER BY s.start_time;
$function$

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token uuid)
 RETURNS TABLE(status text, parent_name text, parent_email text, appointment_date date, appointment_time time without time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT status, parent_name, parent_email, appointment_date, appointment_time
  FROM enrollment_leads
  WHERE booking_token = p_token
  LIMIT 1;
$function$

CREATE OR REPLACE FUNCTION public.get_program_booking_by_token(p_token uuid)
 RETURNS TABLE(booking_id uuid, program_type text, status text, appointment_date date, appointment_time time without time zone, parent_name text, child_names text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    pb.booking_id,
    pb.program_type,
    pb.status,
    pb.appointment_date,
    pb.appointment_time,
    el.parent_name,
    ARRAY(
      SELECT c.name FROM enrollment_lead_children c
      WHERE c.lead_id = pb.lead_id AND c.program_type = pb.program_type
      ORDER BY c.created_at
    ) AS child_names
  FROM enrollment_lead_program_bookings pb
  JOIN enrollment_leads el ON el.lead_id = pb.lead_id
  WHERE pb.booking_token = p_token
  LIMIT 1;
$function$

CREATE OR REPLACE FUNCTION public.get_total_unread_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT SUM(msg_count)::INTEGER
      FROM (
        SELECT (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = cm.conversation_id
            AND m.author_user_id <> auth.uid()
            AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
        )::INTEGER AS msg_count
        FROM conversation_members cm
        WHERE cm.user_id = auth.uid()
      ) sub
    ),
    0
  )::INTEGER;
$function$

CREATE OR REPLACE FUNCTION public.get_upcoming_bookable_dates(p_slot_id uuid, p_weeks_ahead integer DEFAULT 20)
 RETURNS TABLE(available_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot       appointment_slots%ROWTYPE;
  v_check_date DATE := CURRENT_DATE + 1;
  v_end_date   DATE := CURRENT_DATE + (p_weeks_ahead * 7);
BEGIN
  SELECT * INTO v_slot FROM appointment_slots
  WHERE slot_id = p_slot_id AND is_active = true;
  IF NOT FOUND THEN RETURN; END IF;

  WHILE v_check_date <= v_end_date LOOP
    IF EXTRACT(DOW FROM v_check_date)::INTEGER = v_slot.day_of_week THEN
      IF (
        v_slot.week_of_month IS NULL
        OR (v_slot.week_of_month = -1
            AND DATE_TRUNC('month', v_check_date + 7) <> DATE_TRUNC('month', v_check_date))
        OR (v_slot.week_of_month BETWEEN 1 AND 4
            AND CEIL(EXTRACT(DAY FROM v_check_date) / 7.0)::INTEGER = v_slot.week_of_month)
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM blocked_dates b
          WHERE v_check_date BETWEEN b.start_date AND b.end_date
        )
        AND NOT EXISTS (
          SELECT 1 FROM enrollment_lead_program_bookings pb
          WHERE pb.appointment_slot_id = p_slot_id
            AND pb.appointment_date = v_check_date
            AND pb.status IN ('scheduled','confirmed')
        )
        THEN
          available_date := v_check_date;
          RETURN NEXT;
        END IF;
      END IF;
    END IF;
    v_check_date := v_check_date + 1;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.registered_emails WHERE email = lower(trim(OLD.email));
  RETURN OLD;
END;
$function$

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = user_uuid
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.is_family_to_staff_pair(user_a uuid, user_b uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_a TEXT;
  role_b TEXT;
BEGIN
  SELECT role INTO role_a FROM profiles WHERE user_id = user_a;
  SELECT role INTO role_b FROM profiles WHERE user_id = user_b;

  RETURN (
    (role_a = 'family' AND role_b = 'admin')
    OR
    (role_a = 'admin' AND role_b = 'family')
    OR
    (role_a = 'admin' AND role_b = 'admin')
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.is_owner(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_uuid AND is_owner = true
  );
$function$

CREATE OR REPLACE FUNCTION public.is_valid_dm_conversation(conv_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  member_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversation_id = conv_id
      AND type = 'dm'
  ) THEN
    RETURN false;
  END IF;

  SELECT COUNT(*)
  INTO member_count
  FROM conversation_members
  WHERE conversation_id = conv_id;

  IF member_count <> 2 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM conversation_members cm1
    JOIN conversation_members cm2
      ON cm1.conversation_id = cm2.conversation_id
      AND cm1.user_id < cm2.user_id
    WHERE cm1.conversation_id = conv_id
      AND is_family_to_staff_pair(cm1.user_id, cm2.user_id)
  );
END;
$function$

CREATE OR REPLACE FUNCTION public.join_global_conversation()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conv_id UUID;
BEGIN
  SELECT conversation_id INTO v_conv_id
  FROM conversations
  WHERE type = 'global'
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (v_conv_id, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.notify_announcement_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_parent_author_id  UUID;
  v_post_author_id    UUID;
  v_actor_name        TEXT;
  v_announcement_title TEXT;
  v_parent_snippet    TEXT;
  v_pref              BOOLEAN;
  v_email             TEXT;
BEGIN
  SELECT display_name INTO v_actor_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  SELECT title INTO v_announcement_title
  FROM announcements WHERE announcement_id = NEW.announcement_id;

  -- Reply: notify parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_user_id, LEFT(body, 100)
    INTO v_parent_author_id, v_parent_snippet
    FROM announcement_comments WHERE comment_id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_parent_author_id, 'comment_reply', NEW.comment_id, 'announcement_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_comment_replies, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_comment_replies FROM user_notification_preferences
        UNION
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'comment_reply', jsonb_build_object(
            'replier_name',    COALESCE(v_actor_name, 'Someone'),
            'original_snippet', v_parent_snippet,
            'tab',             'announcements'
          ), 'queued');
        END IF;
      END IF;
    END IF;
  END IF;

  -- Top-level comment: notify post author
  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_user_id INTO v_post_author_id
    FROM announcements WHERE announcement_id = NEW.announcement_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_post_author_id, 'post_comment', NEW.comment_id, 'announcement_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_post_comments, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_post_comments FROM user_notification_preferences
        UNION
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'post_comment', jsonb_build_object(
            'commenter_name', COALESCE(v_actor_name, 'Someone'),
            'post_title',     COALESCE(v_announcement_title, 'an announcement'),
            'tab',            'announcements'
          ), 'queued');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.notify_blog_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_parent_author_id UUID;
  v_post_author_id   UUID;
  v_actor_name       TEXT;
  v_post_title       TEXT;
  v_parent_snippet   TEXT;
  v_pref             BOOLEAN;
  v_email            TEXT;
BEGIN
  SELECT display_name INTO v_actor_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  SELECT title INTO v_post_title
  FROM blog_posts WHERE post_id = NEW.post_id;

  -- Reply: notify parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_user_id, LEFT(body, 100)
    INTO v_parent_author_id, v_parent_snippet
    FROM blog_comments WHERE comment_id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_parent_author_id, 'comment_reply', NEW.comment_id, 'blog_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_comment_replies, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_comment_replies FROM user_notification_preferences
        UNION
        SELECT user_id, notify_comment_replies FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_parent_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'comment_reply', jsonb_build_object(
            'replier_name',     COALESCE(v_actor_name, 'Someone'),
            'original_snippet', v_parent_snippet,
            'tab',              'blog'
          ), 'queued');
        END IF;
      END IF;
    END IF;
  END IF;

  -- Top-level comment: notify post author
  IF NEW.parent_comment_id IS NULL THEN
    SELECT author_user_id INTO v_post_author_id
    FROM blog_posts WHERE post_id = NEW.post_id;

    IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.author_user_id THEN
      INSERT INTO user_notifications
        (recipient_user_id, type, reference_id, reference_type, actor_display_name)
      VALUES
        (v_post_author_id, 'post_comment', NEW.comment_id, 'blog_comment',
         COALESCE(v_actor_name, 'Someone'));

      SELECT COALESCE(prefs.notify_post_comments, true), au.email
      INTO v_pref, v_email
      FROM auth.users au
      LEFT JOIN (
        SELECT user_id, notify_post_comments FROM user_notification_preferences
        UNION
        SELECT user_id, notify_post_comments FROM admin_notification_preferences
      ) prefs ON prefs.user_id = au.id
      WHERE au.id = v_post_author_id
      LIMIT 1;

      IF v_pref IS DISTINCT FROM false THEN
        IF v_email IS NOT NULL THEN
          INSERT INTO portal_email_queue (recipient_email, type, payload, status)
          VALUES (v_email, 'post_comment', jsonb_build_object(
            'commenter_name', COALESCE(v_actor_name, 'Someone'),
            'post_title',     COALESCE(v_post_title, 'a blog post'),
            'tab',            'blog'
          ), 'queued');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.notify_new_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO portal_email_queue (recipient_email, type, payload, status)
  SELECT
    au.email,
    'announcement',
    jsonb_build_object(
      'announcement_id', NEW.announcement_id,
      'title',           NEW.title,
      'body',            LEFT(NEW.body, 300)
    ),
    'queued'
  FROM user_notification_preferences unp
  JOIN auth.users au ON au.id = unp.user_id
  WHERE unp.notify_announcements = true;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.notify_new_blog_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_author_name TEXT;
BEGIN
  SELECT display_name INTO v_author_name
  FROM profiles WHERE user_id = NEW.author_user_id;

  INSERT INTO portal_email_queue (recipient_email, type, payload, status)
  SELECT
    au.email,
    'blog_post',
    jsonb_build_object(
      'post_id',     NEW.post_id,
      'title',       NEW.title,
      'author_name', COALESCE(v_author_name, 'A member')
    ),
    'queued'
  FROM (
    SELECT user_id, notify_blog_posts FROM user_notification_preferences
    UNION
    SELECT user_id, notify_blog_posts FROM admin_notification_preferences
  ) prefs
  JOIN auth.users au ON au.id = prefs.user_id
  WHERE prefs.notify_blog_posts = true
    AND prefs.user_id != NEW.author_user_id;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.portal_email_queue_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM net.http_post(
    url     := 'https://qfyeguikxxwwxpxleqrr.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeWVndWlreHh3d3hweGxlcXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NTA3NDcsImV4cCI6MjA4NDUyNjc0N30.aiivbIi5R-2aRouB9d2_Lgje82e8yl0iQTUUF2iZmhs'
    ),
    body    := jsonb_build_object(
      'type',       'INSERT',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     to_jsonb(NEW),
      'old_record', NULL
    )
  );
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.reactivate_admin(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;
  UPDATE public.profiles
  SET is_active = true, deactivated_at = NULL
  WHERE user_id = target_user_id AND role = 'admin';
END;
$function$

CREATE OR REPLACE FUNCTION public.register_invited_email(invited_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.remove_blocked_dates(p_block_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM blocked_dates WHERE block_id = p_block_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.set_admin_owner_status(target_user_id uuid, make_owner boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.set_primary_guardian(p_guardian_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$

CREATE OR REPLACE FUNCTION public.submit_enrollment_lead(p_parent_name text, p_parent_email text, p_phone text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_source_page text DEFAULT 'contact'::text, p_children jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id       UUID;
  v_notif_email   TEXT;
  v_parent_name   TEXT := trim(COALESCE(p_parent_name,''));
  v_parent_email  TEXT := lower(trim(COALESCE(p_parent_email,'')));
  v_phone         TEXT := NULLIF(trim(COALESCE(p_phone,'')),'');
  v_phone_digits  TEXT;
  v_message       TEXT := NULLIF(trim(COALESCE(p_message,'')),'');
  v_source_page   TEXT := COALESCE(NULLIF(trim(COALESCE(p_source_page,'')),''),'contact');
  v_child         JSONB;
  v_child_name    TEXT;
  v_age           INTEGER;
  v_program       TEXT;
  v_programs_seen TEXT[] := '{}';
BEGIN
  IF length(v_parent_name) < 2 OR length(v_parent_name) > 100 THEN
    RAISE EXCEPTION 'Parent name must be between 2 and 100 characters.';
  END IF;

  IF length(v_parent_email) < 5 OR length(v_parent_email) > 254
     OR v_parent_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Please provide a valid email.';
  END IF;

  IF v_phone IS NOT NULL THEN
    IF length(v_phone) > 20 THEN RAISE EXCEPTION 'Please provide a valid phone number.'; END IF;
    v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
    IF NOT (length(v_phone_digits) = 10
            OR (length(v_phone_digits) = 11 AND left(v_phone_digits, 1) = '1')) THEN
      RAISE EXCEPTION 'Please provide a valid phone number.';
    END IF;
  END IF;

  IF v_message IS NOT NULL AND length(v_message) > 1500 THEN
    RAISE EXCEPTION 'Message must be 1500 characters or fewer.';
  END IF;

  IF p_children IS NULL OR jsonb_typeof(p_children) <> 'array'
     OR jsonb_array_length(p_children) < 1 OR jsonb_array_length(p_children) > 6 THEN
    RAISE EXCEPTION 'Please list between 1 and 6 children.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.enrollment_leads
    WHERE parent_email = v_parent_email
      AND created_at > NOW() - INTERVAL '30 seconds'
  ) THEN
    RAISE EXCEPTION 'Please wait a moment before submitting again.'
      USING ERRCODE = 'P0429';
  END IF;

  IF (
    SELECT count(*) FROM public.enrollment_leads
    WHERE parent_email = v_parent_email
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 5 THEN
    RAISE EXCEPTION 'You have reached the maximum number of submissions for today. Please try again later.'
      USING ERRCODE = 'P0429';
  END IF;

  IF (
    SELECT count(*) FROM public.enrollment_leads
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) >= 60 THEN
    RAISE EXCEPTION 'Too many requests right now. Please try again later.'
      USING ERRCODE = 'P0429';
  END IF;

  -- No fallback: leave v_message as NULL when no message was provided

  v_notif_email := lower(COALESCE(
    NULLIF(trim(current_setting('app.lbmaa_faculty_notification_email', true)),''),
    'vincethanhdoan@gmail.com'
  ));

  INSERT INTO public.enrollment_leads (parent_name, parent_email, phone, message, source_page, notification_status, notified_at)
  VALUES (v_parent_name, v_parent_email, v_phone, v_message, v_source_page, 'queued', NOW())
  RETURNING lead_id INTO v_lead_id;

  -- Admin notification
  INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (v_lead_id, v_notif_email, 'email', 'new_lead', 'queued');

  -- Prospect thank-you email
  INSERT INTO public.enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  VALUES (v_lead_id, v_parent_email, 'email', 'submission', 'queued');

  IF p_children IS NOT NULL AND jsonb_array_length(p_children) > 0 THEN
    FOR v_child IN SELECT * FROM jsonb_array_elements(p_children) LOOP
      v_child_name := trim(COALESCE(v_child->>'name',''));
      IF length(v_child_name) < 1 OR length(v_child_name) > 60 THEN
        RAISE EXCEPTION 'Each child name must be between 1 and 60 characters.';
      END IF;
      v_age := (v_child->>'age')::INTEGER;
      IF v_age BETWEEN 4 AND 7 THEN v_program := 'little_dragons';
      ELSIF v_age BETWEEN 8 AND 17 THEN v_program := 'youth';
      ELSE RAISE EXCEPTION 'Child age must be between 4 and 17.';
      END IF;
      INSERT INTO public.enrollment_lead_children (lead_id, name, age, program_type)
      VALUES (v_lead_id, v_child_name, v_age, v_program);
      IF NOT (v_program = ANY(v_programs_seen)) THEN
        INSERT INTO public.enrollment_lead_program_bookings (lead_id, program_type, status)
        VALUES (v_lead_id, v_program, 'pending');
        v_programs_seen := v_programs_seen || v_program;
      END IF;
    END LOOP;
  END IF;

  RETURN v_lead_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.trigger_new_enrollment_lead_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  v_url := current_setting('app.supabase_url', true);
  v_anon_key := current_setting('app.supabase_anon_key', true);

  IF v_url IS NOT NULL AND v_url <> '' AND v_anon_key IS NOT NULL AND v_anon_key <> '' THEN
    PERFORM extensions.http_post(
      url := v_url || '/functions/v1/on-new-enrollment-lead',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body := row_to_json(NEW)::text,
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE conversation_id = NEW.conversation_id;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.upsert_admin_notification_setting(p_email text, p_notify_new_leads boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO admin_notification_settings (email, notify_new_leads)
  VALUES (lower(trim(p_email)), p_notify_new_leads)
  ON CONFLICT (email) DO UPDATE SET notify_new_leads = EXCLUDED.notify_new_leads, is_active = true
  RETURNING setting_id INTO v_id;

  RETURN v_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.upsert_appointment_slot(p_slot_id uuid DEFAULT NULL::uuid, p_day_of_week integer DEFAULT NULL::integer, p_start_time time without time zone DEFAULT NULL::time without time zone, p_end_time time without time zone DEFAULT NULL::time without time zone, p_label text DEFAULT NULL::text, p_week_of_month integer DEFAULT NULL::integer, p_program_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF p_program_type IS NOT NULL AND p_program_type NOT IN ('little_dragons', 'youth', 'all') THEN
    RAISE EXCEPTION 'program_type must be one of little_dragons, youth, or all';
  END IF;

  IF p_slot_id IS NOT NULL THEN
    UPDATE appointment_slots SET
      day_of_week   = COALESCE(p_day_of_week,  day_of_week),
      start_time    = COALESCE(p_start_time,   start_time),
      end_time      = COALESCE(p_end_time,     end_time),
      label         = COALESCE(p_label,        label),
      week_of_month = p_week_of_month,
      program_type  = COALESCE(p_program_type, program_type)
    WHERE slot_id = p_slot_id
    RETURNING slot_id INTO v_id;
  ELSE
    IF p_day_of_week IS NULL OR p_start_time IS NULL OR p_end_time IS NULL OR p_label IS NULL THEN
      RAISE EXCEPTION 'day_of_week, start_time, end_time, and label are required when creating a new slot';
    END IF;
    INSERT INTO appointment_slots (day_of_week, start_time, end_time, label, week_of_month, program_type)
    VALUES (p_day_of_week, p_start_time, p_end_time, p_label, p_week_of_month, COALESCE(p_program_type, 'all'))
    RETURNING slot_id INTO v_id;
  END IF;

  RETURN v_id;
END;
$function$


-- Triggers ---------------------------------------------------------------

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER on_auth_user_deleted AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_user_deleted();
CREATE TRIGGER announcement_comment_notification_trigger AFTER INSERT ON public.announcement_comments FOR EACH ROW EXECUTE FUNCTION notify_announcement_comment();
CREATE TRIGGER update_announcement_comments_updated_at BEFORE UPDATE ON public.announcement_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER announcement_notification_trigger AFTER INSERT ON public.announcements FOR EACH ROW EXECUTE FUNCTION notify_new_announcement();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER blog_comment_notification_trigger AFTER INSERT ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION notify_blog_comment();
CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON public.blog_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER blog_post_notification_trigger AFTER INSERT ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION notify_new_blog_post();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER enrollment_lead_notification_notify_trigger AFTER INSERT ON public.enrollment_lead_notifications FOR EACH ROW EXECUTE FUNCTION enrollment_lead_notification_notify();
CREATE TRIGGER on_new_enrollment_lead_trigger AFTER INSERT ON public.enrollment_leads FOR EACH ROW EXECUTE FUNCTION trigger_new_enrollment_lead_notification();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_feedback_tests_updated_at BEFORE UPDATE ON public.feedback_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON public.guardians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_message_insert_update_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER portal_email_queue_notify_trigger AFTER INSERT ON public.portal_email_queue FOR EACH ROW EXECUTE FUNCTION portal_email_queue_notify();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_student_feedback_updated_at BEFORE UPDATE ON public.student_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Row level security -----------------------------------------------------

ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_lead_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_lead_program_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_section_last_seen ENABLE ROW LEVEL SECURITY;


-- Policies (public) ------------------------------------------------------

CREATE POLICY admins_own_notification_prefs ON public.admin_notification_preferences AS PERMISSIVE FOR ALL TO public
  USING ((is_admin(auth.uid()) AND (auth.uid() = user_id)));

CREATE POLICY "Admins can manage notification settings" ON public.admin_notification_settings AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can create announcement comments" ON public.announcement_comments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view announcement comments" ON public.announcement_comments AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users can delete their own announcement comments" ON public.announcement_comments AS PERMISSIVE FOR DELETE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Users can update their own announcement comments" ON public.announcement_comments AS PERMISSIVE FOR UPDATE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Admins can create announcements" ON public.announcements AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete announcements" ON public.announcements AS PERMISSIVE FOR DELETE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update announcements" ON public.announcements AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view announcements" ON public.announcements AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admins can manage appointment slots" ON public.appointment_slots AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view active appointment slots" ON public.appointment_slots AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Admins can manage blocked dates" ON public.blocked_dates AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view blocked dates" ON public.blocked_dates AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can create blog comments" ON public.blog_comments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (author_user_id = auth.uid())));

CREATE POLICY "Authenticated users can view blog comments" ON public.blog_comments AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users can delete their own blog comments" ON public.blog_comments AS PERMISSIVE FOR DELETE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Users can update their own blog comments" ON public.blog_comments AS PERMISSIVE FOR UPDATE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Admins can create blog posts" ON public.blog_posts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete blog posts" ON public.blog_posts AS PERMISSIVE FOR DELETE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update blog posts" ON public.blog_posts AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view blog posts" ON public.blog_posts AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users can add conversation members for DM flows" ON public.conversation_members AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.conversation_id = conversation_members.conversation_id) AND (conversations.type = 'global'::text)))) AND ((user_id = auth.uid()) OR is_admin(auth.uid()))) OR ((EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.conversation_id = conversation_members.conversation_id) AND (conversations.type = 'dm'::text)))) AND ((user_id = auth.uid()) OR is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.conversation_id = conversation_members.conversation_id) AND (conversations.created_by = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.conversation_id = conversation_members.conversation_id) AND ((c.created_by = conversation_members.user_id) OR (EXISTS ( SELECT 1
           FROM conversation_members cm_creator
          WHERE ((cm_creator.conversation_id = c.conversation_id) AND (cm_creator.user_id = c.created_by)))))))) AND (( SELECT count(*) AS count
   FROM conversation_members cm
  WHERE (cm.conversation_id = conversation_members.conversation_id)) < 2) AND ((( SELECT count(*) AS count
   FROM conversation_members cm
  WHERE (cm.conversation_id = conversation_members.conversation_id)) = 0) OR (EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = conversation_members.conversation_id) AND is_family_to_staff_pair(cm.user_id, conversation_members.user_id)))))))));

CREATE POLICY "Users can remove conversation members for self and DM flows" ON public.conversation_members AS PERMISSIVE FOR DELETE TO public
  USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE POLICY "Users can update their own conversation read state" ON public.conversation_members AS PERMISSIVE FOR UPDATE TO public
  USING (((user_id = auth.uid()) AND is_conversation_member(conversation_id, auth.uid())))
  WITH CHECK (((user_id = auth.uid()) AND is_conversation_member(conversation_id, auth.uid())));

CREATE POLICY "Users can view conversation members of conversations they're in" ON public.conversation_members AS PERMISSIVE FOR SELECT TO public
  USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Admins can update conversations" ON public.conversations AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create conversations" ON public.conversations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (created_by = auth.uid()) AND (((type = 'global'::text) AND is_admin(auth.uid())) OR ((type = 'dm'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'family'::text])))))))));

CREATE POLICY "Authenticated users can view conversations they're members of" ON public.conversations AS PERMISSIVE FOR SELECT TO public
  USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Authenticated users can view global conversations" ON public.conversations AS PERMISSIVE FOR SELECT TO public
  USING (((type = 'global'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Admins can update enrollment lead children" ON public.enrollment_lead_children AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view enrollment lead children" ON public.enrollment_lead_children AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update enrollment lead notifications" ON public.enrollment_lead_notifications AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view enrollment lead notifications" ON public.enrollment_lead_notifications AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update enrollment lead program bookings" ON public.enrollment_lead_program_bookings AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view enrollment lead program bookings" ON public.enrollment_lead_program_bookings AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete enrollment leads" ON public.enrollment_leads AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update enrollment leads" ON public.enrollment_leads AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view enrollment leads" ON public.enrollment_leads AS PERMISSIVE FOR SELECT TO public
  USING ((is_admin(auth.uid()) AND (deleted_at IS NULL)));

CREATE POLICY "Admins can insert families" ON public.families AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update all families" ON public.families AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all families" ON public.families AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert their own family" ON public.families AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (owner_user_id = auth.uid())));

CREATE POLICY "Users can update their own family" ON public.families AS PERMISSIVE FOR UPDATE TO public
  USING ((owner_user_id = auth.uid()));

CREATE POLICY "Users can view their own family" ON public.families AS PERMISSIVE FOR SELECT TO public
  USING ((owner_user_id = auth.uid()));

CREATE POLICY "Admins can create feedback tests" ON public.feedback_tests AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin(auth.uid()) AND (created_by = auth.uid())));

CREATE POLICY "Admins can delete feedback tests" ON public.feedback_tests AS PERMISSIVE FOR DELETE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update feedback tests" ON public.feedback_tests AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view feedback tests" ON public.feedback_tests AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Admins can manage all guardians" ON public.guardians AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all guardians" ON public.guardians AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage guardians of their family" ON public.guardians AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM families
  WHERE ((families.family_id = guardians.family_id) AND (families.owner_user_id = auth.uid())))));

CREATE POLICY "Users can view guardians of their family" ON public.guardians AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM families
  WHERE ((families.family_id = guardians.family_id) AND (families.owner_user_id = auth.uid())))));

CREATE POLICY "Users can create attachments for their messages" ON public.message_attachments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.message_id = message_attachments.message_id) AND (messages.author_user_id = auth.uid())))) AND (storage_path ~~ ((auth.uid())::text || '/%'::text)) AND (size_bytes IS NOT NULL) AND (size_bytes <= 10485760) AND (file_name ~* '\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt)$'::text) AND ((mime_type IS NULL) OR (lower(mime_type) = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/gif'::text, 'image/webp'::text, 'application/pdf'::text, 'application/msword'::text, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text, 'text/plain'::text, 'application/octet-stream'::text])))));

CREATE POLICY "Users can view attachments for messages they can view" ON public.message_attachments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM messages
  WHERE ((messages.message_id = message_attachments.message_id) AND is_conversation_member(messages.conversation_id, auth.uid()) AND ((NOT (EXISTS ( SELECT 1
           FROM conversations
          WHERE ((conversations.conversation_id = messages.conversation_id) AND (conversations.type = 'dm'::text))))) OR is_valid_dm_conversation(messages.conversation_id))))));

CREATE POLICY "Users can create messages in conversations they're members of" ON public.messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (author_user_id = auth.uid()) AND is_conversation_member(conversation_id, auth.uid()) AND ((NOT (EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.conversation_id = messages.conversation_id) AND (conversations.type = 'dm'::text))))) OR is_valid_dm_conversation(conversation_id))));

CREATE POLICY "Users can delete their own messages" ON public.messages AS PERMISSIVE FOR DELETE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Users can update their own messages" ON public.messages AS PERMISSIVE FOR UPDATE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Users can view messages in conversations they're members of" ON public.messages AS PERMISSIVE FOR SELECT TO public
  USING ((is_conversation_member(conversation_id, auth.uid()) AND ((NOT (EXISTS ( SELECT 1
   FROM conversations
  WHERE ((conversations.conversation_id = messages.conversation_id) AND (conversations.type = 'dm'::text))))) OR is_valid_dm_conversation(conversation_id))));

CREATE POLICY no_user_access_portal_email_queue ON public.portal_email_queue AS PERMISSIVE FOR ALL TO public
  USING (false);

CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view admin profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (((auth.role() = 'authenticated'::text) AND (role = 'admin'::text)));

CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = user_id));

CREATE POLICY "Anyone can view reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can create reviews for their family" ON public.reviews AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((auth.role() = 'authenticated'::text) AND (author_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM families
  WHERE ((families.family_id = reviews.family_id) AND (families.owner_user_id = auth.uid()))))));

CREATE POLICY "Users can delete their own reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Users can update their own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO public
  USING ((author_user_id = auth.uid()));

CREATE POLICY "Admins can create student feedback" ON public.student_feedback AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_admin(auth.uid()) AND (author_user_id = auth.uid())));

CREATE POLICY "Admins can delete student feedback" ON public.student_feedback AS PERMISSIVE FOR DELETE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update student feedback" ON public.student_feedback AS PERMISSIVE FOR UPDATE TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Families can view feedback for their students" ON public.student_feedback AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (students s
     JOIN families f ON ((f.family_id = s.family_id)))
  WHERE ((s.student_id = student_feedback.student_id) AND (f.owner_user_id = auth.uid())))) OR is_admin(auth.uid())));

CREATE POLICY "Admins can manage all students" ON public.students AS PERMISSIVE FOR ALL TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all students" ON public.students AS PERMISSIVE FOR SELECT TO public
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage students of their family" ON public.students AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM families
  WHERE ((families.family_id = students.family_id) AND (families.owner_user_id = auth.uid())))));

CREATE POLICY "Users can view students of their family" ON public.students AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM families
  WHERE ((families.family_id = students.family_id) AND (families.owner_user_id = auth.uid())))));

CREATE POLICY users_own_notification_prefs ON public.user_notification_preferences AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id));

CREATE POLICY users_own_notifications ON public.user_notifications AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = recipient_user_id));

CREATE POLICY users_own_last_seen ON public.user_section_last_seen AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = user_id));


-- Storage buckets --------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('announcement-images', 'announcement-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('assets', 'assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('message-attachments', 'message-attachments', false, 10485760, '{image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('profile-pictures', 'profile-pictures', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;


-- Storage policies -------------------------------------------------------

CREATE POLICY "Admins can delete announcement images" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'announcement-images'::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.user_id = auth.uid())) = 'admin'::text)));

CREATE POLICY "Admins can upload announcement images" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'announcement-images'::text) AND (auth.role() = 'authenticated'::text) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.user_id = auth.uid())) = 'admin'::text)));

CREATE POLICY "Authenticated users can view announcement images" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'announcement-images'::text) AND (auth.role() = 'authenticated'::text)));

CREATE POLICY "Users can delete their own attachments" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'message-attachments'::text) AND (auth.role() = 'authenticated'::text) AND (name ~~ ((auth.uid())::text || '/%'::text))));

CREATE POLICY "Users can upload attachments" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'message-attachments'::text) AND (auth.role() = 'authenticated'::text) AND (name ~~ ((auth.uid())::text || '/%'::text)) AND (name ~* '\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt)$'::text)));

CREATE POLICY "Users can view attachments they have access to" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'message-attachments'::text) AND (auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM (message_attachments ma
     JOIN messages m ON ((m.message_id = ma.message_id)))
  WHERE ((ma.storage_path = objects.name) AND is_conversation_member(m.conversation_id, auth.uid()) AND ((NOT (EXISTS ( SELECT 1
           FROM conversations c
          WHERE ((c.conversation_id = m.conversation_id) AND (c.type = 'dm'::text))))) OR is_valid_dm_conversation(m.conversation_id)))))));

CREATE POLICY "authenticated read profile pictures" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'profile-pictures'::text));

CREATE POLICY "families delete own avatar" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'profile-pictures'::text) AND (name = (('profiles/'::text || (auth.uid())::text) || '/avatar'::text))));

CREATE POLICY "families delete student photo" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'profile-pictures'::text) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN families f ON ((s.family_id = f.family_id)))
  WHERE (((('students/'::text || (s.student_id)::text) || '/photo'::text) = objects.name) AND (f.owner_user_id = auth.uid()))))));

CREATE POLICY "families update own avatar" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'profile-pictures'::text) AND (name = (('profiles/'::text || (auth.uid())::text) || '/avatar'::text))))
  WITH CHECK (((bucket_id = 'profile-pictures'::text) AND (name = (('profiles/'::text || (auth.uid())::text) || '/avatar'::text)) AND ((metadata ->> 'mimetype'::text) = ANY (ARRAY['image/jpeg'::text, 'image/jpg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]))));

CREATE POLICY "families update student photo" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'profile-pictures'::text) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN families f ON ((s.family_id = f.family_id)))
  WHERE (((('students/'::text || (s.student_id)::text) || '/photo'::text) = objects.name) AND (f.owner_user_id = auth.uid()))))))
  WITH CHECK (((bucket_id = 'profile-pictures'::text) AND ((metadata ->> 'mimetype'::text) = ANY (ARRAY['image/jpeg'::text, 'image/jpg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text])) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN families f ON ((s.family_id = f.family_id)))
  WHERE (((('students/'::text || (s.student_id)::text) || '/photo'::text) = objects.name) AND (f.owner_user_id = auth.uid()))))));

CREATE POLICY "families upload own avatar" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'profile-pictures'::text) AND (name = (('profiles/'::text || (auth.uid())::text) || '/avatar'::text)) AND ((metadata ->> 'mimetype'::text) = ANY (ARRAY['image/jpeg'::text, 'image/jpg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]))));

CREATE POLICY "families upload student photo" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'profile-pictures'::text) AND ((metadata ->> 'mimetype'::text) = ANY (ARRAY['image/jpeg'::text, 'image/jpg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text])) AND (EXISTS ( SELECT 1
   FROM (students s
     JOIN families f ON ((s.family_id = f.family_id)))
  WHERE (((('students/'::text || (s.student_id)::text) || '/photo'::text) = objects.name) AND (f.owner_user_id = auth.uid()))))));


-- Realtime publication ---------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='announcement_comments') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='announcements') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='blog_comments') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='blog_posts') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='enrollment_lead_notifications') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_lead_notifications; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='enrollment_lead_program_bookings') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_lead_program_bookings; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='enrollment_leads') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_leads; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='reviews') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_notifications') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications; END IF;
END $$;


-- Cron jobs --------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='appointment-reminders') THEN PERFORM cron.unschedule('appointment-reminders'); END IF;
  PERFORM cron.schedule('appointment-reminders', '0 1,2 * * *', '
  INSERT INTO enrollment_lead_notifications (lead_id, recipient_email, channel, type, status)
  SELECT el.lead_id, el.parent_email, ''email'', ''reminder'', ''queued''
  FROM enrollment_leads el
  WHERE el.deleted_at IS NULL
    AND EXTRACT(HOUR FROM (now() AT TIME ZONE ''America/Los_Angeles'')) = 18
    AND el.status IN (''appointment_scheduled'', ''appointment_confirmed'')
    AND (
      SELECT MIN(elpb.appointment_date)
      FROM enrollment_lead_program_bookings elpb
      WHERE elpb.lead_id = el.lead_id
        AND elpb.appointment_date IS NOT NULL
    ) = ((now() AT TIME ZONE ''America/Los_Angeles'')::date + INTERVAL ''2 days'')::date
    AND NOT EXISTS (
      SELECT 1 FROM enrollment_lead_notifications eln
      WHERE eln.lead_id = el.lead_id AND eln.type = ''reminder''
    );
  ');
END $$;


-- Function grants --------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.add_blocked_dates(p_start_date date, p_end_date date, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_has_account(check_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_has_account(check_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_enrollment_lead(p_parent_name text, p_parent_email text, p_phone text, p_notes text, p_children jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_get_dm_conversation(other_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_admin(target_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_admin_notification_setting(p_setting_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_appointment_slot(p_slot_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_notification_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots(target_date date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(target_date date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(p_token uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(p_token uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_booking_by_token(p_token uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_program_booking_by_token(p_token uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(p_slot_id uuid, p_weeks_ahead integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_upcoming_bookable_dates(p_slot_id uuid, p_weeks_ahead integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(user_uuid uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_global_conversation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_admin(target_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_invited_email(invited_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_blocked_dates(p_block_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_owner_status(target_user_id uuid, make_owner boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_guardian(p_guardian_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(p_parent_name text, p_parent_email text, p_phone text, p_message text, p_source_page text, p_children jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_enrollment_lead(p_parent_name text, p_parent_email text, p_phone text, p_message text, p_source_page text, p_children jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_admin_notification_setting(p_email text, p_notify_new_leads boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_appointment_slot(p_slot_id uuid, p_day_of_week integer, p_start_time time without time zone, p_end_time time without time zone, p_label text, p_week_of_month integer, p_program_type text) TO authenticated;
