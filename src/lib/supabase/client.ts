import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // We handle magic-link token_hash exchange in AuthCallback to avoid race conditions
    detectSessionInUrl: false,
  },
});

type EnrollmentLeadInput = {
  parentName: string;
  parentEmail: string;
  phone?: string;
  message?: string;
  sourcePage?: string;
  children: Array<{ name: string; age: number }>;
};

export type TrialBookingParams = {
  parentName: string;
  parentEmail: string;
  phone: string;
  children: Array<{ name: string; age: number }>;
  bookings: Array<{
    program_type: 'little_dragons' | 'youth';
    slot_id: string;
    date: string;
  }>;
  requestId: string;
  language?: 'en' | 'es';
  message?: string;
  sourcePage?: string;
};

export type TrialBookingReceipt = {
  lead_id: string;
  visits: Array<{
    program_type: 'little_dragons' | 'youth';
    booking_token: string;
    appointment_date: string;
    appointment_time: string;
    status: 'scheduled' | 'confirmed';
  }>;
};

function isTrialBookingReceipt(value: unknown): value is TrialBookingReceipt {
  const visits = (value as { visits?: unknown } | null)?.visits;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { lead_id?: unknown }).lead_id === 'string' &&
    Array.isArray(visits) &&
    visits.length > 0
  );
}

/**
 * POSTs to a PostgREST RPC endpoint with a hard timeout (AbortController),
 * returning the raw JSON success payload or a normalized
 * { message, code?, hint? } error. Shared by every *WithTimeout wrapper below;
 * each wrapper owns its own body shape and how it narrows the raw payload to
 * its return type.
 */
async function postRpcWithTimeout(
  rpcName: string,
  body: Record<string, unknown>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<{
  data: unknown;
  error: { message: string; code?: string; hint?: string } | null;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text();
      let msg = res.statusText;
      let code: string | undefined;
      let hint: string | undefined;
      try {
        const j = JSON.parse(errBody);
        if (j.message) msg = j.message;
        if (j.code) code = j.code;
        if (j.hint) hint = j.hint;
      } catch {
        // ignore parse failures
      }
      return { data: null, error: { message: msg, code, hint } };
    }

    return { data: await res.json(), error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { data: null, error: { message: timeoutMessage } };
    }
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : 'Network error' },
    };
  }
}

/**
 * Returns Authorization headers for calling Supabase Edge Functions as the
 * current authenticated user. Returns null if there is no active session.
 */
export async function edgeFunctionUserAuthHeaders(): Promise<Record<
  string,
  string
> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Call check_email_has_account via REST with a hard timeout (AbortController).
 * Use this instead of supabase.rpc() when the client's request may hang (e.g. PostgREST/schema cache).
 */
export async function checkEmailHasAccountWithTimeout(
  email: string,
  timeoutMs: number,
): Promise<{ data: boolean | null; error: { message: string } | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/check_email_has_account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ check_email: email.trim() }),
        signal: controller.signal,
      },
    );
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
        : Array.isArray(data) &&
            data.length === 1 &&
            (data[0] === true || data[0] === false)
          ? data[0]
          : null;
    return { data: value, error: null };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { data: null, error: { message: 'Verification timed out.' } };
    }
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : 'Network error' },
    };
  }
}

const SUBMISSION_TIMEOUT_MESSAGE = 'Submission timed out. Please try again.';

export async function submitEnrollmentLeadWithTimeout(
  input: EnrollmentLeadInput,
  timeoutMs: number,
): Promise<{
  data: string | null;
  error: { message: string; code?: string } | null;
}> {
  const { data, error } = await postRpcWithTimeout(
    'submit_enrollment_lead',
    {
      p_parent_name: input.parentName,
      p_parent_email: input.parentEmail,
      p_phone: input.phone ?? null,
      p_message: input.message ?? null,
      p_source_page: input.sourcePage ?? 'contact',
      p_children: input.children,
    },
    timeoutMs,
    SUBMISSION_TIMEOUT_MESSAGE,
  );
  if (error) return { data: null, error };
  return { data: typeof data === 'string' ? data : null, error: null };
}

export async function submitTrialBookingWithTimeout(
  params: TrialBookingParams,
  timeoutMs: number,
): Promise<{
  data: TrialBookingReceipt | null;
  // `hint` carries the program whose visit could not be booked, when the
  // server could name one; see submit_trial_booking's availability errors.
  error: { message: string; code?: string; hint?: string } | null;
}> {
  const { data, error } = await postRpcWithTimeout(
    'submit_trial_booking',
    {
      p_parent_name: params.parentName,
      p_parent_email: params.parentEmail,
      p_phone: params.phone,
      p_children: params.children,
      p_bookings: params.bookings,
      p_request_id: params.requestId,
      p_language: params.language ?? 'en',
      p_message: params.message ?? null,
      p_source_page: params.sourcePage ?? 'contact',
    },
    timeoutMs,
    SUBMISSION_TIMEOUT_MESSAGE,
  );
  if (error) return { data: null, error };
  return { data: isTrialBookingReceipt(data) ? data : null, error: null };
}
