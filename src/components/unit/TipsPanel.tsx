"use client";
import { useState } from "react";
import { useAuth } from "@/api/service/auth/queries";
import { useMyTipVotes, usePostTip, useReportContent, useTips, useToggleTipVote } from "@/api/service/tips/queries";
import type { PollingUnit } from "@/api/service/polling-units/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useT } from "@/hooks/useT";
import { getCurrentFix } from "@/lib/geo";
import { errMessage, timeAgo, stagger } from "@/lib/utils";
import { toast } from "@/stores/toast";

const MIN = 5, MAX = 200;

export function TipsPanel({ unit }: { unit: PollingUnit }) {
  const { t } = useT();
  const { user, isSignedIn } = useAuth();
  const { require } = useRequireAuth();
  const tips = useTips(unit.ward_key);
  const ids = (tips.data ?? []).map((x) => x.id);
  const mine = useMyTipVotes(unit.ward_key, ids, isSignedIn);
  const post = usePostTip(unit.ward_key);
  const vote = useToggleTipVote(unit.ward_key);
  const report = useReportContent();
  const [body, setBody] = useState("");
  const voted = new Set(mine.data ?? []);
  const ok = body.trim().length >= MIN && body.trim().length <= MAX;

  const submit = require(async () => {
    // Location is optional and only used to mark the tip as "posted near a unit".
    let lat: number | null = null, lng: number | null = null;
    try { const f = await getCurrentFix(4000); lat = f.lat; lng = f.lng; } catch { /* location is optional */ }
    post.mutate({ puCode: unit.code, body: body.trim(), lat, lng }, {
      onSuccess: () => { setBody(""); toast.success(t("common.done")); },
      onError: (e) => toast.error(errMessage(e, t("common.error"))),
    });
  });

  return (
    <section className="stack stack-3" aria-label={t("unit.tips")}>
      <h2 className="title-2">{t("unit.tips")}</h2>
      <div className="card stack stack-3">
        <textarea className="textarea" maxLength={MAX} placeholder={t("unit.tipPlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} aria-label={t("unit.tipPlaceholder")} />
        <div className="spread"><span className="caption num">{body.trim().length}/{MAX}</span><Button size="sm" variant="primary" disabled={!ok} loading={post.isPending} onClick={submit}>{t("unit.tipPost")}</Button></div>
      </div>

      {tips.isLoading ? <CardSkeleton lines={2} /> :
        tips.isError ? <ErrorCard message={t("common.error")} onRetry={() => tips.refetch()} retryLabel={t("common.retry")} /> :
        (tips.data?.length ?? 0) === 0 ? <StateCard icon="info" title={t("unit.tipsEmpty")} /> :
        <div className="stack stack-3 stagger">
          {tips.data!.map((tip, i) => (
            <article key={tip.id} className="card stack stack-3" style={stagger(Math.min(i, 6))}>
              <p>{tip.body}</p>
              <div className="spread">
                <div className="row-wrap">
                  {tip.verified && <span className="badge badge--burst">{t("unit.tipVerified")}</span>}
                  <span className="caption">{timeAgo(tip.created_at)}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="chip" aria-pressed={voted.has(tip.id)} aria-label="Upvote" onClick={require(() => vote.mutate(tip.id, { onError: (e) => toast.error(e.message) }))}>
                    <Icon name="arrowUp" size={16} /><span className="num">{tip.upvotes}</span>
                  </button>
                  {tip.author_id !== user?.id && (
                    <button className="chip" aria-label={t("common.report")} onClick={require(() => report.mutate({ type: "ward_tip", id: tip.id }, { onSuccess: () => toast.info(t("common.reported")) }))}>
                      <Icon name="flag" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>}
    </section>
  );
}
