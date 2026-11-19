"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { createRequest, getThread, listMessages, listMyRequests, listRequests, listThreads, openThread, sendMessage, setRequestStatus } from "./api";
import type { HelpMessage } from "./types";

export const helpKeys = {
  ward: (w: string) => ["help", "ward", w] as const,
  mine: ["help", "mine"] as const,
  threads: ["help", "threads"] as const,
  thread: (id: string) => ["help", "thread", id] as const,
  messages: (id: string) => ["help", "messages", id] as const,
};

export function useWardRequests(wardKey: string | null | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: helpKeys.ward(wardKey ?? ""), queryFn: () => listRequests(wardKey!), enabled: Boolean(wardKey) && enabled });
  useEffect(() => {
    if (!wardKey || !enabled) return;
    const sb = getSupabase();
    const ch = sb.channel(`help-${wardKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accessibility_requests", filter: `ward_key=eq.${wardKey}` }, () => qc.invalidateQueries({ queryKey: helpKeys.ward(wardKey) }))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [wardKey, enabled, qc]);
  return q;
}

export const useMyRequests = (userId: string | undefined) =>
  useQuery({ queryKey: helpKeys.mine, queryFn: () => listMyRequests(userId!), enabled: Boolean(userId) });

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createRequest, onSuccess: () => qc.invalidateQueries({ queryKey: ["help"] }) });
}

export function useSetRequestStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { id: string; status: "open" | "matched" | "closed" }) => setRequestStatus(v.id, v.status), onSuccess: () => qc.invalidateQueries({ queryKey: ["help"] }) });
}

export function useOpenThread() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: openThread, onSuccess: () => qc.invalidateQueries({ queryKey: helpKeys.threads }) });
}

export const useThreads = (enabled: boolean) => useQuery({ queryKey: helpKeys.threads, queryFn: listThreads, enabled });
export const useThread = (id: string) => useQuery({ queryKey: helpKeys.thread(id), queryFn: () => getThread(id), enabled: Boolean(id) });

export function useMessages(threadId: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: helpKeys.messages(threadId), queryFn: () => listMessages(threadId), enabled: Boolean(threadId) });
  useEffect(() => {
    if (!threadId) return;
    const sb = getSupabase();
    const ch = sb.channel(`msgs-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "accessibility_messages", filter: `thread_id=eq.${threadId}` }, (p) => {
        const m = p.new as HelpMessage;
        qc.setQueryData<HelpMessage[]>(helpKeys.messages(threadId), (old) => (old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m]));
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [threadId, qc]);
  return q;
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(threadId, body),
    onSuccess: (m) => qc.setQueryData<HelpMessage[]>(helpKeys.messages(threadId), (old) => (old?.some((x) => x.id === m.id) ? old : [...(old ?? []), m])),
  });
}
