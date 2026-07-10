-- Student feedback: instructor notes per student per test/evaluation event

-- ============================================
-- TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.student_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  event_date DATE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_feedback_event_title_min_len CHECK (length(trim(event_title)) >= 2),
  CONSTRAINT student_feedback_body_min_len CHECK (length(trim(body)) >= 2)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_student_feedback_student_id
  ON public.student_feedback(student_id);

CREATE INDEX IF NOT EXISTS idx_student_feedback_author_user_id
  ON public.student_feedback(author_user_id);

CREATE INDEX IF NOT EXISTS idx_student_feedback_created_at
  ON public.student_feedback(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER set_student_feedback_updated_at
  BEFORE UPDATE ON public.student_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

-- Families can view feedback for their own students
DROP POLICY IF EXISTS "Families can view feedback for their students" ON public.student_feedback;
CREATE POLICY "Families can view feedback for their students"
  ON public.student_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.families f ON f.family_id = s.family_id
      WHERE s.student_id = student_feedback.student_id
        AND f.owner_user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

-- Only admins can create feedback
DROP POLICY IF EXISTS "Admins can create student feedback" ON public.student_feedback;
CREATE POLICY "Admins can create student feedback"
  ON public.student_feedback FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND author_user_id = auth.uid());

-- Only admins can update feedback
DROP POLICY IF EXISTS "Admins can update student feedback" ON public.student_feedback;
CREATE POLICY "Admins can update student feedback"
  ON public.student_feedback FOR UPDATE
  USING (is_admin(auth.uid()));

-- Only admins can delete feedback
DROP POLICY IF EXISTS "Admins can delete student feedback" ON public.student_feedback;
CREATE POLICY "Admins can delete student feedback"
  ON public.student_feedback FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON public.student_feedback TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.student_feedback TO authenticated;
