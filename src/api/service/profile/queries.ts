"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/api/service/auth/queries";
import { getProfile, updateProfile } from "./api";
import type { ProfilePatch } from "./types";

export const profileKeys = { me: (id?: string) => ["profile", id] as const };

export function useProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: profileKeys.me(user?.id), queryFn: () => getProfile(user!.id), enabled: Boolean(user) });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(user!.id, patch),
    onSuccess: (p) => qc.setQueryData(profileKeys.me(user?.id), p),
  });
}

/** Called right after sign-in, when the cached session may not be set yet, so the user id is passed in. */
export function useAcceptTerms() {
  return useMutation({
    mutationFn: (v: { userId: string; language: ProfilePatch["language"] }) =>
      updateProfile(v.userId, { consented_at: new Date().toISOString(), language: v.language }),
  });
}
