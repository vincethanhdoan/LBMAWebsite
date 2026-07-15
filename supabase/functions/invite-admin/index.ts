import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://lbmartialarts.com',
  'https://www.lbmartialarts.com',
  ...(Deno.env.get('EXTRA_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]);

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://www.lbmartialarts.com';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

function jsonError(
  message: string,
  status: number,
  cors: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function jsonOk(cors: Record<string, string>) {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

type Lookup = {
  user_id: string;
  role: string;
  is_active: boolean;
  has_signed_in: boolean;
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonError('Method not allowed', 405, cors);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError('Unauthorized', 401, cors);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return jsonError('Unauthorized', 401, cors);

  const supabase = adminClient();

  const { data: isOwner } = await supabase.rpc('is_owner', {
    user_uuid: user.id,
  });
  if (!isOwner) return jsonError('Owner access required', 403, cors);

  let body: { action?: string; email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid request body', 400, cors);
  }
  const { action = 'invite', email, name } = body;
  if (
    !email ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return jsonError('Enter a valid email address', 400, cors);
  }
  const normalizedEmail = email.trim().toLowerCase();

  const { data: lookupRows, error: lookupError } = await supabase.rpc(
    'admin_lookup_email',
    {
      p_email: normalizedEmail,
    },
  );
  if (lookupError) {
    console.error('[invite-admin] lookup error:', lookupError);
    return jsonError('Something went wrong. Please try again.', 500, cors);
  }
  const existing: Lookup | undefined = lookupRows?.[0];

  if (action === 'resend') {
    if (!existing || existing.role !== 'admin')
      return jsonError('No admin invite found for this email', 404, cors);
    if (existing.has_signed_in)
      return jsonError('This admin has already signed in', 409, cors);
    if (!existing.is_active)
      return jsonError(
        'This admin is deactivated. Reactivate them instead.',
        409,
        cors,
      );

    const appUrl = Deno.env.get('APP_URL')?.replace(/\/+$/, '');
    const bareClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } },
    );
    const { error: otpError } = await bareClient.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        ...(appUrl ? { emailRedirectTo: `${appUrl}/admin` } : {}),
      },
    });
    if (otpError) {
      console.error(
        '[invite-admin] resend otp error:',
        JSON.stringify(otpError),
      );
      return jsonError(
        'Could not send the email. Please try again shortly.',
        500,
        cors,
      );
    }
    await supabase
      .from('registered_emails')
      .update({
        invited_at: new Date().toISOString(),
        invited_by_user_id: user.id,
      })
      .eq('email', normalizedEmail);
    return jsonOk(cors);
  }

  if (action === 'revoke') {
    if (!existing || existing.role !== 'admin')
      return jsonError('No admin invite found for this email', 404, cors);
    if (existing.has_signed_in) {
      return jsonError(
        'This admin has already signed in. Deactivate them instead.',
        409,
        cors,
      );
    }
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      existing.user_id,
    );
    if (deleteError) {
      console.error(
        '[invite-admin] revoke error:',
        JSON.stringify(deleteError),
      );
      return jsonError(
        'Could not revoke the invite. Please try again.',
        500,
        cors,
      );
    }
    return jsonOk(cors);
  }

  if (action !== 'invite') return jsonError('Unknown action', 400, cors);

  if (existing) {
    if (existing.role === 'family') {
      return jsonError('This email belongs to a family account', 409, cors);
    }
    if (!existing.is_active) {
      return jsonError(
        'This email belongs to a deactivated admin. Reactivate them instead.',
        409,
        cors,
      );
    }
    if (!existing.has_signed_in) {
      return jsonError(
        "This admin was already invited and hasn't signed in yet. Use Resend invite instead.",
        409,
        cors,
      );
    }
    return jsonError('This email is already an admin', 409, cors);
  }

  // The registered_emails row must exist with invited_as_role='admin' BEFORE
  // inviteUserByEmail runs, because the on_auth_user_created trigger reads it.
  const { data: priorRow } = await supabase
    .from('registered_emails')
    .select(
      'email, invited_by_user_id, invited_at, invitation_status, invited_as_role',
    )
    .eq('email', normalizedEmail)
    .maybeSingle();

  const { error: regError } = await supabase.from('registered_emails').upsert(
    {
      email: normalizedEmail,
      invited_by_user_id: user.id,
      invited_at: new Date().toISOString(),
      invitation_status: 'invited',
      invited_as_role: 'admin',
    },
    { onConflict: 'email', ignoreDuplicates: false },
  );
  if (regError) {
    console.error('[invite-admin] register email error:', regError);
    return jsonError('Something went wrong. Please try again.', 500, cors);
  }

  const appUrl = Deno.env.get('APP_URL')?.replace(/\/+$/, '');
  const inviteOptions: { redirectTo?: string; data?: Record<string, string> } =
    {};
  if (appUrl) inviteOptions.redirectTo = `${appUrl}/admin`;
  if (name && typeof name === 'string' && name.trim())
    inviteOptions.data = { display_name: name.trim() };

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(normalizedEmail, inviteOptions);
  if (inviteError) {
    console.error(
      '[invite-admin] inviteUserByEmail error:',
      JSON.stringify(inviteError),
    );
    // Undo the registered_emails write so a failed invite can't be claimed later.
    if (priorRow) {
      await supabase
        .from('registered_emails')
        .update(priorRow)
        .eq('email', normalizedEmail);
    } else {
      await supabase
        .from('registered_emails')
        .delete()
        .eq('email', normalizedEmail);
    }
    return jsonError(
      'Could not send the invite. Please try again shortly.',
      500,
      cors,
    );
  }

  if (inviteData?.user?.id) {
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      inviteData.user.id,
      { email_confirm: true },
    );
    if (confirmError) {
      console.error(
        '[invite-admin] email confirm error:',
        JSON.stringify(confirmError),
      );
      return jsonError(
        'Invite sent, but confirming the account failed. Ask them to use the portal login.',
        500,
        cors,
      );
    }
  }

  return jsonOk(cors);
});
