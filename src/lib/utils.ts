import type { CSSProperties } from "react";

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...a: A) => { if (t) clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  wrapped.cancel = () => { if (t) clearTimeout(t); };
  return wrapped;
}

export function timeAgo(iso: string | number | Date, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function daysUntil(isoDate: string, now = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export const isEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s.trim());

export const shortHash = (h: string, n = 8) => (h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-n)}` : h);

/** Never trust a URL from the network: only allow http(s) links. */
export const safeUrl = (u: string | null | undefined): string | null => {
  if (!u) return null;
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null; } catch { return null; }
};

export const errMessage = (e: unknown, fallback = "Something went wrong"): string =>
  e instanceof Error && e.message ? e.message : typeof e === "string" ? e : fallback;

/** Sets the --i custom property used by the CSS stagger animation. */
export const stagger = (i: number): CSSProperties => ({ "--i": i }) as CSSProperties;
