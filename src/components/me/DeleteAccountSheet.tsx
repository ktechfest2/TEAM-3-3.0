"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDeleteAccount } from "@/api/service/auth/queries";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useT } from "@/hooks/useT";
import { errMessage } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const del = useDeleteAccount();
  const [typed, setTyped] = useState("");

  return (
    <Sheet open={open} onClose={onClose} title={t("me.delete")}>
      <div className="stack stack-4" style={{ paddingBottom: 8 }}>
        <Banner>{t("me.deleteWarn")}</Banner>
        <div className="field">
          <label htmlFor="del">{t("me.deleteType")}</label>
          <input id="del" className="input" autoCapitalize="characters" autoCorrect="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <Button variant="danger" block disabled={typed !== "DELETE"} loading={del.isPending}
          onClick={() => del.mutate(undefined, { onSuccess: () => { onClose(); router.replace("/"); }, onError: (e) => toast.error(errMessage(e, t("common.error"))) })}>
          {t("me.delete")}
        </Button>
      </div>
    </Sheet>
  );
}
