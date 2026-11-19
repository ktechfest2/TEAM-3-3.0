"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disablePush, enablePush, getPushStatus } from "./api";

const key = ["push", "status"] as const;

export const usePushStatus = () => useQuery({ queryKey: key, queryFn: getPushStatus, staleTime: Infinity });

export function useEnablePush() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: enablePush, onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
}
export function useDisablePush() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: disablePush, onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
}
