"use client";
import Link from "next/link";
import { useAuth } from "@/api/service/auth/queries";
import { useFactChecks } from "@/api/service/fact-checks/queries";
import { Button } from "@/components/ui/Button";
import { FactSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { useT } from "@/hooks/useT";
import { FactCheckCard } from "./FactCheckCard";

export function FactCheckFeed() {
  const { t, lang } = useT();
  const { isSignedIn } = useAuth();
  const q = useFactChecks(lang, isSignedIn);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="stack stack-3" aria-label={t("home.facts")}>
      <div className="spread"><h2 className="title-2">{t("home.facts")}</h2><span className="badge badge--burst"><span className="dot dot--live" />{t("unit.live")}</span></div>
      {!isSignedIn ? (
        <StateCard
          icon="shield"
          title={t("home.factsSignIn")}
          body={t("home.factsSignInBody")}
          action={
            <Link href="/sign-in" className="btn btn-primary btn-block">
              {t("common.signIn")}
            </Link>
          }
        />
      ) : q.isLoading ? (
        <><FactSkeleton /><FactSkeleton /></>
      ) : q.isError ? (
        <ErrorCard message={t("common.error")} onRetry={() => q.refetch()} retryLabel={t("common.retry")} />
      ) : items.length === 0 ? (
        <StateCard icon="shield" title={t("common.empty")} body={t("home.factsEmpty")} />
      ) : (
        <div className="stack stack-3 stagger">{items.map((it, i) => <FactCheckCard key={it.id} item={it} index={Math.min(i, 6)} />)}</div>
      )}
      {isSignedIn && q.hasNextPage && <Button block loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{t("common.more")}</Button>}
    </section>
  );
}
