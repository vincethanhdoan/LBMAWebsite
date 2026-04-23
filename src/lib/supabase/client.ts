import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // We handle magic-link sessions manually in useAuth to avoid race conditions
    detectSessionInUrl: false,
  },
});

export type EnrollmentLeadInput = {
  parentName: string;
  parentEmail: string;
  phone?: string;
  message?: string;
  sourcePage?: string;
  children: Array<{ name: string; age: number }>;
};

/**
 * Returns Authorization headers for calling Supabase Edge Functions as the
 * current authenticated user. Returns null if there is no active session.
 */
export async function edgeFunctionUserAuthHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Call check_email_has_account via REST with a hard timeout (AbortController).
 * Use this instead of supabase.rpc() when the client's request may hang (e.g. PostgREST/schema cache).
 */
export async function checkEmailHasAccountWithTimeout(
  email: string,
  timeoutMs: number
): Promise<{ data: boolean | null; error: { message: string } | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_email_has_account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ check_email: email.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text();
      let msg = res.statusText;
      try {
        const j = JSON.parse(errBody);
        if (j.message) msg = j.message;
      } catch {
        // ignore
      }
      return { data: null, error: { message: msg } };
    }
    const data = await res.json();
    const value =
      data === true || data === false
        ? data
        : Array.isArray(data) && data.length === 1 && (data[0] === true || data[0] === false)
          ? data[0]
          : null;
    return { data: value, error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      return { data: null, error: { message: "Verification timed out." } };
    }
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Network error" },
    };
  }
}

export async function submitEnrollmentLeadWithTimeout(
  input: EnrollmentLeadInput,
  timeoutMs: number
): Promise<{ data: string | null; error: { message: string } | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_enrollment_lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        p_parent_name: input.parentName,
        p_parent_email: input.parentEmail,
        p_phone: input.phone ?? null,
        p_message: input.message ?? null,
        p_source_page: input.sourcePage ?? "contact",
        p_children: input.children,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text();
      let msg = res.statusText;
      try {
        const j = JSON.parse(errBody);
        if (j.message) msg = j.message;
      } catch {
        // ignore parse failures
      }
      return { data: null, error: { message: msg } };
    }

    const data = await res.json();
    const leadId = typeof data === "string" ? data : null;
    return { data: leadId, error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      return { data: null, error: { message: "Submission timed out. Please try again." } };
    }
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Network error" },
    };
  }
}
