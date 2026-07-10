-- LBMAA Website Database Schema
-- This migration creates all tables, RLS policies, indexes, and storage bucket
-- Includes fixes for RLS recursion issues

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (links to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'family')),
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Families table
CREATE TABLE IF NOT EXISTS families (
  family_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_email TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardians table
CREATE TABLE IF NOT EXISTS guardians (
  guardian_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(family_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  relationship TEXT,
  is_primary_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(family_id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  belt_level TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcement comments table
CREATE TABLE IF NOT EXISTS announcement_comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES announcements(announcement_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog comments table
CREATE TABLE IF NOT EXISTS blog_comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(post_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('global', 'dm')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation members table
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 10485760)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(family_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, author_user_id) -- One review per family per user
);

-- Backward-compatible account lifecycle columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'families_account_status_check'
      AND conrelid = 'families'::regclass
  ) THEN
    ALTER TABLE families
      ADD CONSTRAINT families_account_status_check
      CHECK (account_status IN ('active', 'inactive', 'archived'));
  END IF;
END
$$;

-- Registered emails (mirror of auth.users emails for anon-safe "has account" check)
-- Synced by triggers; avoids SECURITY DEFINER reading auth schema (permission denied on Supabase)
CREATE TABLE IF NOT EXISTS registered_emails (
  email TEXT PRIMARY KEY
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_families_owner_user_id ON families(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_families_primary_email ON families(primary_email);

CREATE INDEX IF NOT EXISTS idx_guardians_family_id ON guardians(family_id);
CREATE INDEX IF NOT EXISTS idx_guardians_is_primary_contact ON guardians(is_primary_contact);

CREATE INDEX IF NOT EXISTS idx_students_family_id ON students(family_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

CREATE INDEX IF NOT EXISTS idx_announcements_author_user_id ON announcements(author_user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON announcements(is_pinned);

CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_author_user_id ON announcement_comments(author_user_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_user_id ON blog_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_author_user_id ON blog_comments(author_user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_author_user_id ON messages(author_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_reviews_family_id ON reviews(family_id);
CREATE INDEX IF NOT EXISTS idx_reviews_author_user_id ON reviews(author_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers (makes migration idempotent)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_families_updated_at ON families;
DROP TRIGGER IF EXISTS update_guardians_updated_at ON guardians;
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
DROP TRIGGER IF EXISTS update_announcement_comments_updated_at ON announcement_comments;
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_comments_updated_at BEFORE UPDATE ON announcement_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_comments_updated_at BEFORE UPDATE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup and register email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name)
  VALUES (NEW.id, 'family', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.registered_emails (email) VALUES (lower(trim(NEW.email)))
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Remove email from registered_emails when user is deleted
CREATE OR REPLACE FUNCTION handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.registered_emails WHERE email = lower(trim(OLD.email));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_deleted();

-- Backfill registered_emails from existing auth.users (run once; may require dashboard role to read auth.users)
INSERT INTO public.registered_emails (email)
SELECT lower(trim(email)) FROM auth.users
ON CONFLICT (email) DO NOTHING;

-- Helper function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$;

-- Helper function to check conversation membership without RLS recursion
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = user_uuid
  );
END;
$$;

-- Helper function to ensure DM participants are allowed by policy:
-- family + admin or admin + admin (never family + family)
CREATE OR REPLACE FUNCTION is_family_to_staff_pair(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION is_valid_dm_conversation(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Helper: check if an email already has an account (reads public.registered_emails only; no auth schema access)
CREATE OR REPLACE FUNCTION public.check_email_has_account(check_email text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.registered_emails WHERE email = lower(trim(check_email)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_has_account(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_has_account(text) TO authenticated;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE registered_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (makes migration idempotent)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own family" ON families;
DROP POLICY IF EXISTS "Users can update their own family" ON families;
DROP POLICY IF EXISTS "Users can insert their own family" ON families;
DROP POLICY IF EXISTS "Admins can view all families" ON families;
DROP POLICY IF EXISTS "Admins can insert families" ON families;
DROP POLICY IF EXISTS "Admins can update all families" ON families;
DROP POLICY IF EXISTS "Users can view guardians of their family" ON guardians;
DROP POLICY IF EXISTS "Users can manage guardians of their family" ON guardians;
DROP POLICY IF EXISTS "Admins can view all guardians" ON guardians;
DROP POLICY IF EXISTS "Admins can manage all guardians" ON guardians;
DROP POLICY IF EXISTS "Users can view students of their family" ON students;
DROP POLICY IF EXISTS "Users can manage students of their family" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Authenticated users can create announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Users can update their own announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Users can delete their own announcement comments" ON announcement_comments;
DROP POLICY IF EXISTS "Authenticated users can view blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can update their own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Users can delete their own blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can view blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Authenticated users can create blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can update their own blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can delete their own blog comments" ON blog_comments;
DROP POLICY IF EXISTS "Authenticated users can view conversations they're members of" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation members of conversations they're in" ON conversation_members;
DROP POLICY IF EXISTS "Admins can add members to conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can add conversation members for DM flows" ON conversation_members;
DROP POLICY IF EXISTS "Users can remove conversation members for self and DM flows" ON conversation_members;
DROP POLICY IF EXISTS "Users can view messages in conversations they're members of" ON messages;
DROP POLICY IF EXISTS "Users can create messages in conversations they're members of" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view attachments for messages they can view" ON message_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their messages" ON message_attachments;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews for their family" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Families policies
CREATE POLICY "Users can view their own family"
  ON families FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own family"
  ON families FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert their own family"
  ON families FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND owner_user_id = auth.uid());

CREATE POLICY "Admins can view all families"
  ON families FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert families"
  ON families FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update all families"
  ON families FOR UPDATE
  USING (is_admin(auth.uid()));

-- Guardians policies
CREATE POLICY "Users can view guardians of their family"
  ON guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.family_id = guardians.family_id
      AND families.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage guardians of their family"
  ON guardians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.family_id = guardians.family_id
      AND families.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all guardians"
  ON guardians FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all guardians"
  ON guardians FOR ALL
  USING (is_admin(auth.uid()));

-- Students policies
CREATE POLICY "Users can view students of their family"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.family_id = students.family_id
      AND families.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage students of their family"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE families.family_id = students.family_id
      AND families.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all students"
  ON students FOR ALL
  USING (is_admin(auth.uid()));

-- Announcements policies (all authenticated users can view)
CREATE POLICY "Authenticated users can view announcements"
  ON announcements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (is_admin(auth.uid()));

-- Announcement comments policies
CREATE POLICY "Authenticated users can view announcement comments"
  ON announcement_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create announcement comments"
  ON announcement_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_user_id = auth.uid());

CREATE POLICY "Users can update their own announcement comments"
  ON announcement_comments FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Users can delete their own announcement comments"
  ON announcement_comments FOR DELETE
  USING (author_user_id = auth.uid());

-- Blog posts policies
CREATE POLICY "Authenticated users can view blog posts"
  ON blog_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create blog posts"
  ON blog_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_user_id = auth.uid());

CREATE POLICY "Users can update their own blog posts"
  ON blog_posts FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Users can delete their own blog posts"
  ON blog_posts FOR DELETE
  USING (author_user_id = auth.uid());

-- Blog comments policies
CREATE POLICY "Authenticated users can view blog comments"
  ON blog_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create blog comments"
  ON blog_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_user_id = auth.uid());

CREATE POLICY "Users can update their own blog comments"
  ON blog_comments FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Users can delete their own blog comments"
  ON blog_comments FOR DELETE
  USING (author_user_id = auth.uid());

-- Conversations policies
CREATE POLICY "Authenticated users can view conversations they're members of"
  ON conversations FOR SELECT
  USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
    AND (
      (type = 'global' AND is_admin(auth.uid()))
      OR
      (
        type = 'dm'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('admin', 'family')
        )
      )
    )
  );

-- Conversation members policies
CREATE POLICY "Users can view conversation members of conversations they're in"
  ON conversation_members FOR SELECT
  USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can add conversation members for DM flows"
  ON conversation_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (
        EXISTS (
          SELECT 1
          FROM conversations
          WHERE conversations.conversation_id = conversation_members.conversation_id
            AND conversations.type = 'global'
        )
        AND (user_id = auth.uid() OR is_admin(auth.uid()))
      )
      OR
      (
        EXISTS (
          SELECT 1
          FROM conversations
          WHERE conversations.conversation_id = conversation_members.conversation_id
            AND conversations.type = 'dm'
        )
        AND (
          user_id = auth.uid()
          OR is_admin(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM conversations
            WHERE conversations.conversation_id = conversation_members.conversation_id
              AND conversations.created_by = auth.uid()
          )
        )
        AND EXISTS (
          SELECT 1
          FROM conversations c
          WHERE c.conversation_id = conversation_members.conversation_id
            AND (
              c.created_by = conversation_members.user_id
              OR EXISTS (
                SELECT 1
                FROM conversation_members cm_creator
                WHERE cm_creator.conversation_id = c.conversation_id
                  AND cm_creator.user_id = c.created_by
              )
            )
        )
        AND (
          SELECT COUNT(*)
          FROM conversation_members cm
          WHERE cm.conversation_id = conversation_members.conversation_id
        ) < 2
        AND (
          (
            SELECT COUNT(*)
            FROM conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
          ) = 0
          OR EXISTS (
            SELECT 1
            FROM conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
              AND is_family_to_staff_pair(cm.user_id, conversation_members.user_id)
          )
        )
      )
    )
  );

CREATE POLICY "Users can remove conversation members for self and DM flows"
  ON conversation_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR is_admin(auth.uid())
  );

-- Messages policies
CREATE POLICY "Users can view messages in conversations they're members of"
  ON messages FOR SELECT
  USING (
    is_conversation_member(conversation_id, auth.uid())
    AND (
      NOT EXISTS (
        SELECT 1
        FROM conversations
        WHERE conversations.conversation_id = messages.conversation_id
          AND conversations.type = 'dm'
      )
      OR is_valid_dm_conversation(messages.conversation_id)
    )
  );

CREATE POLICY "Users can create messages in conversations they're members of"
  ON messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND author_user_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
    AND (
      NOT EXISTS (
        SELECT 1
        FROM conversations
        WHERE conversations.conversation_id = messages.conversation_id
          AND conversations.type = 'dm'
      )
      OR is_valid_dm_conversation(messages.conversation_id)
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (author_user_id = auth.uid());

-- Message attachments policies
CREATE POLICY "Users can view attachments for messages they can view"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.message_id = message_attachments.message_id
      AND is_conversation_member(messages.conversation_id, auth.uid())
      AND (
        NOT EXISTS (
          SELECT 1
          FROM conversations
          WHERE conversations.conversation_id = messages.conversation_id
            AND conversations.type = 'dm'
        )
        OR is_valid_dm_conversation(messages.conversation_id)
      )
    )
  );

CREATE POLICY "Users can create attachments for their messages"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.message_id = message_attachments.message_id
      AND messages.author_user_id = auth.uid()
    )
    AND storage_path LIKE auth.uid()::text || '/%'
    AND size_bytes IS NOT NULL
    AND size_bytes <= 10485760
    AND file_name ~* '\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt)$'
    AND (
      mime_type IS NULL
      OR lower(mime_type) = ANY (
        ARRAY[
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/octet-stream'
        ]
      )
    )
  );

-- Reviews policies (public read, authenticated write)
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for their family"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM families
      WHERE families.family_id = reviews.family_id
      AND families.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (author_user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (author_user_id = auth.uid());

-- ============================================
-- STORAGE BUCKET POLICIES
-- ============================================

-- Note: Storage bucket must be created via Supabase Dashboard first
-- Bucket name: message-attachments
-- Public: false (use signed URLs)
-- File size limit: 10MB

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- Storage policies (run after creating bucket via dashboard)
CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND name LIKE auth.uid()::text || '/%'
    AND name ~* '\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt)$'
  );

CREATE POLICY "Users can view attachments they have access to"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM message_attachments ma
      JOIN messages m ON m.message_id = ma.message_id
      WHERE ma.storage_path = storage.objects.name
        AND is_conversation_member(m.conversation_id, auth.uid())
        AND (
          NOT EXISTS (
            SELECT 1
            FROM conversations c
            WHERE c.conversation_id = m.conversation_id
              AND c.type = 'dm'
          )
          OR is_valid_dm_conversation(m.conversation_id)
        )
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND auth.role() = 'authenticated'
    AND name LIKE auth.uid()::text || '/%'
  );

-- ============================================
-- GRANTS (required for PostgREST; RLS alone is not enough)
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Allow authenticated users to use the portal (RLS still restricts rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.families,
  public.guardians,
  public.students,
  public.announcements,
  public.announcement_comments,
  public.blog_posts,
  public.blog_comments,
  public.conversations,
  public.conversation_members,
  public.messages,
  public.message_attachments,
  public.reviews
TO authenticated;

-- Public reads (site pages)
GRANT SELECT ON public.reviews TO anon;