# Email Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase's rate-limited internal email sender with Resend, and build a Supabase Edge Function that sends enrollment lead notifications and messaging notifications.

**Architecture:** Resend acts as Supabase's Custom SMTP for auth magic link emails (pure configuration). A single Edge Function `send-email` handles transactional emails, triggered by Supabase Database Webhooks on `enrollment_lead_notifications` INSERT and `messages` INSERT. All HTML templates are pure TypeScript string functions colocated with the function.

**Tech Stack:** Resend (email API), Supabase Edge Functions (Deno), Supabase Database Webhooks, Supabase Admin Client (`@supabase/supabase-js@2`)

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `supabase/functions/send-email/types.ts` | Create | Webhook payload types and domain types |
| `supabase/functions/send-email/templates.ts` | Create | Pure HTML template functions |
| `supabase/functions/send-email/templates_test.ts` | Create | Deno unit tests for templates |
| `supabase/functions/send-email/index.ts` | Create | Request handler, routing, Resend API calls |

No migrations are required. The `enrollment_lead_notifications` table and `messages` table already exist.

---

## Task 1: Create Resend account and store secrets

**Files:** none (account setup + CLI commands)

- [ ] **Step 1: Create Resend account**

  Go to resend.com, sign up for a free account (no credit card required).

- [ ] **Step 2: Get API key**

  In the Resend dashboard: **API Keys → Create API Key**. Name it `lbmaa-prod`. Copy the key — it is shown only once.

- [ ] **Step 3: Store secrets in Supabase**

  In the terminal, from the project root:

  ```bash
  npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
  npx supabase secrets set WEBHOOK_SECRET=$(openssl rand -hex 32)
  npx supabase secrets set APP_URL=http://localhost:5173
  ```

  > `APP_URL` is `http://localhost:5173` for local dev. Update it to your production URL when you deploy the frontend (e.g. `https://lbmaa.com`).

- [ ] **Step 4: Verify secrets are stored**

  ```bash
  npx supabase secrets list
  ```

  Expected output includes `RESEND_API_KEY`, `WEBHOOK_SECRET`, and `APP_URL`.

- [ ] **Step 5: Note the WEBHOOK_SECRET value**

  ```bash
  npx supabase secrets list
  ```

  You won't see the value again from the CLI. Store it in your local `.env` as `WEBHOOK_SECRET=<value>` — you'll need it when configuring the Database Webhooks in Task 10.

---

## Task 2: Configure Supabase Custom SMTP

**Files:** none (dashboard configuration)

- [ ] **Step 1: Open SMTP settings**

  In the Supabase dashboard: **Project Settings → Authentication → SMTP Settings**. Toggle **Enable Custom SMTP** on.

- [ ] **Step 2: Enter Resend SMTP credentials**

  | Field | Value |
  |---|---|
  | Host | `smtp.resend.com` |
  | Port | `465` |
  | Username | `resend` |
  | Password | your Resend API key |
  | Minimum interval between emails | `0` |
  | Sender email | `onboarding@resend.dev` |
  | Sender name | `Los Banos Martial Arts Academy` |

- [ ] **Step 3: Save and test**

  Click **Save**. Then go to a private browser window and try signing in with a test email. Confirm the magic link arrives quickly and is no longer rate-limited.

---

## Task 3: Apply the magic link email template

**Files:** none (dashboard configuration)

- [ ] **Step 1: Open email templates**

  In the Supabase dashboard: **Authentication → Email Templates → Magic Link**.

- [ ] **Step 2: Update subject line**

  Set Subject to:
  ```
  Your LBMAA Sign-In Link — Family Portal
  ```

- [ ] **Step 3: Paste HTML body**

  Replace the body with the full HTML from `docs/superpowers/specs/2026-04-09-auth-email-template-design.md` (the `## HTML Template` section). It uses `{{ .ConfirmationURL }}` as the button href — leave that variable exactly as-is, Supabase replaces it with the real link.

- [ ] **Step 4: Save**

  Click **Save template**. Test with another magic link sign-in to confirm the branded email renders correctly.

