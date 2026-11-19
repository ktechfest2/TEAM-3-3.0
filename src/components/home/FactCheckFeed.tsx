"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/api/service/auth/queries";
import { useFactChecks } from "@/api/service/fact-checks/queries";
import type { FactCheckView } from "@/api/service/fact-checks/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { FactSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";
import { FactCheckCard } from "./FactCheckCard";

function matchText(item: FactCheckView, target: string | null | undefined): boolean {
  if (!target || target.trim().length < 3) return false;
  const term = target.trim().toLowerCase();
  const title = (item.shownTitle || item.title || "").toLowerCase();
  const summary = (item.shownSummary || item.summary || "").toLowerCase();
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  return title.includes(term) || summary.includes(term) || tags.some((t) => t.includes(term));
}

function matchState(item: FactCheckView, stateCode: string | null | undefined, stateName: string | null | undefined): boolean {
  if (stateCode && item.state_code && item.state_code.toLowerCase() === stateCode.toLowerCase()) {
    return true;
  }
  return matchText(item, stateName);
}

function sortOthers(list: FactCheckView[]) {
  return [...list].sort((a, b) => {
    const aNat = !a.state_code ? 1 : 0;
    const bNat = !b.state_code ? 1 : 0;
    return bNat - aNat;
  });
}

export function FactCheckFeed() {
  const { t, lang } = useT();
  const { isSignedIn } = useAuth();
  const { unit } = useMyUnit();
  const q = useFactChecks(lang, isSignedIn);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const [othersCount, setOthersCount] = useState(5);

  const { localItems, localLabel, sortedOthers } = useMemo(() => {
    if (!items.length) {
      return { localItems: [], localLabel: null, sortedOthers: [] };
    }
    if (!unit) {
      return { localItems: [], localLabel: null, sortedOthers: sortOthers(items) };
    }

    // 1. Ward match
    const wardMatches = items.filter((it) => matchText(it, unit.ward_name));
    if (wardMatches.length > 0) {
      const matchIds = new Set(wardMatches.map((w) => w.id));
      return {
        localItems: wardMatches,
        localLabel: unit.ward_name,
        sortedOthers: sortOthers(items.filter((it) => !matchIds.has(it.id))),
      };
    }

    // 2. Town / LGA match
    const lgaMatches = items.filter((it) => matchText(it, unit.lga_name));
    if (lgaMatches.length > 0) {
      const matchIds = new Set(lgaMatches.map((m) => m.id));
      return {
        localItems: lgaMatches,
        localLabel: unit.lga_name,
        sortedOthers: sortOthers(items.filter((it) => !matchIds.has(it.id))),
      };
    }

    // 3. State match
    const stateMatches = items.filter((it) => matchState(it, unit.state_code, unit.state_name));
    if (stateMatches.length > 0) {
      const matchIds = new Set(stateMatches.map((s) => s.id));
      return {
        localItems: stateMatches,
        localLabel: unit.state_name,
        sortedOthers: sortOthers(items.filter((it) => !matchIds.has(it.id))),
      };
    }

    // No local match
    return {
      localItems: [],
      localLabel: unit.ward_name || unit.lga_name || unit.state_name,
      sortedOthers: sortOthers(items),
    };
  }, [items, unit]);

  const visibleOthers = sortedOthers.slice(0, othersCount);

  return (
    <section className="stack stack-4" aria-label={t("home.facts")}>
      <div className="spread">
        <h2 className="title-2">{t("home.facts")}</h2>
        <span className="badge badge--burst"><span className="dot dot--live" />{t("unit.live")}</span>
      </div>

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
      ) : (
        <>
          {/* Top card: Local news hierarchy (Ward -> Town -> State) */}
          {localItems.length > 0 ? (
            <div className="stack stack-3">
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <Icon name="pin" size={16} />
                <span className="eyebrow" style={{ margin: 0 }}>
                  {t("home.localFactsFor", { location: localLabel ?? "" })}
                </span>
              </div>
              <div className="stack stack-3 stagger">
                {localItems.map((it, i) => (
                  <FactCheckCard key={it.id} item={it} index={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="card stack stack-2" style={{ padding: "16px 14px", borderStyle: "dashed" }}>
              <div className="row" style={{ gap: 8, alignItems: "center", color: "var(--text-2)" }}>
                <Icon name="pin" size={18} />
                <span className="headline" style={{ fontSize: 15 }}>
                  {unit ? t("home.noLocalFactsArea", { area: localLabel || unit.lga_name || unit.state_name }) : t("home.noLocalFacts")}
                </span>
              </div>
              <p className="caption" style={{ margin: 0 }}>
                {unit ? t("home.noLocalFactsHint") : t("home.chooseUnitHint")}
              </p>
            </div>
          )}

          {/* Section: National & other updates */}
          <div className="stack stack-3" style={{ marginTop: 8 }}>
            <h3 className="title-2" style={{ fontSize: 18, margin: 0 }}>{t("home.nationalFacts")}</h3>
            {visibleOthers.length === 0 ? (
              <StateCard icon="shield" title={t("common.empty")} body={t("home.factsEmpty")} />
            ) : (
              <div className="stack stack-3 stagger">
                {visibleOthers.map((it, i) => (
                  <FactCheckCard key={it.id} item={it} index={Math.min(i, 6)} />
                ))}
              </div>
            )}

            {sortedOthers.length > othersCount ? (
              <Button block variant="secondary" onClick={() => setOthersCount((c) => c + 5)}>
                {t("common.more")}
              </Button>
            ) : (
              q.hasNextPage && (
                <Button block loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                  {t("common.more")}
                </Button>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
