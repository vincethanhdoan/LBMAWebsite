-- Pin search_path on trigger/helper functions flagged by the Supabase security linter.
-- ALTER FUNCTION ... SET search_path leaves the function body untouched; it only
-- fixes the resolution schema so the functions are not vulnerable to search_path abuse.

ALTER FUNCTION public.set_primary_guardian(uuid) SET search_path = public;
ALTER FUNCTION public.update_conversation_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
