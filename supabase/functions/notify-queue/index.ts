// Called by a database trigger (pg_net) whenever someone leaves "waiting" at a polling unit.
// Alerts the people who just became 3rd and 1st in the (unofficial) virtual line.
import { handler, json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { sendToTokens } from "../_shared/fcm.ts";

Deno.serve(handler(async (req) => {
  requireCron(req);
  const { pu_code } = await req.json().catch(() => ({}));
  if (typeof pu_code !== "string" || pu_code.length > 40) return json(req, { ok: false }, 400);

  const admin = adminClient();
  const { data: waiting } = await admin.from("queue_entries").select("user_id")
    .eq("pu_code", pu_code).eq("status", "waiting").order("ticket", { ascending: true }).limit(3);
  if (!waiting?.length) return json(req, { ok: true, sent: 0 });

  const targets: Array<{ user_id: string; title: string; body: string }> = [];
  if (waiting[0]) targets.push({ user_id: waiting[0].user_id, title: "You're next in line", body: "Head to the front of the official queue now." });
  if (waiting[2]) targets.push({ user_id: waiting[2].user_id, title: "About 3 people ahead", body: "Start moving towards your polling unit." });

  let sent = 0;
  for (const t of targets) {
    const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", t.user_id);
    if (tokens?.length) sent += await sendToTokens(tokens.map((x) => x.token), { title: t.title, body: t.body, url: "/unit" });
  }
  return json(req, { ok: true, sent });
}));
