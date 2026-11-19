"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { authKeys, useAuth } from "@/api/service/auth/queries";
import { useProfile } from "@/api/service/profile/queries";
import { processOutbox } from "@/api/service/scanner/api";
import { usePrefs } from "@/stores/prefs";
import { isLang } from "@/i18n";
import { toast } from "@/stores/toast";
import { translate } from "@/i18n";

/** Background wiring: auth listener, profile->language sync, offline outbox, push->toast bridge. */
export function AppEffects() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const profile = useProfile();
  const setLang = usePrefs((s) => s.setLang);
  const syncedFor = useRef<string | null>(null);

  // 1) Keep the cached session in step with Supabase. Anonymous sessions are never accepted.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (session?.user.is_anonymous) { void sb.auth.signOut(); return; }
      qc.setQueryData(authKeys.session, session ?? null);
      if (event === "SIGNED_OUT") qc.removeQueries({ queryKey: ["profile"] });
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  // 2) Adopt the saved language once per sign-in.
  useEffect(() => {
    const p = profile.data;
    if (p && syncedFor.current !== p.id) { syncedFor.current = p.id; if (isLang(p.language)) setLang(p.language); }
  }, [profile.data, setLang]);

  // 3) Upload queued result sheets: on load, on reconnect, and on a gentle timer while any are pending.
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const n = await processOutbox(user.id).catch(() => 0);
      if (n > 0) { toast.success(translate(usePrefs.getState().lang, "scan.sealed")); qc.invalidateQueries({ queryKey: ["sheets"] }); }
    };
    void run();
    window.addEventListener("online", run);
    const id = setInterval(run, 30_000);
    return () => { window.removeEventListener("online", run); clearInterval(id); };
  }, [user, qc]);

  // 4) Push messages that arrive while the app is open are shown as toasts.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "vp-push") toast.info(`${e.data.title}${e.data.body ? ` - ${e.data.body}` : ""}`);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  return null;
}
