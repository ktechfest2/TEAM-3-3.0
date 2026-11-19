import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { cn } from "@/lib/utils";

export function Banner({ icon = "alert", quiet, children, className }: { icon?: IconName; quiet?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("banner", quiet && "banner--quiet", className)} role="note">
      <Icon name={icon} size={20} />
      <div>{children}</div>
    </div>
  );
}
