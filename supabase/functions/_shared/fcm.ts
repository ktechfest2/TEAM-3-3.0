// Firebase Cloud Messaging HTTP v1 sender using a service-account JWT (RS256, WebCrypto only).
import { adminClient } from "./supabase.ts";

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

let sa: ServiceAccount | null = null;
function account(): ServiceAccount {
  if (!sa) {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    sa = JSON.parse(atob(raw)) as ServiceAccount;
  }
  return sa;
}

const b64url = (b: ArrayBuffer | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cached: { token: string; exp: number } | null = null;
export async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const { client_email, private_key } = account();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const der = Uint8Array.from(atob(private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`fcm oauth ${res.status}`);
  const j = await res.json();
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

export interface PushMessage { title: string; body: string; url?: string }

/** Data-only message: our own service worker renders it (works with the Serwist SW). */
async function send(target: { token: string } | { topic: string }, m: PushMessage): Promise<"ok" | "invalid" | "error"> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account().project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        ...target,
        data: { title: m.title, body: m.body, url: m.url ?? "/" },
        webpush: { headers: { Urgency: "high", TTL: "3600" } },
      },
    }),
  });
  if (res.ok) return "ok";
  if (res.status === 404 || res.status === 400) return "invalid";
  return "error";
}

/** Send to specific device tokens; prune tokens FCM says are dead. */
export async function sendToTokens(tokens: string[], m: PushMessage): Promise<number> {
  let sent = 0; const dead: string[] = [];
  for (const t of tokens) {
    const r = await send({ token: t }, m);
    if (r === "ok") sent++; else if (r === "invalid") dead.push(t);
  }
  if (dead.length) await adminClient().from("push_tokens").delete().in("token", dead);
  return sent;
}

export const sendToTopic = (topic: string, m: PushMessage) => send({ topic }, m);

/** Browser tokens can't subscribe to topics themselves; the server does it via the IID API. */
export async function subscribeToTopic(token: string, topic: string): Promise<boolean> {
  if (!/^[A-Za-z0-9\-_.~%]+$/.test(topic)) return false;
  const res = await fetch("https://iid.googleapis.com/iid/v1:batchAdd", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, access_token_auth: "true", "Content-Type": "application/json" },
    body: JSON.stringify({ to: `/topics/${topic}`, registration_tokens: [token] }),
  });
  return res.ok;
}
