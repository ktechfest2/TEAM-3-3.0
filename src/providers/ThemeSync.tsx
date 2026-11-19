"use client";
import { useEffect } from "react";
import { usePrefs } from "@/stores/prefs";

const COLORS = { dark: "#060507", light: "#f3f4f5" } as const;

/** Applies theme / contrast / motion preferences to <html> and keeps the browser chrome colour in step. */
export function ThemeSync() {
  const { theme, highContrast, reduceMotion } = usePrefs();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "light" : "dark") : theme;
      const root = document.documentElement;
      root.dataset.theme = resolved;
      root.dataset.contrast = highContrast ? "high" : "normal";
      root.dataset.motion = reduceMotion ? "reduce" : "normal";
      // The theme-color tag is per-scheme in the viewport export; a manual toggle must override both.
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", COLORS[resolved]));
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, highContrast, reduceMotion]);

  return null;
}