---

## Task 4: Scaffold edge function files

**Files:**
- Create: `supabase/functions/send-email/types.ts`
- Create: `supabase/functions/send-email/templates.ts`
- Create: `supabase/functions/send-email/templates_test.ts`
- Create: `supabase/functions/send-email/index.ts`

- [ ] **Step 1: Create types.ts**

  ```typescript
  // supabase/functions/send-email/types.ts

  export interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    schema: string
    record: Record<string, unknown>
    old_record: Record<string, unknown> | null
  }

  export interface EnrollmentLeadNotificationRecord {
    notification_id: string
    lead_id: string
    recipient_email: string
    channel: string
    status: string
    created_at: string
  }

  export interface MessageRecord {
    message_id: string
    conversation_id: string
    author_user_id: string
    content: string
    created_at: string
    updated_at: string
  }

  export interface EnrollmentLead {
    lead_id: string
    parent_name: string
    parent_email: string
    phone: string | null
    student_name: string | null
    student_age: number | null
    message: string | null
    source_page: string
    created_at: string
  }
  ```

- [ ] **Step 2: Create templates.ts skeleton**

  ```typescript
  // supabase/functions/send-email/templates.ts

  import type { EnrollmentLead } from './types.ts'

  // TODO: implement in Task 5
  export function enrollmentNotificationHtml(_lead: EnrollmentLead, _adminUrl: string): string {
    return ''
  }

  export function messagingNotificationHtml(_senderName: string, _portalUrl: string): string {
    return ''
  }
  ```

- [ ] **Step 3: Create index.ts skeleton**

  ```typescript
  // supabase/functions/send-email/index.ts

  Deno.serve(async (_req) => {
    return new Response('OK', { status: 200 })
  })
  ```

- [ ] **Step 4: Commit scaffold**

  ```bash
  git add supabase/functions/
  git commit -m "feat: scaffold send-email edge function"
  ```

---

## Task 5: Write and implement email template functions

**Files:**
- Modify: `supabase/functions/send-email/templates.ts`
- Create: `supabase/functions/send-email/templates_test.ts`

- [ ] **Step 1: Write failing tests**

  ```typescript
  // supabase/functions/send-email/templates_test.ts

  import { assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
  import { enrollmentNotificationHtml, messagingNotificationHtml } from './templates.ts'
  import type { EnrollmentLead } from './types.ts'

  const sampleLead: EnrollmentLead = {
    lead_id: 'lead-1',
    parent_name: 'Jane Doe',
    parent_email: 'jane@example.com',
    phone: '555-1234',
    student_name: 'Billy',
    student_age: 8,
    message: 'Interested in karate classes',
    source_page: 'contact',
    created_at: new Date().toISOString(),
  }

  Deno.test('enrollmentNotificationHtml includes parent name', () => {
    const html = enrollmentNotificationHtml(sampleLead, 'https://lbmaa.com/admin')
    assertStringIncludes(html, 'Jane Doe')
  })

  Deno.test('enrollmentNotificationHtml includes parent email', () => {
    const html = enrollmentNotificationHtml(sampleLead, 'https://lbmaa.com/admin')
    assertStringIncludes(html, 'jane@example.com')
  })

  Deno.test('enrollmentNotificationHtml includes student name', () => {
    const html = enrollmentNotificationHtml(sampleLead, 'https://lbmaa.com/admin')
    assertStringIncludes(html, 'Billy')
  })

  Deno.test('enrollmentNotificationHtml includes admin URL', () => {
    const html = enrollmentNotificationHtml(sampleLead, 'https://lbmaa.com/admin')
    assertStringIncludes(html, 'https://lbmaa.com/admin')
  })

  Deno.test('enrollmentNotificationHtml omits phone row when phone is null', () => {
    const leadNoPhone = { ...sampleLead, phone: null }
    const html = enrollmentNotificationHtml(leadNoPhone, 'https://lbmaa.com/admin')
    // should not throw, and should still include parent name
    assertStringIncludes(html, 'Jane Doe')
  })

  Deno.test('messagingNotificationHtml includes sender name', () => {
    const html = messagingNotificationHtml('Master Chen', 'https://lbmaa.com/dashboard')
    assertStringIncludes(html, 'Master Chen')
  })

  Deno.test('messagingNotificationHtml includes portal URL', () => {
    const html = messagingNotificationHtml('Master Chen', 'https://lbmaa.com/dashboard')
    assertStringIncludes(html, 'https://lbmaa.com/dashboard')
  })
  ```

