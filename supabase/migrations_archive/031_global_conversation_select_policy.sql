-- Allow all authenticated users to see the global conversation
-- (needed so they can be auto-added as members on first load)
CREATE POLICY "Authenticated users can view global conversations"
  ON conversations FOR SELECT
  USING (type = 'global' AND auth.role() = 'authenticated');
