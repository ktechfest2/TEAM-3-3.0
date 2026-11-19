import { dbError, getSupabase } from "@/lib/supabase/client";

export async function getConfig<T>(key: string): Promise<T | null> {
  const { data, error } = await getSupabase().from("app_config").select("value").eq("key", key).maybeSingle();
  if (error) throw dbError(error);
  return (data?.value as T | undefined) ?? null;
}
