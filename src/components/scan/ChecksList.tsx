"use client";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import { runChecks, summarise, type SheetNumbers } from "@/lib/sheet";

/** Deterministic arithmetic - no AI. Neutral wording: it says what doesn't add up, never why. */
export function ChecksList({ sheet }: { sheet: SheetNumbers }) {
  const { t } = useT();
  const checks = runChecks(sheet);
  const summary = summarise(checks);
  return (
    <section className="card stack stack-3" aria-label={t("scan.checks")}>
      <div className="spread"><h3 className="headline">{t("scan.checks")}</h3>
        <span className={`status status--${summary === "all_clear" ? "pass" : summary === "needs_review" ? "fail" : "unknown"}`}>{t(`sheetSummary.${summary}`)}</span></div>
      <ul className="stack stack-2">
        {checks.map((c) => (
          <li key={c.id} className="row" style={{ alignItems: "flex-start" }}>
            <span className={`status status--${c.status}`} style={{ minWidth: 20 }}>
              <Icon name={c.status === "pass" ? "check" : c.status === "fail" ? "alert" : "info"} size={18} />
            </span>
            <div className="grow">
              <div className="callout" style={{ color: "var(--text)" }}>{t(`sheetCheck.${c.id}`)}</div>
              <div className={`caption status--${c.status}`}>
                {t(`sheetStatus.${c.status}`)}
                {c.detail ? ` (${Object.entries(c.detail).map(([k, v]) => `${k} ${v}`).join(" · ")})` : ""}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="caption">{t("scan.neutral")}</p>
    </section>
  );
}
