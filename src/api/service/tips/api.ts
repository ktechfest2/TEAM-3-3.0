import { dbError, getSupabase } from "@/lib/supabase/client";
import type { PostTipInput, WardTip } from "./types";

const COLS = "id,ward_key,pu_code,author_id,body,verified,upvotes,created_at";

export async function listTips(wardKey: string): Promise<WardTip[]> {
  const { data, error } = await getSupabase().from("ward_tips").select(COLS).eq("ward_key", wardKey)
    .order("upvotes", { ascending: false }).order("created_at", { ascending: false }).limit(30);
  if (error) throw dbError(error);
  return (data ?? []) as WardTip[];
}

export async function postTip(i: PostTipInput): Promise<WardTip> {
  const { data, error } = await getSupabase().rpc("post_ward_tip", { p_pu_code: i.puCode, p_body: i.body, p_lat: i.lat ?? null, p_lng: i.lng ?? null });
  if (error) throw dbError(error);
  return data as WardTip;
}

export async function toggleVote(tipId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("toggle_tip_vote", { p_tip_id: tipId });
  if (error) throw dbError(error);
  return Boolean(data);
}

export async function myVotedTipIds(tipIds: string[]): Promise<string[]> {
  if (!tipIds.length) return [];
  const { data, error } = await getSupabase().from("ward_tip_votes").select("tip_id").in("tip_id", tipIds);
  if (error) throw dbError(error);
  return (data ?? []).map((r) => r.tip_id as string);
}

export async function reportContent(entityType: "ward_tip" | "accessibility_request", entityId: string, reason?: string) {
  const { error } = await getSupabase().from("content_reports").insert({ entity_type: entityType, entity_id: entityId, reason: reason?.slice(0, 200) ?? null });
  if (error && error.code !== "23505") throw dbError(error);   // already reported = fine
}
