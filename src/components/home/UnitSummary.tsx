"use client";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Icon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMyUnit } from "@/hooks/useMyUnit";
import { useT } from "@/hooks/useT";

export function UnitSummary() {
  const { t } = useT();
  const { code, unit, isLoading } = useMyUnit();

  if (isLoading && code) return <div className="card row"><Skeleton w={44} h={44} r="50%" /><div className="grow stack stack-2"><Skeleton w="65%" h={16} /><Skeleton w="40%" h={12} /></div></div>;

  if (!code || !unit) {
    return (
      <Link href="/unit" className="card row" style={{ gap: 14 }}>
        <Icon name="pin" size={26} />
        <div className="grow"><div className="headline">{t("home.yourUnit")}</div><div className="callout">{t("unit.none")}</div></div>
        <Icon name="chevronRight" size={20} />
      </Link>
    );
  }
  return (
    <div className="stack stack-3">
      <Link href="/unit" className="card row" style={{ gap: 14 }}>
        <Icon name="pin" size={26} />
        <div className="grow">
          <div className="eyebrow">{t("home.yourUnit")}</div>
          <div className="headline">{unit.name}</div>
          <div className="caption">{unit.ward_name} · {unit.lga_name}</div>
        </div>
        <Icon name="chevronRight" size={20} />
      </Link>
      <Banner icon="info" quiet>
        {t("home.unitMoved")}{" "}
        <a
          href="https://cvr.inecnigeria.org/pu"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}
        >
          {t("common.inecPortal")}&nbsp;<Icon name="external" size={13} />
        </a>.
      </Banner>
    </div>
  );
}
