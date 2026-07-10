-- Combined Supabase SQL editor script
-- Includes migrations 001 through 006 in execution order.
-- Paste into the Supabase SQL editor and run as a single script.

-- =========================================================
-- 001_initial_schema.sql
-- =========================================================

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
  UNIQUE(family_id, author_user_id)
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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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

INSERT INTO public.registered_emails (email)
SELECT lower(trim(email)) FROM auth.users
ON CONFLICT (email) DO NOTHING;

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

DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

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
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

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

GRANT SELECT ON public.reviews TO anon;

-- =========================================================
-- 002_public_enrollment_leads.sql
-- =========================================================

-- Public enrollment lead capture + faculty notification queue

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

CREATE INDEX IF NOT EXISTS idx_enrollment_leads_created_at
  ON public.enrollment_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollment_leads_notification_status
  ON public.enrollment_leads(notification_status);

CREATE INDEX IF NOT EXISTS idx_enrollment_lead_notifications_lead_id
  ON public.enrollment_lead_notifications(lead_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_lead_notifications_status
  ON public.enrollment_lead_notifications(status);

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

GRANT SELECT, UPDATE ON public.enrollment_leads TO authenticated;
GRANT SELECT, UPDATE ON public.enrollment_lead_notifications TO authenticated;

-- =========================================================
-- 003_conversation_member_read_state.sql
-- =========================================================

-- Persistent read-state model for messaging

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

UPDATE public.conversation_members
SET last_read_at = NOW()
WHERE last_read_at IS NULL;

ALTER TABLE public.conversation_members
  ALTER COLUMN last_read_at SET DEFAULT NOW();

DROP INDEX IF EXISTS public.idx_conversation_members_last_read_at;

DROP POLICY IF EXISTS "Users can update their own conversation read state" ON public.conversation_members;
CREATE POLICY "Users can update their own conversation read state"
  ON public.conversation_members FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_conversation_member(conversation_id, auth.uid())
  );

-- =========================================================
-- 004_profiles_admin_visibility_for_messaging.sql
-- =========================================================

-- Allow authenticated users to discover admin recipients for direct messaging.
-- This keeps profile exposure narrow (admin records only).

DROP POLICY IF EXISTS "Authenticated users can view admin profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view admin profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND role = 'admin'
  );

-- =========================================================
-- 005_create_or_get_dm_conversation_rpc.sql
-- =========================================================

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

-- =========================================================
-- 006_registered_email_admin_invites.sql
-- =========================================================

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
