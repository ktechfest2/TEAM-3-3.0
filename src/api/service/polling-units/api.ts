import { dbError, getSupabase } from "@/lib/supabase/client";
import { getDb } from "@/db/dexie";
import type { PollingUnit, Ward } from "./types";

const UNIT_COLS = "code,name,state_code,state_name,lga_code,lga_name,ward_code,ward_name,ward_key,lat,lng";

export async function searchUnits(q: string): Promise<PollingUnit[]> {
  const term = q.trim().replace(/[%_,]/g, " ");
  const { data, error } = await getSupabase().rpc("search_polling_units", { q: term, lim: 20 });
  if (error) throw dbError(error);
  return (data ?? []) as PollingUnit[];
}

export async function listWards(): Promise<Ward[]> {
  const { data, error } = await getSupabase().from("wards").select("*").order("state_name").order("lga_name").order("ward_name").limit(300);
  if (error) throw dbError(error);
  return (data ?? []) as Ward[];
}

/** Units of one ward, cached in IndexedDB so the unit picker still works with a bad network. */
export async function unitsByWard(wardKey: string): Promise<PollingUnit[]> {
  const db = getDb();
  try {
    const { data, error } = await getSupabase().from("polling_units").select(UNIT_COLS).eq("ward_key", wardKey).order("name").limit(500);
    if (error) throw error;
    const units = (data ?? []) as PollingUnit[];
    await db.wardCache.put({ wardKey, units, cachedAt: Date.now() });
    return units;
  } catch (e) {
    const cached = await db.wardCache.get(wardKey);
    if (cached) return cached.units as PollingUnit[];
    throw dbError(e as { message?: string });
  }
}

export async function getUnit(code: string): Promise<PollingUnit | null> {
  const { data, error } = await getSupabase().from("polling_units").select(UNIT_COLS).eq("code", code).maybeSingle();
  if (error) throw dbError(error);
  return data as PollingUnit | null;
}
