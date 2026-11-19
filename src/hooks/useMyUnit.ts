"use client";
import { useCallback } from "react";
import { useAuth } from "@/api/service/auth/queries";
import { useProfile, useUpdateProfile } from "@/api/service/profile/queries";
import { usePollingUnit } from "@/api/service/polling-units/queries";
import { useUnitStore } from "@/stores/unit";

/** The user's chosen polling unit: profile (signed in) with a local fallback (guest). */
export function useMyUnit() {
  const { isSignedIn } = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const local = useUnitStore((s) => s.puCode);
  const setLocal = useUnitStore((s) => s.setPuCode);
  const code = (isSignedIn ? profile.data?.pu_code : null) ?? local ?? null;
  const unit = usePollingUnit(code);

  const setUnit = useCallback((c: string) => {
    setLocal(c);
    if (isSignedIn) update.mutate({ pu_code: c });
  }, [isSignedIn, setLocal, update]);

  return { code, unit: unit.data ?? null, isLoading: unit.isLoading || (isSignedIn && profile.isLoading), setUnit };
}
