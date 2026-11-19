"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/db/dexie";
import { consensus, listMySheets, processOutbox, publicLedger, queueSeal, verifyChain, verifyHash } from "./api";
import type { VaultItem } from "@/db/dexie";

export const sheetKeys = {
  mine: ["sheets", "mine"] as const,
  ledger: (pu: string) => ["sheets", "ledger", pu] as const,
  consensus: (pu: string) => ["sheets", "consensus", pu] as const,
};

export const useMySheets = (enabled: boolean) => useQuery({ queryKey: sheetKeys.mine, queryFn: listMySheets, enabled });
export const usePuLedger = (pu: string | null | undefined) => useQuery({ queryKey: sheetKeys.ledger(pu ?? ""), queryFn: () => publicLedger(pu!), enabled: Boolean(pu) });
export const useConsensus = (pu: string | null | undefined) => useQuery({ queryKey: sheetKeys.consensus(pu ?? ""), queryFn: () => consensus(pu!), enabled: Boolean(pu) });

/** Items waiting on this phone (queued or failed) - drives the "will upload later" banner. */
export const usePendingSeals = () =>
  useLiveQuery(async () => (await getDb().vault.where("status").anyOf("queued", "error").toArray()).length, [], 0);

export function useSealSheet(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: VaultItem) => {
      await queueSeal(item);
      await processOutbox(userId ?? null);
      return (await getDb().vault.get(item.id)) as VaultItem;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sheets"] }); },
  });
}

export const useVerifyHash = () => useMutation({ mutationFn: verifyHash });
export const useVerifyChain = () => useMutation({ mutationFn: verifyChain });
