"use client";
import { useState } from "react";
import { LedgerView } from "@/components/scan/LedgerView";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { VerifyPhoto } from "@/components/scan/VerifyPhoto";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { useT } from "@/hooks/useT";

type Tab = "scan" | "ledger" | "verify";

export default function ScanPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("scan");
  return (
    <main className="page">
      <PageHeader title={t("scan.title")} />
      <Segmented<Tab> label={t("scan.title")} value={tab} onChange={setTab}
        options={[{ value: "scan", label: t("scan.tab.scan") }, { value: "ledger", label: t("scan.tab.ledger") }, { value: "verify", label: t("scan.tab.verify") }]} />
      {tab === "scan" ? <ScanFlow /> : tab === "ledger" ? <LedgerView /> : <VerifyPhoto />}
    </main>
  );
}
