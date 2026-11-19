"use client";
import { useAuth } from "@/api/service/auth/queries";
import { useDisablePush, useEnablePush, usePushStatus } from "@/api/service/push/queries";
import { Toggle } from "@/components/ui/Toggle";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";
import { errMessage } from "@/lib/utils";
import { toast } from "@/stores/toast";

export function NotificationsRow() {
  const { t } = useT();
  const { isSignedIn } = useAuth();
  const { unit } = useMyUnit();
  const status = usePushStatus();
  const enable = useEnablePush();
  const disable = useDisablePush();
  const s = status.data;

  const toggle = (on: boolean) => {
    if (on) enable.mutate({ stateCode: unit?.state_code, wardKey: unit?.ward_key }, { onError: (e) => toast.error(errMessage(e, t("common.error"))) });
    else disable.mutate();
  };

  return (
    <div className="stack stack-2">
      <div className="setting">
        <div className="grow"><div className="headline" style={{ fontSize: 16 }}>{t("me.notifications")}</div>
          <div className="caption">{s === "unsupported" ? t("me.notifUnsupported") : s === "denied" ? t("me.notifDenied") : s === "on" ? t("me.notifOn") : t("me.notifOff")}</div></div>
        <Toggle label={t("me.notifications")} checked={s === "on"} onChange={toggle} />
      </div>
      {!isSignedIn && s !== "unsupported" && <p className="caption" style={{ padding: "0 16px 12px" }}>{t("common.signInToContinue")}</p>}
    </div>
  );
}
