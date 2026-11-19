"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/api/service/auth/queries";
import { useUpdateProfile } from "@/api/service/profile/queries";
import { Icon } from "@/components/ui/icons";
import { LANGS, type Lang } from "@/i18n";
import { usePrefs } from "@/stores/prefs";

const LANG_ABBRS: Record<Lang, string> = {
  en: "En",
  ha: "Ha",
  yo: "Yo",
  ig: "Ig",
  pcm: "Pcm",
};

export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang, setLang } = usePrefs();
  const { isSignedIn } = useAuth();
  const update = useUpdateProfile();

  const pickLang = (l: Lang) => {
    setLang(l);
    if (isSignedIn) update.mutate({ language: l });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="chip"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
        style={{
          minHeight: 34,
          padding: "0 10px 0 12px",
          gap: 4,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.02em",
          cursor: "pointer",
          border: "1px solid var(--border)",
        }}
      >
        <span>{LANG_ABBRS[lang]}</span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 60,
            minWidth: 160,
            padding: 6,
            borderRadius: 14,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {LANGS.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pickLang(l.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? "var(--surface-3)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-2)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span>
                  <strong style={{ display: "inline-block", minWidth: 32 }}>{LANG_ABBRS[l.code]}</strong>
                  <span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 6 }}>{l.label}</span>
                </span>
                {active && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

