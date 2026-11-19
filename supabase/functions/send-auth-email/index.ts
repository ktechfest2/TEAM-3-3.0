// Supabase Auth "Send Email" hook -> Resend. Verifies the Standard Webhooks signature first.
import { verifyWebhook } from "../_shared/webhook.ts";
import { renderAuthEmail, sendViaResend } from "../_shared/email.ts";

interface HookPayload {
  user: { email?: string; new_email?: string };
  email_data: { token?: string; token_new?: string; email_action_type: string };
}

const fail = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { http_code: status, message } }), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail(405, "method not allowed");
  const body = await req.text();
  try {
    await verifyWebhook(Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "", req.headers, body);
  } catch {
    return fail(401, "invalid signature");
  }
  try {
    const { user, email_data } = JSON.parse(body) as HookPayload;
    const type = email_data.email_action_type;
    // For email change, the code for the NEW address is token_new; otherwise token.
    const to = type === "email_change" && email_data.token_new && user.new_email ? user.new_email : user.email;
    const token = type === "email_change" && email_data.token_new && user.new_email ? email_data.token_new : email_data.token;
    if (!to || !token) return fail(400, "missing recipient or token");

    await sendViaResend({
      apiKey: Deno.env.get("RESEND_API_KEY") ?? "",
      from: Deno.env.get("RESEND_FROM") ?? "Votepaddie <onboarding@resend.dev>",
      to,
      email: renderAuthEmail(type, token),
    });
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-auth-email", e instanceof Error ? e.message : e);
    return fail(500, "could not send email");
  }
});
