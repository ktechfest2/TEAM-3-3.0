"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSendOtp, useVerifyOtp, useAuth } from "@/api/service/auth/queries";
import { useAcceptTerms } from "@/api/service/profile/queries";
import { Banner } from "@/components/ui/Banner";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { OtpInput } from "@/components/ui/OtpInput";
import { useTurnstile } from "@/components/auth/Turnstile";
import { useT } from "@/hooks/useT";
import { isEmail } from "@/lib/utils";
import { toast } from "@/stores/toast";

const RESEND_SECONDS = 60;

export default function SignInPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const { isSignedIn } = useAuth();
  const send = useSendOtp();
  const verify = useVerifyOtp();
  const accept = useAcceptTerms();
  const ts = useTurnstile();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (isSignedIn) router.replace("/"); }, [isSignedIn, router]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const emailOk = isEmail(email);
  const captchaReady = !ts.enabled || Boolean(ts.token);

  const sendCode = useCallback(async () => {
    try {
      await send.mutateAsync({ email, captchaToken: ts.token ?? undefined });
      setStep("code"); setCode(""); setCodeError(false); setCooldown(RESEND_SECONDS);
    } catch (e) { toast.error(e instanceof Error ? e.message : t("common.error")); }
    finally { ts.reset(); }   // tokens are single-use
  }, [send, email, ts, t]);

  const verifyCode = useCallback(async (value: string) => {
    setCodeError(false);
    try {
      const session = await verify.mutateAsync({ email, token: value });
      if (session) await accept.mutateAsync({ userId: session.user.id, language: lang }).catch(() => {});
      router.replace("/");
    } catch { setCodeError(true); setCode(""); toast.error(t("auth.badCode")); }
  }, [verify, accept, email, lang, router, t]);

  return (
    <main className="page page--bare" style={{ minHeight: "100dvh", justifyContent: "center" }}>
      <div className="stack stack-5">
        <div className="stack stack-3">
          <span className="hero-brand"><span className="hero-mark"><i /></span>Votepaddie</span>
          <h1 className="large-title">{t("auth.title")}</h1>
          <p className="callout">{t("auth.subtitle")}</p>
        </div>

        {step === "email" ? (
          <form className="stack stack-4" onSubmit={(e) => { e.preventDefault(); if (emailOk && consent && captchaReady) void sendCode(); }}>
            <div className="field">
              <label htmlFor="email">{t("auth.email")}</label>
              <input id="email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off"
                spellCheck={false} enterKeyHint="send" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                aria-invalid={email.length > 4 && !emailOk ? true : undefined} />
            </div>
            <label className="checkbox callout">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{t("auth.consent")}</span>
            </label>
            <Button type="submit" variant="primary" block loading={send.isPending} disabled={!emailOk || !consent || !captchaReady}>
              {!captchaReady && ts.enabled ? t("auth.captchaWait") : t("auth.sendCode")}
            </Button>
            <Banner icon="shield" quiet>{t("auth.why")}</Banner>
            {ts.Widget}
          </form>
        ) : (
          <div className="stack stack-4">
            <div className="row">
              <IconButton label={t("common.back")} onClick={() => { setStep("email"); setCode(""); }}><Icon name="chevronLeft" size={20} /></IconButton>
              <p className="callout grow">{t("auth.codeSent", { email })}</p>
            </div>
            <OtpInput value={code} onChange={setCode} onComplete={verifyCode} invalid={codeError} disabled={verify.isPending} />
            <Button variant="primary" block loading={verify.isPending} disabled={code.length < 6} onClick={() => void verifyCode(code)}>{t("auth.verify")}</Button>
            <Button variant="ghost" block disabled={cooldown > 0} loading={send.isPending} onClick={() => { setStep("email"); }}>
              {cooldown > 0 ? t("auth.resendIn", { n: cooldown }) : t("auth.resend")}
            </Button>
          </div>
        )}

        <Button variant="ghost" block onClick={() => router.push("/")}>{t("common.guest")}</Button>
      </div>
    </main>
  );
}
