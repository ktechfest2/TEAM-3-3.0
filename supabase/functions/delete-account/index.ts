// Self-service account deletion. The ledger keeps its rows but loses user_id (FK ON DELETE SET NULL).
import { handler, json, HttpError } from "../_shared/cors.ts";
import { requireRealUser } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(handler(async (req) => {
  const user = await requireRealUser(req);
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "DELETE") throw new HttpError(400, "confirmation required");

  const admin = adminClient();
  // Remove the user's sheet photos (storage objects live under <uid>/).
  const { data: files } = await admin.storage.from("result-sheets").list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("result-sheets").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "could not delete account");
  return json(req, { ok: true });
}));
