
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/api/service/auth/queries";
import {
  useDisablePush,
  useEnablePush,
  usePushStatus,
} from "@/api/service/push/queries";
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

  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const busy = enable.isPending || disable.isPending;
  const displayOn = optimistic !== null ? optimistic : s === "on";

  // Clear optimistic state only after the server confirms the change.
  useEffect(() => {
    if (optimistic === null || status.isFetching) return;

    if (
      (optimistic && s === "on") ||
      (!optimistic && s === "off")
    ) {
      setOptimistic(null);
    }
  }, [optimistic, s, status.isFetching]);

  const toggle = (on: boolean) => {
    if (busy || s === "unsupported" || s === "denied") return;

    setOptimistic(on);

    const options = {
      onError: (e: unknown) => {
        setOptimistic(null);
        toast.error(errMessage(e, t("common.error")));
      },
    };

    if (on) {
      enable.mutate(
        {
          stateCode: unit?.state_code,
          wardKey: unit?.ward_key,
        },
        options
      );
    } else {
      disable.mutate(undefined, options);
    }
  };

  const caption =
    s === "unsupported"
      ? t("me.notifUnsupported")
      : s === "denied"
        ? t("me.notifDenied")
        : displayOn
          ? t("me.notifOn")
          : t("me.notifOff");

  return (
    <div className="stack stack-2">
      <div className="setting">
        <div className="grow">
          <div className="headline" style={{ fontSize: 16 }}>
            {t("me.notifications")}
          </div>

          <div className="caption">{caption}</div>
        </div>

        <Toggle
          label={t("me.notifications")}
          checked={displayOn}
          onChange={toggle}
          disabled={
            busy ||
            s === "unsupported" ||
            s === "denied"
          }
        />
      </div>

      {!isSignedIn && s !== "unsupported" && (
        <p className="caption" style={{ padding: "0 16px 12px" }}>
          {t("common.signInToContinue")}
        </p>
      )}
    </div>
  );
}
