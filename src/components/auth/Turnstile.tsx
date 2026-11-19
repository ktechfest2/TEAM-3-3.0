"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/lib/env";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function useTurnstile() {
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const enabled = Boolean(env.turnstileSiteKey);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let scriptEl: HTMLScriptElement | null = null;

    const mount = () => {
      if (cancelled || !el.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(el.current, {
        sitekey: env.turnstileSiteKey,
        theme: "auto",
        appearance: "interaction-only",
        callback: (t: string) => setToken(t),
        "expired-callback": () => setToken(null),
        "error-callback": () => setToken(null),
      });
    };

    if (window.turnstile) {
      mount();
    } else {
      scriptEl = document.querySelector<HTMLScriptElement>(
        `script[src^="https://challenges.cloudflare.com/turnstile"]`
      );
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.src = SRC;
        scriptEl.async = true;
        scriptEl.defer = true;
        document.head.appendChild(scriptEl);
      }
      scriptEl.addEventListener("load", mount);
    }

    return () => {
      cancelled = true;
      if (scriptEl) scriptEl.removeEventListener("load", mount);
      if (widget.current && window.turnstile) {
        window.turnstile.remove(widget.current);
      }
      widget.current = null;
    };
  }, [enabled]);

  const reset = useCallback(() => {
    setToken(null);
    if (widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
    }
  }, []);

  const Widget = useMemo(() => <div ref={el} aria-hidden={!enabled} />, [enabled]);

  return { token, reset, enabled, Widget };
}
