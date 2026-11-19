"use client";
import { useRouter } from "next/navigation";
import type { FactCheckView } from "@/api/service/fact-checks/types";
import { useRequestTranslation } from "@/api/service/fact-checks/queries";
import { useAuth } from "@/api/service/auth/queries";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useSpeak } from "@/hooks/useVoice";
import { useT } from "@/hooks/useT";
import { safeUrl, timeAgo, stagger } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function FactCheckCard({ item, index }: { item: FactCheckView; index: number }) {
  const { t, lang } = useT();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const speak = useSpeak();
  const translate = useRequestTranslation();
  const link = safeUrl(item.url);
  const needsTranslation = lang !== "en" && !item.translated;

  const doTranslate = () => {
    if (!isSignedIn) return router.push("/sign-in");
    translate.mutate({ id: item.id, lang }, { onError: (e) => toast.error(e.message) });
  };

  return (
    <article className="card stack stack-3" style={stagger(index)}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <span className="badge">{item.source_name}</span>
        {item.rating && <span className="badge badge--burst">{item.rating}</span>}
        {item.published_at && <span className="caption">{timeAgo(item.published_at)}</span>}
      </div>
      <h3 className="headline" style={{ fontSize: 18, lineHeight: 1.28 }}>{item.shownTitle}</h3>
      {item.shownSummary && <p className="callout">{item.shownSummary}</p>}
      {item.translated && <p className="caption">{t("home.machineTranslated")}</p>}
      <div className="row-wrap">
        <Button size="sm" icon={<Icon name="speaker" size={18} />} onClick={() => speak(`${item.shownTitle}. ${item.shownSummary ?? ""}`)}>{t("home.listen")}</Button>
        {needsTranslation && <Button size="sm" loading={translate.isPending} onClick={doTranslate}>{translate.isPending ? t("home.translating") : t("home.translate")}</Button>}
        {link && <a className="btn btn-sm btn-ghost" href={link} target="_blank" rel="noopener noreferrer">{t("home.readMore")}<Icon name="external" size={16} /></a>}
      </div>
    </article>
  );
}
