import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://lbmartialarts.com',
  'https://www.lbmartialarts.com',
])

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.lbmartialarts.com'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
  )
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: cors })

  const supabase = adminClient()

  const { data: isOwner } = await supabase.rpc('is_owner', { user_uuid: user.id })
  if (!isOwner) return new Response('Forbidden', { status: 403, headers: cors })

  const { email, name } = await req.json()
  if (!email || typeof email !== 'string') {
    return new Response('Missing email', { status: 400, headers: cors })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const { error: regError } = await supabase
    .from('registered_emails')
    .upsert(
      {
        email: normalizedEmail,
        invited_by_user_id: user.id,
        invited_at: new Date().toISOString(),
        invitation_status: 'invited',
        invited_as_role: 'admin',
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )
  if (regError) {
    console.error('[invite-admin] register email error:', regError)
    return new Response(JSON.stringify({ error: regError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const appUrl = Deno.env.get('APP_URL')
  const inviteOptions: { redirectTo?: string; data?: Record<string, string> } = {}
  if (appUrl) inviteOptions.redirectTo = `${appUrl}/admin`
  if (name && typeof name === 'string') inviteOptions.data = { display_name: name.trim() }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail,
    inviteOptions
  )
  if (inviteError) {
    console.error('[invite-admin] inviteUserByEmail error:', JSON.stringify(inviteError))
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (inviteData?.user?.id) {
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      inviteData.user.id,
      { email_confirm: true }
    )
    if (confirmError) {
      console.error('[invite-admin] email confirm error:', JSON.stringify(confirmError))
      return new Response(JSON.stringify({ error: confirmError.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
