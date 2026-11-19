"use client";
import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import type { Lang } from "@/i18n";
import { listFactChecks, requestTranslation } from "./api";

export const factKeys = { list: (lang: Lang) => ["fact-checks", lang] as const };

export function useFactChecks(lang: Lang) {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: factKeys.list(lang),
    queryFn: ({ pageParam }) => listFactChecks(pageParam, lang),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });
  // New items appear live as the ingest job inserts them.
  useEffect(() => {
    const sb = getSupabase();
    const ch = sb.channel("fact-checks-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fact_checks" }, () => qc.invalidateQueries({ queryKey: ["fact-checks"] }))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [qc]);
  return q;
}

export function useRequestTranslation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; lang: Lang }) => requestTranslation(v.id, v.lang),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fact-checks"] }),
  });
}
