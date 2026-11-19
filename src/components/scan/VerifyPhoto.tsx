"use client";
import { useRef, useState } from "react";
import { useVerifyHash } from "@/api/service/scanner/queries";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import { sha256Hex } from "@/lib/hash";
import { shortHash } from "@/lib/utils";
import { toast } from "@/stores/toast";

/** Hashes the file exactly as received (no re-encoding) and asks the ledger whether it has seen it. */
export function VerifyPhoto() {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const verify = useVerifyHash();
  const [sha, setSha] = useState<string | null>(null);

  const onFile = async (file: File) => {
    try {
      const h = await sha256Hex(file);
      setSha(h);
      verify.mutate(h, { onError: (e) => toast.error(e.message) });
    } catch { toast.error(t("common.error")); }
  };

  return (
    <div className="stack stack-4">
      <p className="callout">{t("scan.verifyIntro")}</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onFile(f); }} />
      <Button block icon={<Icon name="search" size={20} />} loading={verify.isPending} onClick={() => input.current?.click()}>{t("scan.verifyPick")}</Button>
      {sha && <div className="stack stack-1"><span className="eyebrow">SHA-256</span><span className="mono">{sha}</span></div>}
      {verify.isSuccess && (verify.data.length > 0 ? (
        <div className="card card--accent stack stack-3">
          <div className="row"><Icon name="shield" size={22} /><span className="headline">{t("scan.verifyFound")}</span></div>
          {verify.data.map((m) => (
            <div key={m.chain_hash} className="stack stack-1">
              <span className="caption">{m.pu_code} · {t("scan.serverTime")}: {new Date(m.created_at).toLocaleString()}</span>
              <span className="mono">{shortHash(m.chain_hash, 14)}</span>
            </div>
          ))}
        </div>
      ) : <Banner icon="info" quiet>{t("scan.verifyNone")}</Banner>)}
      <Banner icon="shield" quiet>{t("scan.limits")}</Banner>
    </div>
  );
}
