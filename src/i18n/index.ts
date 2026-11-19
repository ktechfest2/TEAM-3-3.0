import { en, type MessageKey } from "./en";
import { ha } from "./ha";
import { yo } from "./yo";
import { ig } from "./ig";
import { pcm } from "./pcm";

export type Lang = "en" | "ha" | "yo" | "ig" | "pcm";
export type { MessageKey };

export const LANGS: Array<{ code: Lang; label: string; english: string; speech: string }> = [
  { code: "en", label: "English", english: "English", speech: "en-NG" },
  { code: "ha", label: "Hausa", english: "Hausa", speech: "ha-NG" },
  { code: "yo", label: "Yorùbá", english: "Yoruba", speech: "yo-NG" },
  { code: "ig", label: "Igbo", english: "Igbo", speech: "ig-NG" },
  { code: "pcm", label: "Naijá (Pidgin)", english: "Pidgin", speech: "en-NG" },
];

const tables: Record<Lang, Partial<Record<MessageKey, string>>> = { en, ha, yo, ig, pcm };

export const isLang = (v: unknown): v is Lang => typeof v === "string" && v in tables;

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = tables[lang][key] ?? en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw;
}
