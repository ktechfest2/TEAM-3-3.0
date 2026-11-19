"use client";
import { useState } from "react";
import Link from "next/link";
import { useQueuePosition, useQueueState, useJoinQueue, useMyQueueEntry, useSetQueueStatus } from "@/api/service/queue/queries";
import type { PollingUnit } from "@/api/service/polling-units/types";
import { useAuth } from "@/api/service/auth/queries";
import { Banner } from "@/components/ui/Banner";
import { Burst } from "@/components/ui/Burst";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { StatsSkeleton } from "@/components/ui/Skeleton";
import { useT } from "@/hooks/useT";
import { getCurrentFix, type GeoFix } from "@/lib/geo";
import { estimateAhead } from "@/lib/queue";
import { errMessage } from "@/lib/utils";
import { toast } from "@/stores/toast";

/** The unofficial virtual line. The warning banner is deliberately permanent and always visible. */
export function QueuePanel({ unit }: { unit: PollingUnit }) {
  const { t } = useT();
  const { isSignedIn } = useAuth();
  const state = useQueueState(unit.code);
  const entry = useMyQueueEntry(unit.code, isSignedIn);
  const waiting = entry.data?.status === "waiting";
  const position = useQueuePosition(unit.code, waiting);
  const join = useJoinQueue();
  const setStatus = useSetQueueStatus();
  const [needManual, setNeedManual] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  const doJoin = async (manual = false) => {
    if (e?.status === "voted") {
      toast.info(t("unit.alreadyVoted"));
      return;
    }
    let fix: GeoFix | null = null;
    const noCoords = unit.lat == null || unit.lng == null;
    if (!manual && !noCoords) {
      try { fix = await getCurrentFix(); }
      catch { setNeedManual(t("unit.manualHint")); return; }
    }
    join.mutate(
      { puCode: unit.code, lat: fix?.lat ?? null, lng: fix?.lng ?? null, manual: manual || noCoords },
      {
        onSuccess: () => { setNeedManual(null); setBurst((n) => n + 1); },
        onError: (e) => {
          if (/already voted/i.test(e.message)) toast.error(t("unit.alreadyVoted"));
          else if (/too far/i.test(e.message)) setNeedManual(t("unit.tooFar"));
          else if (/manually/i.test(e.message)) setNeedManual(t("unit.manualHint"));
          else toast.error(errMessage(e, t("common.error")));
        },
      },
    );
  };

  const s = state.data;
  const e = entry.data;
  const ahead = !e || e.status !== "waiting" ? null
    : position.data ?? (s ? estimateAhead({ ticket: e.ticket, waiting: s.waiting_count, accredited: s.accredited_count, voted: s.voted_count }) : null);

  return (
    <section className="stack stack-3" aria-label={t("unit.headcount")}>
      <div className="spread"><h2 className="title-2">{t("unit.headcount")}</h2><span className="badge badge--burst"><span className="dot dot--live" />{t("unit.live")}</span></div>

      <Banner>{t("unit.unofficial")}</Banner>

      {state.isLoading ? <StatsSkeleton /> : (
        <div className="grid-3">
          <div className="stat"><b>{s?.waiting_count ?? 0}</b><span>{t("unit.waiting")}</span></div>
          <div className="stat"><b>{s?.accredited_count ?? 0}</b><span>{t("unit.accredited")}</span></div>
          <div className="stat"><b>{s?.voted_count ?? 0}</b><span>{t("unit.voted")}</span></div>
        </div>
      )}

      {!isSignedIn ? (
        <Link href="/sign-in" className="btn btn-primary btn-block">{t("common.signInToContinue")}</Link>
      ) : entry.isLoading ? (
        <div className="skeleton" style={{ height: 50, borderRadius: 16 }} />
      ) : e?.status === "voted" ? (
        <div className="card card--accent stack stack-4 center">
          <div style={{ display: "grid", placeItems: "center", minHeight: 80 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="check" size={30} />
            </div>
          </div>
          <div className="stack stack-1">
            <div className="headline" style={{ fontSize: 18 }}>{t("unit.youVoted")}</div>
            <div className="caption">{t("unit.ticket")} #{e.ticket}</div>
            <p className="callout" style={{ margin: "6px 0 0" }}>{t("unit.votedBody")}</p>
          </div>
        </div>
      ) : !e ? (
        <>
          <Button variant="primary" block loading={join.isPending} onClick={() => void doJoin(false)} icon={<Icon name="pin" size={20} />}>
            {join.isPending ? t("unit.joining") : t("unit.join")}
          </Button>
          {needManual && (
            <div className="card stack stack-3">
              <p className="callout">{needManual}</p>
              <p className="caption">{unit.lat == null ? t("unit.noCoords") : t("unit.manualHint")}</p>
              <Button block loading={join.isPending} onClick={() => void doJoin(true)}>{t("unit.confirmManual")}</Button>
            </div>
          )}
        </>
      ) : (
        <div className="card card--accent stack stack-4 center">
          <div style={{ display: "grid", placeItems: "center", minHeight: 96 }}>
            {burst > 0 ? <Burst key={burst} label={t("unit.inLine")} /> : <span className="big-number">#{e.ticket}</span>}
          </div>
          <div className="stack stack-1">
            <div className="headline">{e.status === "waiting" ? t("unit.inLine") : t("unit.accredited")} · {t("unit.ticket")} #{e.ticket}</div>
            {ahead != null && <div className="callout">{ahead <= 0 ? t("unit.next") : t("unit.ahead", { n: ahead })}</div>}
            <div className="caption">{e.location_verified ? t("unit.verifiedLoc") : t("unit.unverifiedLoc")}</div>
          </div>
          <div className="stack stack-2">
            {e.status === "waiting" && <Button block loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: e.id, status: "accredited" })}>{t("unit.iAccredited")}</Button>}
            <Button block loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: e.id, status: "voted" }, { onSuccess: () => toast.success(t("unit.youVoted")) })}>{t("unit.iVoted")}</Button>
            <Button variant="ghost" block loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: e.id, status: "left" })}>{t("unit.leave")}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
