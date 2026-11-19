import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "@/i18n";

export type ThemePref = "dark" | "light" | "system";

interface PrefsState {
  theme: ThemePref;
  highContrast: boolean;
  reduceMotion: boolean;
  lang: Lang;
  voiceRate: number;
  voiceURI: string | null;
  setTheme: (t: ThemePref) => void;
  setHighContrast: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setLang: (l: Lang) => void;
  setVoiceRate: (r: number) => void;
  setVoiceURI: (uri: string | null) => void;
}

// Persisted under "vp-prefs". The inline script in layout.tsx reads the same key before paint.
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "dark", highContrast: false, reduceMotion: false, lang: "en",
      voiceRate: 1.0, voiceURI: null,
      setTheme: (theme) => set({ theme }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setLang: (lang) => set({ lang }),
      setVoiceRate: (voiceRate) => set({ voiceRate }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),
    }),
    { name: "vp-prefs" },
  ),
);
