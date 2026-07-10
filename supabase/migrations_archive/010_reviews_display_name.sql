-- Clear all existing reviews and add display_name column
TRUNCATE TABLE reviews;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS display_name TEXT;
