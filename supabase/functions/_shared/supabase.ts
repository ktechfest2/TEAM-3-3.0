import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/** New-style secret key (sb_secret_...). SUPABASE_SECRET_KEYS is a JSON map; read "default". */
function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try { const k = JSON.parse(raw); if (k?.default) return k.default as string; } catch { /* fall through */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}
