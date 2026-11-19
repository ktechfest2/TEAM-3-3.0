"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAuth } from "@/api/service/auth/queries";

/** Wrap a write action: signed-out guests are sent to /sign-in instead. */
export function useRequireAuth() {
  const router = useRouter();
  const { isSignedIn, isLoading } = useAuth();
  const require = useCallback(<A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    if (!isSignedIn) { router.push("/sign-in"); return; }
    fn(...a);
  }, [isSignedIn, router]);
  return { isSignedIn, isLoading, require };
}
