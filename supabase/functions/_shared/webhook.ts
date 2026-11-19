// Standard Webhooks signature verification (what Supabase Auth Hooks use). Web APIs only.
// Signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256 with the
// base64-decoded secret, header format "v1,<base64sig>" (may hold several, space separated).

const enc = new TextEncoder();

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64encode(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Accepts "v1,whsec_xxx", "whsec_xxx" or the bare base64 secret. */
export function normaliseSecret(secret: string): string {
  return secret.trim().replace(/^v1,/, "").replace(/^whsec_/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", b64decode(normaliseSecret(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function signWebhook(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${id}.${timestamp}.${body}`));
  return `v1,${b64encode(sig)}`;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class WebhookError extends Error {}

export async function verifyWebhook(
  secret: string,
  headers: { get(name: string): string | null },
  body: string,
  opts: { toleranceSec?: number; nowSec?: number } = {},
): Promise<void> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) throw new WebhookError("missing webhook headers");

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = opts.toleranceSec ?? 300;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > tolerance) throw new WebhookError("timestamp outside tolerance");

  const expected = await signWebhook(secret, id, ts, body);
  const ok = sigHeader.split(" ").some((candidate) => safeEqual(candidate.trim(), expected));
  if (!ok) throw new WebhookError("invalid signature");
}
