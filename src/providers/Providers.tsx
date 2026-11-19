"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastHost } from "@/components/ui/Toasts";
import { AppEffects } from "./AppEffects";
import { LenisProvider } from "./LenisProvider";
import { ThemeSync } from "./ThemeSync";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
  }));
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <LenisProvider />
      <AppEffects />
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
