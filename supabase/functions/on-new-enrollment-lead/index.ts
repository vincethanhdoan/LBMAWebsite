import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY       — your Resend API key
//   ADMIN_NOTIFICATION_EMAIL — email address to notify on new leads
//   FROM_EMAIL           — sender address (e.g. noreply@yourdomain.com)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@lbmaa.com";
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");

Deno.serve(async (req: Request) => {
  // Always return 200 so the DB trigger doesn't fail on retries
  try {
    if (!RESEND_API_KEY || !ADMIN_EMAIL) {
      console.error("on-new-enrollment-lead: missing RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL");
      return new Response("OK", { status: 200 });
    }

    const lead = await req.json();
    const studentLine = lead.student_name
      ? `<p><strong>Student:</strong> ${lead.student_name}${lead.student_age ? `, age ${lead.student_age}` : ""}</p>`
      : "";
    const phoneLine = lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : "";
    const messageLine = lead.message ? `<p><strong>Message:</strong><br/>${lead.message}</p>` : "";

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>New Enrollment Inquiry</h2>
        <p><strong>Name:</strong> ${lead.parent_name}</p>
        <p><strong>Email:</strong> ${lead.parent_email}</p>
        ${phoneLine}
        ${studentLine}
        ${messageLine}
        <hr/>
        <p style="color:#666;">Log in to the admin portal to review and approve this inquiry.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Enrollment Inquiry — ${lead.parent_name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("on-new-enrollment-lead: Resend error:", errText);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("on-new-enrollment-lead error:", err);
    return new Response("OK", { status: 200 });
  }
});
