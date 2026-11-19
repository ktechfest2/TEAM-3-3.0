"use client";
import { useOnline } from "@/hooks/useOnline";
import { useT } from "@/hooks/useT";

export function OfflinePill() {
  const online = useOnline();
  const { t } = useT();
  if (online) return null;
  return <div className="offline-pill" role="status"><span className="dot" />{t("common.offline")}</div>;
}
