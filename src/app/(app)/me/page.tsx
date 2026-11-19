"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth, useSignOut } from "@/api/service/auth/queries";
import { useUpdateProfile } from "@/api/service/profile/queries";
import { DeleteAccountSheet } from "@/components/me/DeleteAccountSheet";
import { NotificationsRow } from "@/components/me/NotificationsRow";
import { VoiceSettingsCard } from "@/components/me/VoiceSettingsCard";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { useT } from "@/hooks/useT";
import { LANGS, type Lang } from "@/i18n";
import { usePrefs, type ThemePref } from "@/stores/prefs";

const CREDITS = [
  "Next.js, React, TanStack Query, Zustand, Dexie, Serwist, Lenis, Tesseract.js (open source)",
  "Supabase (database, auth, realtime, storage, Edge Functions) · Resend (email) · Firebase Cloud Messaging (alerts) · Cloudflare Turnstile",
  "Groq (translation and speech-to-text) · Google Fact Check Tools API · fact-check sources: Dubawa, FactCheck Hub, Africa Check",
  "Built with AI coding assistance (Claude by Anthropic). Demo polling units are fictional.",
];

export default function MePage() {
  const { t } = useT();
  const { user, isSignedIn } = useAuth();
  const signOut = useSignOut();
  const update = useUpdateProfile();
  const { theme, setTheme, highContrast, setHighContrast, reduceMotion, setReduceMotion, lang, setLang } = usePrefs();
  const [deleting, setDeleting] = useState(false);

  const pickLang = (l: Lang) => { setLang(l); if (isSignedIn) update.mutate({ language: l }); };

  return (
    <main className="page">
      <PageHeader title={t("me.title")} />

      <section className="card stack stack-3">
        <div className="eyebrow">{t("me.account")}</div>
        {isSignedIn ? (
          <>
            <div className="headline" style={{ wordBreak: "break-all" }}>{user?.email}</div>
            <Button block loading={signOut.isPending} onClick={() => signOut.mutate()}>{t("common.signOut")}</Button>
          </>
        ) : <Link href="/sign-in" className="btn btn-primary btn-block">{t("common.signIn")}</Link>}
      </section>

      <section className="card stack stack-3">
        <div className="eyebrow">{t("me.language")}</div>
        <div className="row-wrap">{LANGS.map((l) => <button key={l.code} className="chip" aria-pressed={lang === l.code} onClick={() => pickLang(l.code)}>{l.label}</button>)}</div>
        {lang !== "en" && <p className="caption">{t("me.langNote")}</p>}
      </section>

      <VoiceSettingsCard />

      <section className="card card--flush">
        <div className="list">
          <div className="setting" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="eyebrow">{t("me.theme")}</div>
            <Segmented<ThemePref> label={t("me.theme")} value={theme} onChange={setTheme}
              options={[{ value: "dark", label: t("me.theme.dark") }, { value: "light", label: t("me.theme.light") }, { value: "system", label: t("me.theme.system") }]} />
          </div>
          <div className="setting"><span className="headline" style={{ fontSize: 16 }}>{t("me.contrast")}</span><Toggle label={t("me.contrast")} checked={highContrast} onChange={setHighContrast} /></div>
          <div className="setting"><span className="headline" style={{ fontSize: 16 }}>{t("me.motion")}</span><Toggle label={t("me.motion")} checked={reduceMotion} onChange={setReduceMotion} /></div>
          <NotificationsRow />
        </div>
      </section>

      <section className="stack stack-3">
        <h2 className="title-2">{t("me.limits")}</h2>
        <Banner icon="info" quiet>{t("me.limitsBody")}</Banner>
        <h2 className="title-2" style={{ marginTop: 8 }}>{t("me.credits")}</h2>
        {/* <ul className="stack stack-2">{CREDITS.map((c) => <li key={c} className="caption">{c}</li>)}</ul> */}
        <p className="caption">Votepaddie is an independent civic tool. It is not affiliated with INEC.</p>
      </section>

      {isSignedIn && <Button variant="danger" block onClick={() => setDeleting(true)}>{t("me.delete")}</Button>}
      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </main>
  );
}
