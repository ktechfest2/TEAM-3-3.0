"use client";
import { useEffect, useRef } from "react";

/** Six single-digit boxes. Supports paste, backspace, and the iOS/Android one-time-code autofill. */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, length = 6 }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean; invalid?: boolean; length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const set = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  };

  return (
    <div className="otp" role="group" aria-label="One-time code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          inputMode="numeric" pattern="[0-9]*" maxLength={length}   // maxLength=length lets a full autofill/paste land in one box
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoCapitalize="none" autoCorrect="off" enterKeyHint="done"
          aria-label={`Digit ${i + 1}`} aria-invalid={invalid || undefined} disabled={disabled}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) return set(v);               // paste / autofill
            set(value.slice(0, i) + v + value.slice(i + 1));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) { e.preventDefault(); set(value.slice(0, i - 1)); refs.current[i - 1]?.focus(); }
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
