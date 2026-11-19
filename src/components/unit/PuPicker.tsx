"use client";
import { useEffect, useState } from "react";
import { usePuSearch, useWardUnits, useWards } from "@/api/service/polling-units/queries";
import type { PollingUnit, Ward } from "@/api/service/polling-units/types";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/Sheet";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { useDictation } from "@/hooks/useVoice";
import { useT } from "@/hooks/useT";

function UnitRow({ u, onPick }: { u: PollingUnit; onPick: (u: PollingUnit) => void }) {
  return (
    <button className="list-row" onClick={() => onPick(u)}>
      <Icon name="pin" size={22} />
      <div className="grow">
        <div className="headline" style={{ fontSize: 16 }}>{u.name}</div>
        <div className="caption">{u.ward_name} · {u.lga_name} · {u.code}</div>
      </div>
      {u.lat == null && <span className="badge">no map</span>}
    </button>
  );
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

/** Search-first picker with a ward browser fallback. Wards are cached on-device after first load. */
export function PuPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (u: PollingUnit) => void }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [ward, setWard] = useState<Ward | null>(null);
  const dq = useDebounced(q, 300);
  const search = usePuSearch(dq);
  const wards = useWards();
  const wardUnits = useWardUnits(ward?.ward_key ?? null);
  const mic = useDictation((text) => setQ((p) => (p ? `${p} ${text}` : text)));

  const pick = (u: PollingUnit) => { onSelect(u); onClose(); setQ(""); setWard(null); };
  const searching = dq.trim().length >= 2;

  return (
    <Sheet open={open} onClose={onClose} title={t("unit.choose")}>
      <div className="stack stack-4" style={{ paddingBottom: 8 }}>
        <div className="row">
          <div className="grow" style={{ position: "relative" }}>
            <input className="input" type="search" inputMode="search" enterKeyHint="search" autoCapitalize="none" autoCorrect="off"
              placeholder={t("unit.search")} value={q} onChange={(e) => { setQ(e.target.value); setWard(null); }} aria-label={t("unit.search")} />
          </div>
          <IconButton label={mic.state === "recording" ? t("voice.stop") : t("voice.dictate")} className={mic.state === "recording" ? "mic--rec" : ""} onClick={() => void mic.toggle()} disabled={mic.state === "transcribing"}>
            {mic.state === "transcribing" ? <span className="spinner" /> : <Icon name="mic" size={20} />}
          </IconButton>
        </div>

        {searching ? (
          search.isLoading ? <ListSkeleton rows={4} /> :
          search.isError ? <ErrorCard message={t("common.error")} onRetry={() => search.refetch()} retryLabel={t("common.retry")} /> :
          (search.data?.length ?? 0) === 0 ? <StateCard icon="search" title={t("common.empty")} /> :
          <div className="card card--flush list">{search.data!.map((u) => <UnitRow key={u.code} u={u} onPick={pick} />)}</div>
        ) : ward ? (
          <div className="stack stack-3">
            <Button size="sm" variant="ghost" icon={<Icon name="chevronLeft" size={18} />} onClick={() => setWard(null)}>{t("unit.wards")}</Button>
            <div className="eyebrow">{ward.ward_name} · {ward.lga_name}</div>
            {wardUnits.isLoading ? <ListSkeleton rows={4} /> :
              wardUnits.isError ? <ErrorCard message={t("common.error")} onRetry={() => wardUnits.refetch()} retryLabel={t("common.retry")} /> :
              <div className="card card--flush list">{wardUnits.data!.map((u) => <UnitRow key={u.code} u={u} onPick={pick} />)}</div>}
          </div>
        ) : (
          <div className="stack stack-3">
            <div className="eyebrow">{t("unit.browse")}</div>
            {wards.isLoading ? <ListSkeleton rows={4} /> :
              wards.isError ? <ErrorCard message={t("common.error")} onRetry={() => wards.refetch()} retryLabel={t("common.retry")} /> :
              (wards.data?.length ?? 0) === 0 ? <StateCard icon="pin" title={t("common.empty")} /> :
              <div className="card card--flush list">
                {wards.data!.map((w) => (
                  <button key={w.ward_key} className="list-row" onClick={() => setWard(w)}>
                    <div className="grow"><div className="headline" style={{ fontSize: 16 }}>{w.ward_name}</div><div className="caption">{w.lga_name} · {w.state_name} · {w.pu_count} {t("unit.units").toLowerCase()}</div></div>
                    <Icon name="chevronRight" size={18} />
                  </button>
                ))}
              </div>}
          </div>
        )}
      </div>
    </Sheet>
  );
}
