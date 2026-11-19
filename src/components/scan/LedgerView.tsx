"use client";
import { useState } from "react";
import { useAuth } from "@/api/service/auth/queries";
import { useConsensus, useMySheets, usePendingSeals, usePuLedger, useVerifyChain } from "@/api/service/scanner/queries";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { PuPicker } from "@/components/unit/PuPicker";
import type { PollingUnit } from "@/api/service/polling-units/types";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";
import { shortHash, stagger } from "@/lib/utils";
import { MyScanCard } from "./MyScanCard";
import { ScoreSummary } from "./ScoreSummary";

export function LedgerView() {
  const { t } = useT();
  const { isSignedIn } = useAuth();
  const mine = useMyUnit();
  const [chosen, setChosen] = useState<PollingUnit | null>(null);
  const [picking, setPicking] = useState(false);
  const unit = chosen ?? mine.unit;
  const ledger = usePuLedger(unit?.code);
  const consensus = useConsensus(unit?.code);
  const verifyChain = useVerifyChain();
  const mySheets = useMySheets(isSignedIn);
  const pending = usePendingSeals();

  return (
    <div className="stack stack-4">
      {pending > 0 && <Banner icon="inbox">{t("scan.queuedOffline")} ({pending})</Banner>}

      <button className="card row" style={{ textAlign: "left" }} onClick={() => setPicking(true)}>
        <Icon name="pin" size={22} />
        <div className="grow"><div className="eyebrow">{t("scan.publicLedger")}</div><div className="headline" style={{ fontSize: 16 }}>{unit ? unit.name : t("unit.choose")}</div></div>
        <Icon name="chevronRight" size={18} />
      </button>

      {unit && (
        <>
          <section className="stack stack-3">
            <h3 className="title-2">{t("scan.consensus")}</h3>
            {consensus.isLoading ? <CardSkeleton lines={2} /> : consensus.isError ? <ErrorCard onRetry={() => consensus.refetch()} retryLabel={t("common.retry")} /> :
              (consensus.data?.length ?? 0) === 0 ? <StateCard icon="ledger" title={t("scan.noLedger")} /> :
              consensus.data!.map((c, i) => (
                <div key={i} className="card stack stack-2">
                  <div className="spread"><span className="badge badge--burst num">{t("scan.agree", { n: Number(c.submissions) })}</span></div>
                  <ScoreSummary scores={c.scores} />
                </div>
              ))}
          </section>

          <section className="stack stack-3">
            <div className="spread">
              <h3 className="title-2">{t("scan.publicLedger")}</h3>
              <Button size="sm" loading={verifyChain.isPending} onClick={() => verifyChain.mutate(unit.code)}>{t("scan.verifyChain")}</Button>
            </div>
            {verifyChain.isSuccess && (
              <Banner icon={verifyChain.data === null ? "shield" : "alert"} quiet={verifyChain.data === null}>
                {verifyChain.data === null ? t("scan.chainOk") : t("scan.chainBroken")}
              </Banner>
            )}
            {ledger.isLoading ? <CardSkeleton /> : ledger.isError ? <ErrorCard onRetry={() => ledger.refetch()} retryLabel={t("common.retry")} /> :
              (ledger.data?.length ?? 0) === 0 ? <StateCard icon="ledger" title={t("scan.noLedger")} /> :
              <div className="stack stack-3 stagger">
                {ledger.data!.map((e, i) => (
                  <article key={e.id} className="card stack stack-3" style={stagger(Math.min(i, 6))}>
                    <div className="caption">{t("scan.serverTime")}: {new Date(e.created_at).toLocaleString()}</div>
                    <ScoreSummary scores={e.scores} />
                    <div className="stack stack-1"><span className="eyebrow">SHA-256</span><span className="mono">{shortHash(e.sha256, 14)}</span></div>
                    <div className="stack stack-1"><span className="eyebrow">{t("scan.chain")}</span><span className="mono">{shortHash(e.chain_hash, 14)}</span></div>
                  </article>
                ))}
              </div>}
          </section>
        </>
      )}

      {isSignedIn && (
        <section className="stack stack-3">
          <h3 className="title-2">{t("scan.myScans")}</h3>
          {mySheets.isLoading ? <CardSkeleton lines={2} /> :
            (mySheets.data?.length ?? 0) === 0 ? <StateCard icon="camera" title={t("scan.noScans")} /> :
            <div className="stack stack-3 stagger">
              {mySheets.data!.map((s) => (
                <MyScanCard key={s.id} sheet={s} />
              ))}
            </div>}
        </section>
      )}

      <PuPicker open={picking} onClose={() => setPicking(false)} onSelect={(u) => setChosen(u)} />
    </div>
  );
}
