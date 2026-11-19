import { create } from "zustand";

export interface Toast { id: number; kind: "info" | "success" | "error"; text: string }
interface ToastState { toasts: Toast[]; push: (kind: Toast["kind"], text: string) => void; dismiss: (id: number) => void }

let seq = 0;
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, text) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, text }] }));
    setTimeout(() => get().dismiss(id), kind === "error" ? 5000 : 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (t: string) => useToasts.getState().push("info", t),
  success: (t: string) => useToasts.getState().push("success", t),
  error: (t: string) => useToasts.getState().push("error", t),
};
