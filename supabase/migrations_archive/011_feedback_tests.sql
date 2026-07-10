-- Feedback tests: first-class evaluation events that student feedback is attached to

BEGIN;

-- ============================================
-- TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.feedback_tests (
  test_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  test_date   DATE NOT NULL,
  test_time   TIME,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_tests_title_min_len CHECK (length(trim(title)) >= 2)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedback_tests_test_date
  ON public.feedback_tests(test_date DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER set_feedback_tests_updated_at
  BEFORE UPDATE ON public.feedback_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.feedback_tests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read test metadata (families need it to render their test list)
DROP POLICY IF EXISTS "Authenticated users can view feedback tests" ON public.feedback_tests;
CREATE POLICY "Authenticated users can view feedback tests"
  ON public.feedback_tests FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can create feedback tests" ON public.feedback_tests;
CREATE POLICY "Admins can create feedback tests"
  ON public.feedback_tests FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update feedback tests" ON public.feedback_tests;
CREATE POLICY "Admins can update feedback tests"
  ON public.feedback_tests FOR UPDATE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete feedback tests" ON public.feedback_tests;
CREATE POLICY "Admins can delete feedback tests"
  ON public.feedback_tests FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON public.feedback_tests TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feedback_tests TO authenticated;

-- ============================================
-- ADD test_id TO student_feedback
-- ============================================

ALTER TABLE public.student_feedback
  ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.feedback_tests(test_id) ON DELETE CASCADE;

-- ============================================
-- BACKFILL: migrate existing rows
-- Each unique (event_title, event_date, author_user_id) combo becomes one feedback_tests row
-- ============================================

DO $$
DECLARE
  r RECORD;
  new_test_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT event_title, event_date, author_user_id
    FROM public.student_feedback
    WHERE test_id IS NULL
  LOOP
    INSERT INTO public.feedback_tests (title, test_date, created_by)
    VALUES (
      r.event_title,
      COALESCE(r.event_date, CURRENT_DATE),
      r.author_user_id
    )
    RETURNING test_id INTO new_test_id;

    UPDATE public.student_feedback
    SET test_id = new_test_id
    WHERE event_title = r.event_title
      AND COALESCE(event_date::text, '') = COALESCE(r.event_date::text, '')
      AND author_user_id = r.author_user_id
      AND test_id IS NULL;
  END LOOP;
END $$;

-- ============================================
-- ENFORCE NOT NULL and DROP old columns
-- ============================================

ALTER TABLE public.student_feedback
  ALTER COLUMN test_id SET NOT NULL;

ALTER TABLE public.student_feedback
  DROP CONSTRAINT IF EXISTS student_feedback_event_title_min_len,
  DROP COLUMN IF EXISTS event_title,
  DROP COLUMN IF EXISTS event_date;

CREATE INDEX IF NOT EXISTS idx_student_feedback_test_id
  ON public.student_feedback(test_id);

COMMIT;
