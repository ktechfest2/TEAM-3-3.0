"use client";
import { useElectionDates } from "@/api/service/config/queries";
import { Skeleton } from "@/components/ui/Skeleton";
import { useT } from "@/hooks/useT";
import { daysUntil } from "@/lib/utils";

export function Countdown() {
  const { t } = useT();
  const q = useElectionDates();
  if (q.isLoading) return <div className="card stack stack-3"><Skeleton w={90} h={12} /><Skeleton w={120} h={56} r={12} /><Skeleton w="70%" /></div>;
  const date = q.data?.presidential_nass;
  if (!date) return null;
  const n = daysUntil(date);
  if (n < 0) return null;
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="card card--accent stack stack-2" aria-label="Election countdown">
      <span className="eyebrow">{pretty}</span>
      {n === 0 ? <p className="title-2">{t("home.countdownToday")}</p> : (
        <>
          <div className="big-number">{n}</div>
          <p className="callout">{n === 1 ? t("home.dayTo") : t("home.daysTo")}</p>
        </>
      )}
    </section>
  );
}
