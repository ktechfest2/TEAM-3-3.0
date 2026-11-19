"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { getMyEntry, getQueuePosition, getQueueState, joinQueue, setQueueStatus } from "./api";
import type { QueueEntry, QueueState } from "./types";

export const queueKeys = {
  state: (pu: string) => ["queue", "state", pu] as const,
  mine: (pu: string) => ["queue", "mine", pu] as const,
  position: (pu: string) => ["queue", "position", pu] as const,
};

/** Live headcount: initial fetch + realtime updates pushed straight into the cache. */
export function useQueueState(puCode: string | null | undefined) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: queueKeys.state(puCode ?? ""), queryFn: () => getQueueState(puCode!), enabled: Boolean(puCode) });
  useEffect(() => {
    if (!puCode) return;
    const sb = getSupabase();
    const ch = sb.channel(`queue-${puCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pu_queue_state", filter: `pu_code=eq.${puCode}` }, (p) => {
        qc.setQueryData<QueueState | null>(queueKeys.state(puCode), (p.new as QueueState) ?? null);
        qc.invalidateQueries({ queryKey: queueKeys.position(puCode) });
        qc.invalidateQueries({ queryKey: queueKeys.mine(puCode) });
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [puCode, qc]);
  return q;
}

export const useMyQueueEntry = (puCode: string | null | undefined, enabled: boolean) =>
  useQuery({ queryKey: queueKeys.mine(puCode ?? ""), queryFn: () => getMyEntry(puCode!), enabled: Boolean(puCode) && enabled });

export const useQueuePosition = (puCode: string | null | undefined, enabled: boolean) =>
  useQuery({ queryKey: queueKeys.position(puCode ?? ""), queryFn: () => getQueuePosition(puCode!), enabled: Boolean(puCode) && enabled, staleTime: 10_000 });

export function useJoinQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinQueue,
    onSuccess: (entry: QueueEntry) => {
      qc.setQueryData(queueKeys.mine(entry.pu_code), entry);
      qc.invalidateQueries({ queryKey: queueKeys.state(entry.pu_code) });
      qc.invalidateQueries({ queryKey: queueKeys.position(entry.pu_code) });
    },
  });
}

export function useSetQueueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: "accredited" | "voted" | "left" }) => setQueueStatus(v.id, v.status),
    onSuccess: (entry: QueueEntry) => {
      qc.setQueryData(queueKeys.mine(entry.pu_code), entry.status === "left" ? null : entry);
      qc.invalidateQueries({ queryKey: ["queue", "mine"] });
      qc.invalidateQueries({ queryKey: queueKeys.state(entry.pu_code) });
      qc.invalidateQueries({ queryKey: queueKeys.position(entry.pu_code) });
    },
  });
}
