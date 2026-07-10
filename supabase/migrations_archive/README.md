# Archived migrations (pre-baseline)

These files are the pre-baseline migration history, kept for reference only.
The live database was patched out-of-band over time, so this chain no longer
replays cleanly against a fresh database (columns were added directly, several
version numbers are duplicated, and ordering conflicts exist).

They have been superseded by a single introspected snapshot,
`supabase/migrations/20260710000000_baseline.sql`, which was generated from the
live database on 2026-07-10. Start all new migrations after that baseline.

One live object is deliberately absent from the baseline: the
`send-message-notification` webhook trigger on `public.messages`. It is a
Supabase dashboard-managed database webhook that embeds a webhook secret, so
it cannot live in the repo. When rebuilding an environment, recreate it in
the dashboard (Database → Webhooks) pointing at the send-email function.
