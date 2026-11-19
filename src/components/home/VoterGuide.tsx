"use client";
import { useAccreditationWindow } from "@/api/service/config/queries";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/i18n";

const STEPS: MessageKey[] = ["guide.1", "guide.2", "guide.3", "guide.4", "guide.5"];

export function VoterGuide() {
  const { t } = useT();
  const win = useAccreditationWindow();
  return (
    <section className="card stack stack-4" aria-label={t("home.guide")}>
      <h2 className="title-2">{t("home.guide")}</h2>
      <ol className="stack stack-3" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {STEPS.map((k, i) => (
          <li key={k} className="row" style={{ alignItems: "flex-start" }}>
            <span className="badge num" style={{ minWidth: 26, justifyContent: "center" }}>{i + 1}</span>
            <span className="callout grow" style={{ color: "var(--text)" }}>{t(k)}</span>
          </li>
        ))}
      </ol>
      {win.data && <p className="caption">{win.data.start} – {win.data.end}{win.data.note ? ` · ${win.data.note}` : ""}</p>}
    </section>
  );
}
