import { dbError, getSupabase } from "@/lib/supabase/client";
import type { HelpMessage, HelpRequest, HelpStatus, HelpThread, NewHelpRequest, ThreadWithRequest } from "./types";

export async function listRequests(wardKey: string): Promise<HelpRequest[]> {
  const { data, error } = await getSupabase().from("accessibility_requests").select("*").eq("ward_key", wardKey)
    .in("status", ["open", "matched"]).order("created_at", { ascending: false }).limit(50);
  if (error) throw dbError(error);
  return (data ?? []) as HelpRequest[];
}

export async function listMyRequests(userId: string): Promise<HelpRequest[]> {
  const { data, error } = await getSupabase().from("accessibility_requests").select("*").eq("author_id", userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw dbError(error);
  return (data ?? []) as HelpRequest[];
}

export async function createRequest(i: NewHelpRequest): Promise<HelpRequest> {
  const { data, error } = await getSupabase().from("accessibility_requests").insert({
    kind: i.kind, category: i.category, custom_label: i.category === "custom" ? i.customLabel?.trim() : null,
    state_code: i.stateCode, ward_key: i.wardKey, pu_code: i.puCode, body: i.body.trim(),
  }).select("*").single();
  if (error) throw dbError(error);
  return data as HelpRequest;
}

export async function setRequestStatus(id: string, status: Exclude<HelpStatus, "hidden">) {
  const { error } = await getSupabase().from("accessibility_requests").update({ status }).eq("id", id);
  if (error) throw dbError(error);
}

export async function openThread(requestId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("open_accessibility_thread", { p_request_id: requestId });
  if (error) throw dbError(error);
  return data as string;
}

export async function listThreads(): Promise<ThreadWithRequest[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("accessibility_threads").select("*").order("created_at", { ascending: false }).limit(30);
  if (error) throw dbError(error);
  const threads = (data ?? []) as HelpThread[];
  if (!threads.length) return [];
  const { data: reqs } = await sb.from("accessibility_requests").select("*").in("id", threads.map((t) => t.request_id));
  const byId = new Map<string, HelpRequest>((reqs ?? []).map((r): [string, HelpRequest] => [r.id as string, r as HelpRequest]));
  return threads.map((t) => ({ ...t, request: byId.get(t.request_id) ?? null }));
}

export async function getThread(threadId: string): Promise<ThreadWithRequest | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("accessibility_threads").select("*").eq("id", threadId).maybeSingle();
  if (error) throw dbError(error);
  if (!data) return null;
  const { data: req } = await sb.from("accessibility_requests").select("*").eq("id", data.request_id).maybeSingle();
  return { ...(data as HelpThread), request: (req as HelpRequest | null) ?? null };
}

export async function listMessages(threadId: string): Promise<HelpMessage[]> {
  const { data, error } = await getSupabase().from("accessibility_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(200);
  if (error) throw dbError(error);
  return (data ?? []) as HelpMessage[];
}

export async function sendMessage(threadId: string, body: string): Promise<HelpMessage> {
  const { data, error } = await getSupabase().from("accessibility_messages").insert({ thread_id: threadId, body: body.trim() }).select("*").single();
  if (error) throw dbError(error);
  return data as HelpMessage;
}
