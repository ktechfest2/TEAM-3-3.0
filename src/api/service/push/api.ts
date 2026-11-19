import { env, isPushConfigured } from "@/lib/env";
import { invokeFn } from "@/lib/supabase/functions";
import type { PushStatus } from "./types";

const TOKEN_KEY = "vp-fcm-token";

export async function pushSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !isPushConfigured) return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return false;
  try { const { isSupported } = await import("firebase/messaging"); return await isSupported(); } catch { return false; }
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!(await pushSupported())) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && localStorage.getItem(TOKEN_KEY) ? "on" : "off";
}

/** Asks permission, gets an FCM token via our own service worker, and registers it (+ topics) server-side. */
export async function enablePush(scope: { stateCode?: string | null; wardKey?: string | null }): Promise<void> {
  if (!(await pushSupported())) throw new Error("Alerts aren't supported on this browser.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Alerts are blocked in your browser settings.");

  const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  const app = getApps()[0] ?? initializeApp(env.firebase);
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: env.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Couldn't get an alert token. Try again.");

  await invokeFn("register-push", { token, platform: "web", state_code: scope.stateCode ?? null, ward_key: scope.wardKey ?? null });
  localStorage.setItem(TOKEN_KEY, token);
}

export async function disablePush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (token) await invokeFn("register-push", { action: "unregister", token }).catch(() => {});
}