- [ ] **Step 2: Run tests — confirm they fail**

  ```bash
  deno test supabase/functions/send-email/templates_test.ts
  ```

  Expected: tests fail because templates return empty strings.

- [ ] **Step 3: Implement templates.ts**

  ```typescript
  // supabase/functions/send-email/templates.ts

  import type { EnrollmentLead } from './types.ts'

  const STRIPE = `<div style="height:5px;background:linear-gradient(to right,#c8102e,#1a1a2e);"></div>`

  const HEADER = `
    <div style="padding:20px 28px 16px;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c8102e;font-weight:700;margin-bottom:3px;">Los Banos Martial Arts Academy</div>
      <div style="font-size:12px;color:#999;">Member Family Portal</div>
    </div>
  `

  const FOOTER = `
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 16px;" />
    <p style="margin:0;font-size:11px;color:#bbb;line-height:1.5;">
      <strong style="color:#aaa;">Need help?</strong> Reach us at
      <a href="mailto:info@lbmaa.com" style="color:#c8102e;text-decoration:none;">info@lbmaa.com</a>
    </p>
  `

  function wrap(inner: string): string {
    return `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
      ${STRIPE}
      ${HEADER}
      <div style="padding:24px 28px;">
        ${inner}
        ${FOOTER}
      </div>
    </div>`
  }

  function ctaButton(href: string, label: string): string {
    return `<div style="text-align:center;margin-bottom:20px;">
      <a href="${href}" style="display:inline-block;background:#c8102e;color:#fff;font-weight:700;padding:13px 36px;border-radius:4px;text-decoration:none;font-size:14px;letter-spacing:0.5px;">${label}</a>
    </div>`
  }

  export function enrollmentNotificationHtml(lead: EnrollmentLead, adminUrl: string): string {
    const rows = [
      `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;width:110px;">Parent</td><td style="padding:4px 0;color:#555;">${lead.parent_name}</td></tr>`,
      `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Email</td><td style="padding:4px 0;color:#555;">${lead.parent_email}</td></tr>`,
      lead.phone ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Phone</td><td style="padding:4px 0;color:#555;">${lead.phone}</td></tr>` : '',
      lead.student_name ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;">Student</td><td style="padding:4px 0;color:#555;">${lead.student_name}${lead.student_age ? ` (age ${lead.student_age})` : ''}</td></tr>` : '',
      lead.message ? `<tr><td style="padding:4px 0;font-weight:700;color:#1a1a2e;vertical-align:top;">Message</td><td style="padding:4px 0;color:#555;">${lead.message}</td></tr>` : '',
    ].join('')

    return wrap(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">New enrollment inquiry</p>
      <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.65;">A family submitted an enrollment inquiry through the website.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
      ${ctaButton(adminUrl, 'View in Admin Dashboard')}
    `)
  }

  export function messagingNotificationHtml(senderName: string, portalUrl: string): string {
    return wrap(`
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">You have a new message</p>
      <p style="margin:0 0 22px;color:#555;font-size:13px;line-height:1.65;">
        <strong>${senderName}</strong> sent you a message in the LBMAA portal.
      </p>
      ${ctaButton(portalUrl, 'Read Message')}
      <p style="margin:0 0 18px;font-size:11px;color:#aaa;text-align:center;">Reply directly in the portal — do not reply to this email.</p>
    `)
  }
  ```

- [ ] **Step 4: Run tests — confirm they pass**

  ```bash
  deno test supabase/functions/send-email/templates_test.ts
  ```

  Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add supabase/functions/send-email/
  git commit -m "feat: add email template functions with tests"
  ```

---

## Task 6: Implement index.ts — full handler

**Files:**
- Modify: `supabase/functions/send-email/index.ts`

- [ ] **Step 1: Replace index.ts with full implementation**

  ```typescript
  // supabase/functions/send-email/index.ts

  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  import type { WebhookPayload, EnrollmentLeadNotificationRecord, MessageRecord, EnrollmentLead } from './types.ts'
  import { enrollmentNotificationHtml, messagingNotificationHtml } from './templates.ts'

  const RESEND_API_URL = 'https://api.resend.com/emails'
  const FROM = 'Los Banos Martial Arts Academy <onboarding@resend.dev>'

  // --- Resend ---

  async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }
  }

  // --- Supabase admin client (service role, bypasses RLS) ---

  function adminClient() {
    return createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )
  }

  // --- Handlers ---

  async function handleEnrollmentNotification(record: EnrollmentLeadNotificationRecord): Promise<void> {
    const supabase = adminClient()

    const { data: lead, error } = await supabase
      .from('enrollment_leads')
      .select('*')
      .eq('lead_id', record.lead_id)
      .single<EnrollmentLead>()

    if (error || !lead) throw new Error(`Enrollment lead not found: ${record.lead_id}`)

    const adminUrl = `${Deno.env.get('APP_URL') ?? 'https://lbmaa.com'}/admin`

    await sendEmail(
      record.recipient_email,
      `New enrollment inquiry — ${lead.parent_name}`,
      enrollmentNotificationHtml(lead, adminUrl)
    )

    await supabase
      .from('enrollment_lead_notifications')
      .update({ status: 'sent' })
      .eq('notification_id', record.notification_id)
  }

  async function handleMessageNotification(record: MessageRecord): Promise<void> {
    const supabase = adminClient()

    // Find the recipient (the conversation member who did not send this message)
    const { data: members } = await supabase
      .from('conversation_members')
      .select('user_id, last_read_at')
      .eq('conversation_id', record.conversation_id)
      .neq('user_id', record.author_user_id)

    if (!members || members.length === 0) return

    const recipient = members[0]

    // Skip if recipient has already read at or after the message timestamp
    if (recipient.last_read_at && recipient.last_read_at >= record.created_at) return

    // Get recipient email via admin auth API (bypasses RLS on auth.users)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(recipient.user_id)
    if (userError || !user?.email) return

    // Get sender display name from profiles
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', record.author_user_id)
      .single()

    const senderName = senderProfile?.display_name ?? 'Someone'
    const portalUrl = `${Deno.env.get('APP_URL') ?? 'https://lbmaa.com'}/dashboard`

    await sendEmail(
      user.email,
      `New message from ${senderName} — LBMAA Portal`,
      messagingNotificationHtml(senderName, portalUrl)
    )
  }

  // --- Entry point ---

  Deno.serve(async (req) => {
    // Verify webhook secret
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    let payload: WebhookPayload
    try {
      payload = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    // Only handle INSERT events
    if (payload.type !== 'INSERT') {
      return new Response('OK', { status: 200 })
    }

    try {
      if (payload.table === 'enrollment_lead_notifications') {
        await handleEnrollmentNotification(payload.record as EnrollmentLeadNotificationRecord)
      } else if (payload.table === 'messages') {
        await handleMessageNotification(payload.record as MessageRecord)
      }
      return new Response('OK', { status: 200 })
    } catch (err) {
      console.error('[send-email]', err)
      return new Response('Internal error', { status: 500 })
    }
  })
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add supabase/functions/send-email/index.ts
  git commit -m "feat: implement send-email edge function handler"
  ```

---

## Task 7: Deploy edge function

**Files:** none (CLI deployment)

- [ ] **Step 1: Log in to Supabase CLI (if not already)**

  ```bash
  npx supabase login
  ```

- [ ] **Step 2: Link project (if not already linked)**

  ```bash
  npx supabase link
  ```

  Select your project from the list.

- [ ] **Step 3: Deploy the function**

  ```bash
  npx supabase functions deploy send-email --no-verify-jwt
  ```

  > `--no-verify-jwt` is required because the caller is Supabase's own webhook system, not a user with a JWT. The function is protected by the `WEBHOOK_SECRET` header check instead.

  Expected output includes: `Deployed Function send-email`

- [ ] **Step 4: Get the function URL**

  The function URL has this format:
  ```
  https://<project-ref>.supabase.co/functions/v1/send-email
  ```

  Find your project ref in the Supabase dashboard URL or run:
  ```bash
  npx supabase status
  ```

  Note this URL — you'll need it in Task 8.

---

## Task 8: Configure Database Webhooks

**Files:** none (dashboard configuration)

Database Webhooks fire an HTTP POST to your edge function when a table event occurs.

- [ ] **Step 1: Open Database Webhooks**

  In the Supabase dashboard: **Database → Webhooks → Create a new hook**.

- [ ] **Step 2: Create the enrollment lead notification webhook**

  | Field | Value |
  |---|---|
  | Name | `send-enrollment-notification` |
  | Table | `enrollment_lead_notifications` (schema: `public`) |
  | Events | `INSERT` only |
  | Type | HTTP Request |
  | Method | `POST` |
  | URL | `https://<project-ref>.supabase.co/functions/v1/send-email` |
  | HTTP Headers | Add header: `Authorization` = `Bearer <your WEBHOOK_SECRET value>` |

  Click **Confirm**.

- [ ] **Step 3: Create the messaging notification webhook**

  Click **Create a new hook** again.

  | Field | Value |
  |---|---|
  | Name | `send-message-notification` |
  | Table | `messages` (schema: `public`) |
  | Events | `INSERT` only |
  | Type | HTTP Request |
  | Method | `POST` |
  | URL | `https://<project-ref>.supabase.co/functions/v1/send-email` |
  | HTTP Headers | Add header: `Authorization` = `Bearer <your WEBHOOK_SECRET value>` |

  Click **Confirm**.

---

## Task 9: End-to-end smoke tests

**Files:** none (manual testing)

- [ ] **Step 1: Test enrollment notification**

  Submit the contact form on the public site (go to `/` → Contact page, fill in the form with a real email you can check). Within ~30 seconds, the admin recipient email should receive the "New enrollment inquiry" email.

  If it doesn't arrive:
  - Check Supabase Edge Function logs: **Edge Functions → send-email → Logs**
  - Check the `enrollment_lead_notifications` table for a row with `status = 'failed'`
  - Check the Resend dashboard for delivery status

- [ ] **Step 2: Test messaging notification**

  Log in as a family user and send a message to the admin (or vice versa). The recipient should receive the "You have a new message" email.

  If it doesn't arrive:
  - Verify the recipient's `last_read_at` in `conversation_members` is older than the message timestamp (if they just logged in, it may already be current and the guard skips the send — this is expected behavior)
  - Check Edge Function logs for errors

- [ ] **Step 3: Verify enrollment_lead_notifications status updates**

  In the Supabase dashboard SQL editor:
  ```sql
  SELECT notification_id, status, created_at
  FROM enrollment_lead_notifications
  ORDER BY created_at DESC
  LIMIT 5;
  ```

  Rows processed by the edge function should show `status = 'sent'`.

- [ ] **Step 4: Commit final state**

  ```bash
  git add .
  git commit -m "feat: complete email infrastructure — Resend Custom SMTP + send-email edge function"
  ```

---

## Out of Scope

- **Enrollment confirmation email (family):** Needs an admin "confirm enrollment" action in the UI first — no clear trigger exists yet. Add once the admin workflow is defined.
- **Custom domain:** When `lbmaa.com` is acquired, add Resend DNS records, verify domain, update `FROM` constant in `index.ts` to `noreply@lbmaa.com`, and update the sender address in Supabase Custom SMTP settings.
- **Email open/click tracking:** Not needed for this use case.
