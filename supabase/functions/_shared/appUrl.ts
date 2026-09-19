// supabase/functions/_shared/appUrl.ts
// The public site's base URL, used to build links back into the app (booking
// change/cancel links, the admin portal, the calendar-file description, etc).
// Shared so the trailing-slash trim and the "must be configured" guard live
// in exactly one place instead of drifting between functions.

export function getAppUrl(): string {
  const url = Deno.env.get('APP_URL');
  if (!url) throw new Error('APP_URL environment variable is not set');
  return url.replace(/\/+$/, '');
}
