import { getSupabase } from "@/lib/supabase/client";
import { invokeFn } from "@/lib/supabase/functions";

export async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  const s = data.session;
  return s && !s.user.is_anonymous ? s : null;
}

/** One flow for sign-up and sign-in: a 6-digit code emailed through Resend (via the Auth hook). */
export async function sendEmailOtp(email: string, captchaToken?: string) {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, captchaToken },
  });
  if (error) throw new Error(friendly(error.message));
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await getSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
  if (error) throw new Error(friendly(error.message));
  return data.session;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error(error.message);
}

export async function deleteAccount() {
  await invokeFn<{ ok: true }>("delete-account", { confirm: "DELETE" });
  await getSupabase().auth.signOut({ scope: "local" }).catch(() => {});
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate") || m.includes("too many") || m.includes("seconds")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("captcha")) return "Human check failed. Please try again.";
  if (m.includes("expired") || m.includes("invalid")) return "That code didn't work. Check it and try again.";
  return "Couldn't complete that. Please try again.";
}
