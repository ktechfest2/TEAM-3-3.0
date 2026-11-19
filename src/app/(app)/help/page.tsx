"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/api/service/auth/queries";
import { useMyRequests, useThreads, useWardRequests } from "@/api/service/help/queries";
import type { HelpKind } from "@/api/service/help/types";
import { NewRequestSheet } from "@/components/help/NewRequestSheet";
import { RequestCard } from "@/components/help/RequestCard";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { ErrorCard, StateCard } from "@/components/ui/StateCard";
import { SignInPrompt } from "@/components/ui/SignInPrompt";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";
import { timeAgo } from "@/lib/utils";

type Tab = "board" | "mine" | "chats";

export default function HelpPage() {
  const { t } = useT();
  const { user, isSignedIn, isLoading: authLoading } = useAuth();
  const { unit, code } = useMyUnit();
  const [tab, setTab] = useState<Tab>("board");
  const [filter, setFilter] = useState<HelpKind | "all">("all");
  const [composing, setComposing] = useState(false);

  const board = useWardRequests(unit?.ward_key, isSignedIn);
  const mine = useMyRequests(user?.id);
  const threads = useThreads(isSignedIn && tab === "chats");

  if (!authLoading && !isSignedIn) {
    return <main className="page"><PageHeader title={t("help.title")} subtitle={t("help.intro")} /><SignInPrompt /></main>;
  }

  return (
    <main className="page">
      <PageHeader title={t("help.title")} subtitle={t("help.intro")}
        right={unit ? <Button size="sm" variant="primary" icon={<Icon name="plus" size={18} />} onClick={() => setComposing(true)}>{t("help.new")}</Button> : undefined} />
      <Banner icon="shield" quiet>{t("help.safety")}</Banner>
      <Segmented<Tab> label={t("help.title")} value={tab} onChange={setTab}
        options={[{ value: "board", label: t("help.title") }, { value: "mine", label: t("help.mine") }, { value: "chats", label: t("help.inbox") }]} />

      {tab === "board" && (
        !code || !unit ? <StateCard icon="pin" title={t("help.setUnitFirst")} action={<Link href="/unit" className="btn btn-primary">{t("unit.choose")}</Link>} /> : (
          <div className="stack stack-3">
            <div className="row-wrap">
              {(["all", "need", "offer"] as const).map((k) => (
                <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{k === "all" ? t("common.all") : k === "need" ? t("help.need") : t("help.offer")}</button>
              ))}
            </div>
            {board.isLoading ? <><CardSkeleton lines={2} /><CardSkeleton lines={2} /></> :
              board.isError ? <ErrorCard message={t("common.error")} onRetry={() => board.refetch()} retryLabel={t("common.retry")} /> :
              (() => {
                const rows = (board.data ?? []).filter((r) => filter === "all" || r.kind === filter);
                return rows.length === 0 ? <StateCard icon="help" title={t("help.empty")} /> :
                  <div className="stack stack-3 stagger">{rows.map((r, i) => <RequestCard key={r.id} req={r} mine={r.author_id === user?.id} index={i} />)}</div>;
              })()}
          </div>
        )
      )}

      {tab === "mine" && (mine.isLoading ? <CardSkeleton lines={2} /> : (mine.data?.length ?? 0) === 0 ? <StateCard icon="help" title={t("common.empty")} /> :
        <div className="stack stack-3 stagger">{mine.data!.map((r, i) => <RequestCard key={r.id} req={r} mine index={i} />)}</div>)}

      {tab === "chats" && (threads.isLoading ? <ListSkeleton rows={3} /> : (threads.data?.length ?? 0) === 0 ? <StateCard icon="inbox" title={t("help.noChats")} /> :
        <div className="card card--flush list">
          {threads.data!.map((th) => (
            <Link key={th.id} href={`/chat/${th.id}`} className="list-row">
              <Icon name="help" size={22} />
              <div className="grow">
                <div className="headline" style={{ fontSize: 16 }}>{th.request?.body.slice(0, 48) ?? t("help.chat")}</div>
                <div className="caption">{timeAgo(th.created_at)}</div>
              </div>
              <Icon name="chevronRight" size={18} />
            </Link>
          ))}
        </div>)}

      {unit && <NewRequestSheet open={composing} onClose={() => setComposing(false)} unit={unit} />}
    </main>
  );
}
