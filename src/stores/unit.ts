import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Guests keep their chosen polling unit on the device; signed-in users also store it on their profile. */
export const useUnitStore = create<{ puCode: string | null; setPuCode: (c: string | null) => void }>()(
  persist((set) => ({ puCode: null, setPuCode: (puCode) => set({ puCode }) }), { name: "vp-unit" }),
);
