"use client";
import { useState } from "react";
import { PuPicker } from "@/components/unit/PuPicker";
import { QueuePanel } from "@/components/unit/QueuePanel";
import { TipsPanel } from "@/components/unit/TipsPanel";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateCard } from "@/components/ui/StateCard";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";

export default function UnitPage() {
  const { t } = useT();
  const { code, unit, isLoading, setUnit } = useMyUnit();
  const [picking, setPicking] = useState(false);

  return (
    <main className="page">
      <PageHeader title={t("unit.title")} right={unit ? <Button size="sm" onClick={() => setPicking(true)}>{t("unit.change")}</Button> : undefined} />

      {isLoading && code ? (
        <div className="card stack stack-3"><Skeleton w="60%" h={22} /><Skeleton w="40%" /></div>
      ) : !unit ? (
        <StateCard icon="pin" title={t("unit.none")} action={<Button variant="primary" onClick={() => setPicking(true)}>{t("unit.choose")}</Button>} />
      ) : (
        <>
          <div className="card stack stack-2">
            <div className="row"><Icon name="pin" size={24} /><div className="headline grow">{unit.name}</div></div>
            <div className="callout">{unit.ward_name} · {unit.lga_name} · {unit.state_name}</div>
            <div className="mono">{unit.code}</div>
            {unit.code.startsWith("DM-") && <span className="badge badge--burst" style={{ alignSelf: "flex-start" }}>{t("common.demoData")}</span>}
          </div>
          <Banner icon="info" quiet>
            {t("unit.moved")}{" "}
            <a
              href="https://cvr.inecnigeria.org/pu"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              {t("common.inecPortal")}&nbsp;<Icon name="external" size={13} />
            </a>.
          </Banner>
          <QueuePanel unit={unit} />
          <TipsPanel unit={unit} />
        </>
      )}

      <PuPicker open={picking} onClose={() => setPicking(false)} onSelect={(u) => setUnit(u.code)} />
    </main>
  );
}
