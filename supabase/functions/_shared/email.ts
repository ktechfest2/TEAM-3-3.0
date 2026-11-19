// Auth email templates + Resend sender. Template rendering is pure so it can be unit-tested.

export type EmailActionType =
  | "signup" | "magiclink" | "recovery" | "invite" | "email_change" | "reauthentication" | string;

export interface RenderedEmail { subject: string; html: string; text: string }

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const COPY: Record<string, { subject: string; lead: string }> = {
  signup:           { subject: "Confirm your Votepaddie account", lead: "Use this code to finish creating your account." },
  magiclink:        { subject: "Your Votepaddie sign-in code",    lead: "Use this code to sign in." },
  recovery:         { subject: "Your Votepaddie sign-in code",    lead: "Use this code to get back into your account." },
  invite:           { subject: "You're invited to Votepaddie",    lead: "Use this code to accept your invite." },
  email_change:     { subject: "Confirm your new email",          lead: "Use this code to confirm your new email address." },
  reauthentication: { subject: "Confirm it's you",                lead: "Use this code to confirm a sensitive action." },
};

export function renderAuthEmail(type: EmailActionType, token: string, appName = "Votepaddie"): RenderedEmail {
  if (!/^\d{4,10}$/.test(token)) throw new Error("invalid token format");
  const c = COPY[type] ?? COPY.magiclink;
  const spaced = token.length === 6 ? `${token.slice(0, 3)} ${token.slice(3)}` : token;
  const text = `${c.lead}\n\nYour ${appName} code: ${spaced}\n\nIt expires in 10 minutes. If you didn't ask for this, ignore this email - nobody can sign in without the code.\n\n${appName} is an independent civic tool and is not affiliated with INEC.`;
  const html = `<!doctype html><html><body style="margin:0;background:#060507;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px;background:#0f0e10;border:1px solid #232225;border-radius:20px;padding:32px;">
<tr><td style="color:#CBCFD2;font-size:15px;letter-spacing:.02em;">${esc(appName)}</td></tr>
<tr><td style="color:#f2f3f4;font-size:22px;font-weight:600;padding-top:16px;">${esc(c.lead)}</td></tr>
<tr><td style="padding:24px 0;"><div style="font-size:36px;font-weight:700;letter-spacing:.18em;color:#060507;background:#F74B01;border-radius:14px;padding:16px 0;text-align:center;">${esc(spaced)}</div></td></tr>
<tr><td style="color:#9a9ea1;font-size:13px;line-height:1.5;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</td></tr>
<tr><td style="color:#6d7073;font-size:12px;padding-top:20px;">${esc(appName)} is an independent civic tool and is not affiliated with INEC.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: c.subject, html, text };
}

export async function sendViaResend(opts: { apiKey: string; from: string; to: string; email: RenderedEmail }): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.email.subject, html: opts.email.html, text: opts.email.text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
