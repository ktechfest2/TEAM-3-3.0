"use client";
import Link from "next/link";
import { useT } from "@/hooks/useT";
import { StateCard } from "./StateCard";

export function SignInPrompt({ body }: { body?: string }) {
  const { t } = useT();
  return (
    <StateCard
      icon="lock" title={t("common.signInToContinue")} body={body}
      action={<Link href="/sign-in" className="btn btn-primary">{t("common.signIn")}</Link>}
    />
  );
}
