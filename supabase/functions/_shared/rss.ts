// Tiny dependency-free RSS 2.0 parser for fact-check feeds. Pure and unit-tested.

export interface FeedItem { title: string; url: string; summary: string | null; publishedAt: string | null; tags: string[] }

const decode = (s: string) =>
  s.replace(/\[&#8230;\]|\[&hellip;\]|\[\.\.\.\]/gi, "…")
   .replace(/&#8230;|&hellip;/gi, "…")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
   .replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, "\u2019").replace(/&#8216;/g, "\u2018")
   .replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;|&mdash;/g, "—")
   .replace(/&nbsp;/g, " ");

const stripCdata = (s: string) => s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? decode(stripCdata(m[1]).trim()) : null;
}

export function parseRss(xml: string, max = 20): FeedItem[] {
  const items: FeedItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < max) {
    const block = m[1];
    const title = tag(block, "title");
    const url = tag(block, "link");
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    const desc = tag(block, "description");
    const summary = desc ? stripHtml(decode(desc)).slice(0, 580) || null : null;
    const pub = tag(block, "pubDate");
    const d = pub ? new Date(pub) : null;
    const tags = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
      .map((c) => decode(stripCdata(c[1]).trim()).toLowerCase()).filter(Boolean).slice(0, 6);
    items.push({
      title: stripHtml(title).slice(0, 400), url, summary,
      publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : null, tags,
    });
  }
  return items;
}
