"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/i18n";

const TABS: Array<{ href: string; icon: IconName; label: MessageKey; scan?: boolean }> = [
  { href: "/", icon: "home", label: "nav.home" },
  { href: "/unit", icon: "pin", label: "nav.unit" },
  { href: "/scan", icon: "scan", label: "nav.scan", scan: true },
  { href: "/help", icon: "help", label: "nav.help" },
  { href: "/me", icon: "user", label: "nav.me" },
];

export function TabBar() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`tab${tab.scan ? " tab--scan" : ""}`} aria-current={active ? "page" : undefined}>
            {tab.scan ? <span className="scan-orb"><Icon name={tab.icon} size={26} /></span> : <Icon name={tab.icon} />}
            <span>{t(tab.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
