// Cron (every 10 min): pulls fact-check RSS feeds + Google Fact Check Tools, stores new items,
// batch-translates new headlines with Groq, and pings the "national" push topic.
import { handler, json } from "../_shared/cors.ts";
import { requireCron } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { parseRss } from "../_shared/rss.ts";
import { chatJson, TRANSLATE_SYSTEM, translateModel } from "../_shared/groq.ts";
import { sendToTopic } from "../_shared/fcm.ts";

interface Row { source: string; source_name: string; title: string; url: string; summary: string | null; rating: string | null; published_at: string | null; tags: string[] }

// Verify these URLs before launch. Override with the FACTCHECK_FEEDS secret (JSON array).
const DEFAULT_FEEDS = [
  { source: "dubawa", name: "Dubawa", url: "https://dubawa.org/feed/" },
  { source: "factcheckhub", name: "FactCheck Hub", url: "https://factcheckhub.com/feed/" },
  { source: "africacheck", name: "Africa Check", url: "https://africacheck.org/feed" },
];

async function fromFeed(f: { source: string; name: string; url: string }): Promise<Row[]> {
  const res = await fetch(f.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${f.name} ${res.status}`);
  return parseRss(await res.text()).map((i) => ({
    source: f.source, source_name: f.name, title: i.title, url: i.url, summary: i.summary, rating: null, published_at: i.publishedAt, tags: i.tags,
  }));
}

async function fromGoogle(): Promise<Row[]> {
  const key = Deno.env.get("GOOGLE_FACTCHECK_API_KEY");
  if (!key) return [];
  const u = new URL("https://factchecktools.googleapis.com/v1alpha1/claims:search");
  u.search = new URLSearchParams({ query: "Nigeria election", languageCode: "en", pageSize: "20", maxAgeDays: "30", key }).toString();
  const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const j = await res.json();
  const rows: Row[] = [];
  for (const c of j.claims ?? []) for (const r of c.claimReview ?? []) {
    if (!r.url || !/^https?:\/\//.test(r.url)) continue;
    rows.push({
      source: "google", source_name: r.publisher?.name ?? r.publisher?.site ?? "Fact checker",
      title: String(r.title ?? c.text ?? "").slice(0, 400), url: r.url, summary: c.text ? String(c.text).slice(0, 580) : null,
      rating: r.textualRating ?? null, published_at: r.reviewDate ?? c.claimDate ?? null, tags: [],
    });
  }
  return rows.filter((r) => r.title.length >= 3);
}

async function translateNew(items: Array<{ id: string; title: string }>) {
  if (!items.length || !Deno.env.get("GROQ_API_KEY")) return;
  const out = await chatJson(
    TRANSLATE_SYSTEM,
    'Translate each title into Hausa (ha), Yoruba (yo), Igbo (ig) and Nigerian Pidgin (pcm). Return {"items":[{"id":"...","ha":"...","yo":"...","ig":"...","pcm":"..."}]}.\n' + JSON.stringify(items),
  );
  const list = Array.isArray(out.items) ? (out.items as Array<Record<string, string>>) : [];
  const rows = list.flatMap((it) =>
    (["ha", "yo", "ig", "pcm"] as const).filter((l) => typeof it[l] === "string" && it[l].trim()).map((l) => ({
      entity_type: "fact_check", entity_id: it.id, lang: l, field: "title", translated: it[l].slice(0, 400), provider: `groq:${translateModel()}`,
    })));
  if (rows.length) await adminClient().from("translations").upsert(rows);
}

Deno.serve(handler(async (req) => {
  requireCron(req);
  let feeds = DEFAULT_FEEDS;
  try { const o = JSON.parse(Deno.env.get("FACTCHECK_FEEDS") ?? ""); if (Array.isArray(o)) feeds = o; } catch { /* default */ }

  const settled = await Promise.allSettled([...feeds.map(fromFeed), fromGoogle()]);
  const rows = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const errors = settled.flatMap((s) => (s.status === "rejected" ? [String(s.reason?.message ?? s.reason)] : []));
  if (!rows.length) return json(req, { inserted: 0, errors });

  const { data: inserted, error } = await adminClient().from("fact_checks")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: true }).select("id, title");
  if (error) return json(req, { inserted: 0, errors: [...errors, error.message] }, 500);

  const fresh = (inserted ?? []).slice(0, 10);
  await translateNew(fresh).catch((e) => errors.push(`translate: ${e?.message ?? e}`));
  if (fresh.length) await sendToTopic("national", { title: "New fact-check", body: fresh[0].title.slice(0, 120), url: "/" }).catch(() => {});
  return json(req, { inserted: inserted?.length ?? 0, errors });
}));
