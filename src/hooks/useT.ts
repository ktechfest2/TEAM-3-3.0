"use client";
import { useCallback } from "react";
import { usePrefs } from "@/stores/prefs";
import { translate, type MessageKey } from "@/i18n";

export function useT() {
  const lang = usePrefs((s) => s.lang);
  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  return { t, lang };
}
