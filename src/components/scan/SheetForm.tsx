"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/i18n";
import type { SheetNumbers } from "@/lib/sheet";

const TOTALS: Array<{ key: "registered" | "accredited" | "valid" | "rejected" | "total"; label: MessageKey }> = [
  { key: "registered", label: "scan.registered" }, { key: "accredited", label: "scan.accredited" },
  { key: "valid", label: "scan.valid" }, { key: "rejected", label: "scan.rejected" }, { key: "total", label: "scan.total" },
];

const parse = (v: string): number | null => (v === "" ? null : /^\d{1,9}$/.test(v) ? parseInt(v, 10) : null);

function NumField({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (n: number | null) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input num-input" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={value ?? ""} placeholder="-"
        onChange={(e) => onChange(parse(e.target.value.replace(/\D/g, "")))} />
    </div>
  );
}

export function SheetForm({ sheet, onChange }: { sheet: SheetNumbers; onChange: (s: SheetNumbers) => void }) {
  const { t } = useT();
  const [newParty, setNewParty] = useState("");

  const addParty = () => {
    const name = newParty.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (!name || name in sheet.scores) { setNewParty(""); return; }
    onChange({ ...sheet, scores: { ...sheet.scores, [name]: null } });
    setNewParty("");
  };
  const removeParty = (p: string) => {
    const { [p]: _gone, ...rest } = sheet.scores;
    void _gone;
    onChange({ ...sheet, scores: rest });
  };

  return (
    <div className="stack stack-4">
      <div className="stack stack-1"><h3 className="headline">{t("scan.confirm")}</h3><p className="caption">{t("scan.confirmHint")}</p></div>
      <div className="grid-2">
        {TOTALS.map((f) => <NumField key={f.key} id={`f-${f.key}`} label={t(f.label)} value={sheet[f.key]} onChange={(n) => onChange({ ...sheet, [f.key]: n })} />)}
      </div>
      <div className="stack stack-3">
        <div className="eyebrow">{t("scan.parties")}</div>
        <div className="grid-2">
          {Object.keys(sheet.scores).map((p) => (
            <div key={p} style={{ position: "relative" }}>
              <NumField id={`p-${p}`} label={p} value={sheet.scores[p]} onChange={(n) => onChange({ ...sheet, scores: { ...sheet.scores, [p]: n } })} />
              {!["APC", "PDP", "LP", "NNPP", "ADC", "APGA", "SDP", "YPP"].includes(p) && (
                <button className="chip" style={{ position: "absolute", top: -4, right: 0, minHeight: 26, padding: "0 8px" }} aria-label={`Remove ${p}`} onClick={() => removeParty(p)}><Icon name="x" size={12} /></button>
              )}
            </div>
          ))}
        </div>
        <div className="row">
          <input className="input grow" placeholder="e.g. AA" value={newParty} maxLength={12} autoCapitalize="characters" onChange={(e) => setNewParty(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addParty(); }} aria-label={t("scan.addParty")} />
          <Button size="sm" icon={<Icon name="plus" size={16} />} onClick={addParty}>{t("scan.addParty")}</Button>
        </div>
      </div>
    </div>
  );
}
