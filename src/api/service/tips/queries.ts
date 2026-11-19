"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { listTips, myVotedTipIds, postTip, reportContent, toggleVote } from "./api";

export const tipKeys = { list: (w: string) => ["tips", w] as const, votes: (w: string) => ["tips", w, "votes"] as const };

export function useTips(wardKey: string | null | undefined) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: tipKeys.list(wardKey ?? ""), queryFn: () => listTips(wardKey!), enabled: Boolean(wardKey) });
  useEffect(() => {
    if (!wardKey) return;
    const sb = getSupabase();
    const ch = sb.channel(`tips-${wardKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ward_tips", filter: `ward_key=eq.${wardKey}` }, () => qc.invalidateQueries({ queryKey: tipKeys.list(wardKey) }))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [wardKey, qc]);
  return q;
}

export const useMyTipVotes = (wardKey: string | null | undefined, tipIds: string[], enabled: boolean) =>
  useQuery({ queryKey: [...tipKeys.votes(wardKey ?? ""), tipIds.join(",")], queryFn: () => myVotedTipIds(tipIds), enabled: Boolean(wardKey) && enabled && tipIds.length > 0 });

export function usePostTip(wardKey: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: postTip, onSuccess: () => qc.invalidateQueries({ queryKey: tipKeys.list(wardKey) }) });
}

export function useToggleTipVote(wardKey: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: toggleVote, onSuccess: () => qc.invalidateQueries({ queryKey: ["tips", wardKey] }) });
}

export const useReportContent = () =>
  useMutation({ mutationFn: (v: { type: "ward_tip" | "accessibility_request"; id: string; reason?: string }) => reportContent(v.type, v.id, v.reason) });
