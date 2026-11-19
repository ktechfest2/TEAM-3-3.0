"use client";
import { useQuery } from "@tanstack/react-query";
import { getConfig } from "./api";
import type { AccreditationWindow, ElectionDates } from "./types";

export const useElectionDates = () =>
  useQuery({ queryKey: ["config", "election_dates"], queryFn: () => getConfig<ElectionDates>("election_dates"), staleTime: 3600_000 });

export const useAccreditationWindow = () =>
  useQuery({ queryKey: ["config", "accreditation_window"], queryFn: () => getConfig<AccreditationWindow>("accreditation_window"), staleTime: 3600_000 });
