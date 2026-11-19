import { isSupabaseConfigured } from "@/lib/env";

/** Friendly dev-time notice instead of a wall of network errors when .env.local is missing. */
export function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="banner" style={{ margin: "12px 20px 0" }} role="alert">
      <div>
        <b>Setup needed.</b> Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart.
      </div>
    </div>
  );
}
