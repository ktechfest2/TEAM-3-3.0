import { dbError, getSupabase } from "@/lib/supabase/client";
import { invokeFn } from "@/lib/supabase/functions";
import { decodeHtml } from "@/lib/utils";
import type { Lang } from "@/i18n";
import type { FactCheck, FactCheckPage, FactCheckView } from "./types";

const PAGE = 10;
const COLS = "id,source,source_name,title,url,summary,rating,published_at,tags,state_code";

export async function listFactChecks(cursor: string | null, lang: Lang): Promise<FactCheckPage> {
  const sb = getSupabase();
  let q = sb.from("fact_checks").select(COLS).order("published_at", { ascending: false, nullsFirst: false }).limit(PAGE);
  if (cursor) q = q.lt("published_at", cursor);
  const { data, error } = await q;
  if (error) throw dbError(error);
  const rows = (data ?? []) as FactCheck[];

  const tr = new Map<string, Record<string, string>>();
  if (lang !== "en" && rows.length) {
    const { data: t } = await sb.from("translations").select("entity_id,field,translated")
      .eq("entity_type", "fact_check").eq("lang", lang).in("entity_id", rows.map((r) => r.id));
    for (const x of t ?? []) {
      const cur = tr.get(x.entity_id) ?? {};
      cur[x.field] = x.translated;
      tr.set(x.entity_id, cur);
    }
  }
  const items: FactCheckView[] = rows.map((r) => {
    const x = tr.get(r.id);
    const title = decodeHtml(r.title);
    const summary = r.summary ? decodeHtml(r.summary) : null;
    const shownTitle = decodeHtml(x?.title ?? title);
    const shownSummary = x?.summary ? decodeHtml(x.summary) : summary;
    return { ...r, title, summary, shownTitle, shownSummary, translated: Boolean(x?.title) };
  });
  const last = rows[rows.length - 1];
  return { items, nextCursor: rows.length === PAGE && last?.published_at ? last.published_at : null };
}

export async function requestTranslation(id: string, lang: Lang) {
  return invokeFn<{ translations: { title?: string; summary?: string } }>("translate", { entity_id: id, lang });
}
