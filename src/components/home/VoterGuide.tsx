"use client";
import { useState } from "react";
import { useAccreditationWindow } from "@/api/service/config/queries";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/i18n";

const STEPS: MessageKey[] = ["guide.1", "guide.2", "guide.3", "guide.4", "guide.5"];

export function VoterGuide() {
  const { t } = useT();
  const [open, setOpen] = useState(true);
  const win = useAccreditationWindow();

  return (
    <section className="card stack stack-3" aria-label={t("home.guide")}>
      <button
        type="button"
        className="spread"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          width: "100%",
          cursor: "pointer",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <h2 className="title-2" style={{ margin: 0 }}>{t("home.guide")}</h2>
        <span style={{ display: "inline-flex", alignItems: "center", color: "var(--muted)" }}>
          <Icon name={open ? "chevronUp" : "chevronDown"} size={20} />
        </span>
      </button>

      {open && (
        <div className="stack stack-3">
          <ol className="stack stack-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STEPS.map((k, i) => (
              <li key={k} className="row" style={{ alignItems: "flex-start" }}>
                <span className="badge num" style={{ minWidth: 26, justifyContent: "center" }}>{i + 1}</span>
                <span className="callout grow" style={{ color: "var(--text)" }}>{t(k)}</span>
              </li>
            ))}
          </ol>
          {win.data && <p className="caption">{win.data.start} – {win.data.end}{win.data.note ? ` · ${win.data.note}` : ""}</p>}
        </div>
      )}
    </section>
  );
}
