import { describe, it, expect } from "vitest";
import { signWebhook, verifyWebhook } from "../supabase/functions/_shared/webhook.ts";
import { renderAuthEmail } from "../supabase/functions/_shared/email.ts";
import { parseRss } from "../supabase/functions/_shared/rss.ts";

const SECRET = "v1,whsec_" + btoa("super-secret-test-key-32-bytes!!");
const hdrs = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("webhook signature", () => {
  const body = '{"user":{"email":"a@b.co"}}';
  const now = 1_800_000_000;
  it("accepts a valid signature", async () => {
    const sig = await signWebhook(SECRET, "msg_1", String(now), body);
    await verifyWebhook(SECRET, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sig }), body, { nowSec: now });
  });
  it("rejects a tampered body", async () => {
    const sig = await signWebhook(SECRET, "msg_1", String(now), body);
    let err: unknown;
    try { await verifyWebhook(SECRET, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sig }), body + " ", { nowSec: now }); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
  });
  it("rejects a stale timestamp (replay)", async () => {
    const sig = await signWebhook(SECRET, "msg_1", String(now), body);
    let err: unknown;
    try { await verifyWebhook(SECRET, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sig }), body, { nowSec: now + 3600 }); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
  });
  it("rejects missing headers", async () => {
    let err: unknown;
    try { await verifyWebhook(SECRET, hdrs({}), body); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
  });
  it("rejects a wrong secret", async () => {
    const sig = await signWebhook(SECRET, "msg_1", String(now), body);
    const other = "v1,whsec_" + btoa("a-different-secret-key-32-bytes!!");
    let err: unknown;
    try { await verifyWebhook(other, hdrs({ "webhook-id": "msg_1", "webhook-timestamp": String(now), "webhook-signature": sig }), body, { nowSec: now }); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
  });
});

describe("email template", () => {
  it("renders the code and escapes the app name", () => {
    const m = renderAuthEmail("magiclink", "123456", "Vote<script>");
    expect(m.html.includes("123 456")).toBe(true);
    expect(m.html.includes("<script>")).toBe(false);
    expect(m.text.includes("123 456")).toBe(true);
    expect(m.subject).toBe("Your Votepaddie sign-in code");
  });
  it("refuses a non-numeric token", () => {
    let err: unknown;
    try { renderAuthEmail("signup", "12ab56"); } catch (e) { err = e; }
    expect(err instanceof Error).toBe(true);
  });
});

describe("rss", () => {
  const xml = `<rss><channel><item><title><![CDATA[Fake sheet &amp; claim]]></title><link>https://x.org/a</link>
  <description><![CDATA[<p>Claim is <b>false</b>.</p>]]></description><pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate>
  <category><![CDATA[Election]]></category></item>
  <item><title>bad</title><link>javascript:alert(1)</link></item></channel></rss>`;
  it("parses items, strips html, drops unsafe links", () => {
    const items = parseRss(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Fake sheet & claim");
    expect(items[0].summary).toBe("Claim is false .");
    expect(items[0].tags[0]).toBe("election");
    expect(items[0].publishedAt).toBe("2026-11-10T10:00:00.000Z");
  });
});
