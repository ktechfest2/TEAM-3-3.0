"use client";
import { useQuery } from "@tanstack/react-query";
import { getUnit, listWards, searchUnits, unitsByWard } from "./api";

export const puKeys = {
  search: (q: string) => ["pu", "search", q] as const,
  wards: ["pu", "wards"] as const,
  ward: (k: string) => ["pu", "ward", k] as const,
  one: (c: string) => ["pu", "one", c] as const,
};

export const usePuSearch = (q: string) =>
  useQuery({ queryKey: puKeys.search(q), queryFn: () => searchUnits(q), enabled: q.trim().length >= 2, staleTime: 5 * 60_000 });

export const useWards = () => useQuery({ queryKey: puKeys.wards, queryFn: listWards, staleTime: 3600_000 });

export const useWardUnits = (wardKey: string | null) =>
  useQuery({ queryKey: puKeys.ward(wardKey ?? ""), queryFn: () => unitsByWard(wardKey!), enabled: Boolean(wardKey), staleTime: 3600_000 });

export const usePollingUnit = (code: string | null | undefined) =>
  useQuery({ queryKey: puKeys.one(code ?? ""), queryFn: () => getUnit(code!), enabled: Boolean(code), staleTime: 3600_000 });
