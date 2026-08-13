-- point the new-lead notification fallback at the new school address
--
-- Same approach as 20260716210000: submit_enrollment_lead's live
-- definition is the source of truth (its history is not linearly
-- replayable), so rewrite it in place, changing only the fallback
-- address. CREATE OR REPLACE preserves existing grants.

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
    'westcoastlosbanos@gmail.com',
    'LosBanosMartialArts@gmail.com'
  );
END $$;
