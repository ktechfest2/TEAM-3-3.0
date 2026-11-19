import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Browser singleton. Uses the PUBLISHABLE key only - secrets never reach the browser. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl || "http://localhost:54321", env.supabasePublishableKey || "missing-key", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

/** Turn a Postgres/PostgREST error into a short, user-safe message. */
export function dbError(e: { message?: string; code?: string } | null | undefined): Error {
  const m = e?.message ?? "Request failed";
  if (e?.code === "28000") return new Error("Please sign in first.");
  if (e?.code === "42501") return new Error("You don't have permission to do that.");
  return new Error(m);
}
