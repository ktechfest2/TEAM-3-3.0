"use client";
import { useRouter } from "next/navigation";
import { useSetRequestStatus, useOpenThread } from "@/api/service/help/queries";
import type { HelpRequest } from "@/api/service/help/types";
import { useReportContent } from "@/api/service/tips/queries";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import { errMessage, timeAgo, stagger } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function RequestCard({ req, mine, index = 0 }: { req: HelpRequest; mine: boolean; index?: number }) {
  const { t } = useT();
  const router = useRouter();
  const open = useOpenThread();
  const setStatus = useSetRequestStatus();
  const report = useReportContent();
  const label = req.category === "custom" ? req.custom_label ?? t("help.cat.custom") : t(`help.cat.${req.category}`);

  return (
    <article className="card stack stack-3" style={stagger(Math.min(index, 6))}>
      <div className="row-wrap">
        <span className={`badge ${req.kind === "need" ? "badge--burst" : ""}`}>{req.kind === "need" ? t("help.need") : t("help.offer")}</span>
        <span className="badge">{label}</span>
        {req.status !== "open" && <span className="badge">{req.status === "matched" ? t("help.matched") : t("help.closed")}</span>}
        <span className="caption">{timeAgo(req.created_at)}</span>
      </div>
      <p>{req.body}</p>
      <div className="row-wrap">
        {!mine && req.status === "open" && (
          <Button size="sm" variant="primary" loading={open.isPending} onClick={() => open.mutate(req.id, { onSuccess: (id) => router.push(`/chat/${id}`), onError: (e) => toast.error(errMessage(e, t("common.error"))) })}>{t("help.message")}</Button>
        )}
        {mine && req.status === "open" && <Button size="sm" onClick={() => setStatus.mutate({ id: req.id, status: "matched" })}>{t("help.matched")}</Button>}
        {mine && req.status !== "closed" && <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: req.id, status: "closed" })}>{t("help.close")}</Button>}
        {!mine && <button className="chip" aria-label={t("common.report")} onClick={() => report.mutate({ type: "accessibility_request", id: req.id }, { onSuccess: () => toast.info(t("common.reported")) })}><Icon name="flag" size={16} /></button>}
      </div>
    </article>
  );
}
