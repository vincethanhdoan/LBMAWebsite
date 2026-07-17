-- point the new-lead notification fallback at the school address
--
-- submit_enrollment_lead falls back to a personal Gmail when the
-- app.lbmaa_faculty_notification_email setting is unset (it is unset in
-- production). Rewrite the live definition in place, changing only the
-- fallback address: the live DB is the source of truth for this function
-- (its history is not linearly replayable), so a hand-copied full text
-- risks reverting drift. CREATE OR REPLACE preserves existing grants.

DO $$
DECLARE
  src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'submit_enrollment_lead';

  IF src IS NULL THEN
    RAISE EXCEPTION 'submit_enrollment_lead not found';
  END IF;

  EXECUTE replace(
    src,
    'vincethanhdoan@gmail.com',
    'westcoastlosbanos@gmail.com'
  );
END $$;
