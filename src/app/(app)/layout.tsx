import type { ReactNode } from "react";
import { TabBar } from "@/components/layout/TabBar";
import { OfflinePill } from "@/components/layout/OfflinePill";
import { SetupNotice } from "@/components/layout/SetupNotice";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <OfflinePill />
      <SetupNotice />
      {children}
      <TabBar />
    </div>
  );
}
