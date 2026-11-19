"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/api/service/auth/queries";
import { useMessages, useSendMessage, useThread } from "@/api/service/help/queries";
import { Banner } from "@/components/ui/Banner";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorCard } from "@/components/ui/StateCard";
import { useT } from "@/hooks/useT";
import { errMessage } from "@/lib/utils";
import { toast } from "@/stores/toast";

export default function ChatPage() {
  const { t } = useT();
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const thread = useThread(threadId);
  const messages = useMessages(threadId);
  const send = useSendMessage(threadId);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.data?.length]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    send.mutate(body, { onError: (e) => { setText(body); toast.error(errMessage(e, t("common.error"))); } });
  };

  return (
    <div className="chat-shell">
      <header className="chat-head stack stack-2">
        <div className="row">
          <Link href="/help" aria-label={t("common.back")} className="btn btn-icon"><Icon name="chevronLeft" size={20} /></Link>
          <div className="grow">
            <div className="headline" style={{ fontSize: 16 }}>{t("help.chat")}</div>
            <div className="caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{thread.data?.request?.body ?? ""}</div>
          </div>
        </div>
        <Banner icon="shield" quiet>{t("help.safety")}</Banner>
      </header>

      <div className="chat-body bubble-list" data-lenis-prevent>
        {messages.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} w={i % 2 ? "55%" : "70%"} h={40} r={18} style={{ alignSelf: i % 2 ? "flex-end" : "flex-start" }} />) :
          messages.isError ? <ErrorCard message={t("common.error")} onRetry={() => messages.refetch()} retryLabel={t("common.retry")} /> :
          messages.data!.map((m) => (
            <div key={m.id} className={`bubble${m.sender_id === user?.id ? " bubble--me" : ""}`}>
              {m.body}
              <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))}
        <div ref={end} />
      </div>

      <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="input grow" value={text} maxLength={500} placeholder={t("help.typeMsg")} aria-label={t("help.typeMsg")} enterKeyHint="send" onChange={(e) => setText(e.target.value)} />
        <IconButton label={t("common.send")} type="submit" className="btn-icon" disabled={!text.trim() || send.isPending} style={{ background: "var(--burst)", color: "var(--burst-ink)" }}><Icon name="send" size={20} /></IconButton>
      </form>
    </div>
  );
}
