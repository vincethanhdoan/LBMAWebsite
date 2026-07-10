-- Grant service_role the permissions it needs to read/write registered_emails.
-- The edge function (invite-family) uses the service role key and must be able
-- to upsert this table directly without going through a security-definer RPC.

GRANT SELECT, INSERT, UPDATE ON public.registered_emails TO service_role;
