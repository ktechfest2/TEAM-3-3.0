"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { Icon } from "@/components/ui/icons";
import { getDb } from "@/db/dexie";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/i18n";

const ITEMS: Array<{ id: string; label: MessageKey }> = [
  { id: "pvc", label: "check.pvc" }, { id: "unit", label: "check.unit" }, { id: "route", label: "check.route" },
  { id: "window", label: "check.window" }, { id: "bring", label: "check.bring" }, { id: "share", label: "check.share" },
];

/** Readiness checklist kept on-device (works offline, nothing is sent anywhere). */
export function Checklist() {
  const { t } = useT();
  const rows = useLiveQuery(() => getDb().checklist.toArray(), [], []);
  const done = new Set(rows.filter((r) => r.done).map((r) => r.id));
  const pct = Math.round((done.size / ITEMS.length) * 100);

  const toggle = (id: string) => getDb().checklist.put({ id, done: !done.has(id) });

  return (
    <section className="card stack stack-3" aria-label={t("home.ready")}>
      <div className="spread"><h2 className="title-2">{t("home.ready")}</h2><span className="caption num">{done.size}/{ITEMS.length}</span></div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
      <div className="list">
        {ITEMS.map((it) => (
          <button key={it.id} className="check" role="checkbox" aria-checked={done.has(it.id)} onClick={() => toggle(it.id)}>
            <span className="check-box">{done.has(it.id) && <Icon name="check" size={16} strokeWidth={2.6} />}</span>
            <span className="check-label callout" style={{ color: "inherit" }}>{t(it.label)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
