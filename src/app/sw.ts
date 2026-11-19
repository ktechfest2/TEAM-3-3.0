import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache API traffic: it carries personal data and must be fresh.
    { matcher: ({ url }) => url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".googleapis.com"), handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
});
serwist.addEventListeners();

interface PushPayload { title?: string; body?: string; url?: string; tag?: string }

// Server sends data-only FCM messages; we render them here.
self.addEventListener("push", (event) => {
  let raw: Record<string, unknown> = {};
  try { raw = (event.data?.json() ?? {}) as Record<string, unknown>; } catch { /* ignore malformed */ }
  const d = ((raw.data ?? raw.notification ?? raw) as PushPayload);
  const title = d.title ?? "Votepaddie";
  const body = d.body ?? "";
  const url = typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/";

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.some((c) => (c as WindowClient).focused)) {
      wins.forEach((c) => c.postMessage({ type: "vp-push", title, body, url }));   // in-app toast instead
      return;
    }
    await self.registration.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: d.tag, data: { url } });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = ((event.notification.data as { url?: string } | undefined)?.url) ?? "/";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of wins) { if ("focus" in c) { await (c as WindowClient).navigate(url).catch(() => {}); return (c as WindowClient).focus(); } }
    return self.clients.openWindow(url);
  })());
});
