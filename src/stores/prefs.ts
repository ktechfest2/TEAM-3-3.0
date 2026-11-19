import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/i18n";

export type ThemePref = "dark" | "light" | "system";

interface PrefsState {
  theme: ThemePref;
  highContrast: boolean;
  reduceMotion: boolean;
  lang: Lang;
  setTheme: (t: ThemePref) => void;
  setHighContrast: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setLang: (l: Lang) => void;
}

// Persisted under "vp-prefs". The inline script in layout.tsx reads the same key before paint.
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "dark", highContrast: false, reduceMotion: false, lang: "en",
      setTheme: (theme) => set({ theme }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setLang: (lang) => set({ lang }),
    }),
    { name: "vp-prefs" },
  ),
);
