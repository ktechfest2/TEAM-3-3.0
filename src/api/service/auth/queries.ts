"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, getSession, sendEmailOtp, signOut, verifyEmailOtp } from "./api";
import type { AuthStatus } from "./types";

export const authKeys = { session: ["auth", "session"] as const };

export function useAuth(): AuthStatus {
  const q = useQuery({ queryKey: authKeys.session, queryFn: getSession, staleTime: Infinity, gcTime: Infinity });
  const session = q.data ?? null;
  return { session, user: session?.user ?? null, isLoading: q.isLoading, isSignedIn: Boolean(session) };
}

export const useSendOtp = () => useMutation({ mutationFn: (v: { email: string; captchaToken?: string }) => sendEmailOtp(v.email, v.captchaToken) });

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; token: string }) => verifyEmailOtp(v.email, v.token),
    onSuccess: (session) => { qc.setQueryData(authKeys.session, session); qc.invalidateQueries({ queryKey: ["profile"] }); },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: signOut, onSuccess: () => { qc.clear(); qc.setQueryData(authKeys.session, null); } });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteAccount, onSuccess: () => { qc.clear(); qc.setQueryData(authKeys.session, null); } });
}
