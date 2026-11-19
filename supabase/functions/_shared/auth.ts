import { HttpError } from "./cors.ts";
import { adminClient } from "./supabase.ts";

export interface Caller { id: string; email: string | undefined }

/** Caller must hold a valid JWT of a real (non-anonymous) user. */
export async function requireRealUser(req: Request): Promise<Caller> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "sign in required");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "invalid session");
  if (data.user.is_anonymous) throw new HttpError(403, "real account required");
  return { id: data.user.id, email: data.user.email };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Internal callers (pg_cron / database triggers) present x-cron-secret. */
export function requireCron(req: Request): void {
  const secret = Deno.env.get("CRON_SECRET") ?? "";
  const got = req.headers.get("x-cron-secret") ?? "";
  if (!secret || !timingSafeEqual(secret, got)) throw new HttpError(401, "unauthorized");
}

/** Simple per-user hourly quota backed by public.ai_usage (protects the free Groq tier). */
export async function enforceAiQuota(userId: string, kind: "translate" | "transcribe", perHour: number): Promise<void> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await adminClient().from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("kind", kind).gte("created_at", since);
  if ((count ?? 0) >= perHour) throw new HttpError(429, "hourly limit reached, try again later");
  await adminClient().from("ai_usage").insert({ user_id: userId, kind });
}
