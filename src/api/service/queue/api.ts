import { dbError, getSupabase } from "@/lib/supabase/client";
import type { JoinInput, QueueEntry, QueueState, QueueStatus } from "./types";

export async function getQueueState(puCode: string): Promise<QueueState | null> {
  const { data, error } = await getSupabase().from("pu_queue_state").select("*").eq("pu_code", puCode).maybeSingle();
  if (error) throw dbError(error);
  return data as QueueState | null;
}

/** My most recent active entry at this unit (RLS only lets me see my own). */
export async function getMyEntry(puCode: string): Promise<QueueEntry | null> {
  const { data, error } = await getSupabase().from("queue_entries").select("*")
    .eq("pu_code", puCode).in("status", ["waiting", "accredited"]).order("joined_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw dbError(error);
  return data as QueueEntry | null;
}

export async function joinQueue(i: JoinInput): Promise<QueueEntry> {
  const { data, error } = await getSupabase().rpc("join_queue", {
    p_pu_code: i.puCode, p_lat: i.lat ?? null, p_lng: i.lng ?? null, p_manual: i.manual ?? false,
  });
  if (error) throw dbError(error);
  return data as QueueEntry;
}

export async function setQueueStatus(entryId: string, status: Exclude<QueueStatus, "waiting">): Promise<QueueEntry> {
  const { data, error } = await getSupabase().rpc("set_queue_status", { p_entry_id: entryId, p_status: status });
  if (error) throw dbError(error);
  return data as QueueEntry;
}

/** Exact number ahead (needs 0003_queue_position.sql). Returns null if unavailable. */
export async function getQueuePosition(puCode: string): Promise<number | null> {
  const { data, error } = await getSupabase().rpc("queue_position", { p_pu_code: puCode });
  if (error) return null;
  return typeof data === "number" ? data : null;
}
