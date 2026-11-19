// Saves a browser's FCM token and subscribes it to topic channels (national / state / ward).
import { handler, json, HttpError } from "../_shared/cors.ts";
import { requireRealUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { subscribeToTopic } from "../_shared/fcm.ts";

const SAFE = /^[A-Za-z0-9\-_.~]{1,64}$/;

Deno.serve(handler(async (req) => {
  const user = await requireRealUser(req);
  const b = await req.json().catch(() => ({}));
  const admin = adminClient();

  if (b.action === "unregister") {
    if (typeof b.token === "string") await admin.from("push_tokens").delete().eq("token", b.token).eq("user_id", user.id);
    return json(req, { ok: true });
  }

  const token = String(b.token ?? "");
  if (token.length < 20 || token.length > 4096) throw new HttpError(400, "bad token");
  const state = b.state_code && SAFE.test(String(b.state_code)) ? String(b.state_code) : null;
  const ward = b.ward_key && SAFE.test(String(b.ward_key)) ? String(b.ward_key) : null;

  const { error } = await admin.from("push_tokens").upsert(
    { token, user_id: user.id, state_code: state, ward_key: ward, platform: String(b.platform ?? "web").slice(0, 20), last_seen: new Date().toISOString() },
    { onConflict: "token" },
  );
  if (error) throw new HttpError(500, "could not save token");

  const topics = ["national", state && `state_${state}`, ward && `ward_${ward}`].filter(Boolean) as string[];
  const results = await Promise.all(topics.map((t) => subscribeToTopic(token, t).catch(() => false)));
  return json(req, { ok: true, topics: topics.filter((_, i) => results[i]) });
}));
