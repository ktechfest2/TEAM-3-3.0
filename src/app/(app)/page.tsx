"use client";
import { useAuth } from "@/api/service/auth/queries";
import { Checklist } from "@/components/home/Checklist";
import { Countdown } from "@/components/home/Countdown";
import { FactCheckFeed } from "@/components/home/FactCheckFeed";
import { UnitSummary } from "@/components/home/UnitSummary";
import { VoterGuide } from "@/components/home/VoterGuide";
import { useT } from "@/hooks/useT";
import Link from "next/link";
import { LanguagePicker } from "@/components/layout/LanguagePicker";

export default function HomePage() {
  const { t } = useT();
  const { isSignedIn, isLoading } = useAuth();
  return (
    <main className="page">
      <header className="spread">
        <span className="hero-brand"><span className="hero-mark"><i /></span>Votepaddie</span>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <LanguagePicker />
          {!isLoading && !isSignedIn && <Link href="/sign-in" className="btn btn-sm btn-secondary">{t("common.signIn")}</Link>}
        </div>
      </header>
      <h1 className="large-title">{t("home.hello")}.</h1>
      <Countdown />
      <UnitSummary />
      <Checklist />
      <VoterGuide />
      <FactCheckFeed />
    </main>
  );
}
