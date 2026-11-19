// On-demand translation of a fact-check (title + summary) into ha | yo | ig | pcm, cached in public.translations.
import { handler, json, HttpError } from "../_shared/cors.ts";
import { requireRealUser, enforceAiQuota } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { chatJson, TRANSLATE_SYSTEM, LANG_NAMES, translateModel } from "../_shared/groq.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(handler(async (req) => {
  const user = await requireRealUser(req);
  const { entity_id, lang } = await req.json().catch(() => ({}));
  if (!UUID.test(String(entity_id)) || !(lang in LANG_NAMES)) throw new HttpError(400, "bad request");

  const admin = adminClient();
  const { data: cached } = await admin.from("translations").select("field, translated")
    .eq("entity_type", "fact_check").eq("entity_id", entity_id).eq("lang", lang);
  if (cached && cached.length) return json(req, { translations: Object.fromEntries(cached.map((r) => [r.field, r.translated])), cached: true });

  const { data: fc } = await admin.from("fact_checks").select("title, summary").eq("id", entity_id).maybeSingle();
  if (!fc) throw new HttpError(404, "not found");

  await enforceAiQuota(user.id, "translate", 20);
  const out = await chatJson(
    TRANSLATE_SYSTEM,
    `Translate into ${LANG_NAMES[lang]}. Return {"title": "...", "summary": "..."}.\n` + JSON.stringify({ title: fc.title, summary: fc.summary ?? "" }),
  );
  const rows = (["title", "summary"] as const)
    .filter((f) => typeof out[f] === "string" && (out[f] as string).trim() && (f === "title" || fc.summary))
    .map((f) => ({ entity_type: "fact_check", entity_id, lang, field: f, translated: String(out[f]).slice(0, 700), provider: `groq:${translateModel()}` }));
  if (rows.length) await admin.from("translations").upsert(rows);
  return json(req, { translations: Object.fromEntries(rows.map((r) => [r.field, r.translated])), cached: false });
}));
