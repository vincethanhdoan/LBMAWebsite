-- Allow 'feedback' as a valid section in user_section_last_seen.
-- The original CHECK constraint only included 'announcements' and 'blog',
-- causing markSectionSeen('feedback') to silently fail at the DB level.
ALTER TABLE user_section_last_seen
  DROP CONSTRAINT IF EXISTS user_section_last_seen_section_check;

ALTER TABLE user_section_last_seen
  ADD CONSTRAINT user_section_last_seen_section_check
  CHECK (section IN ('announcements', 'blog', 'feedback'));
