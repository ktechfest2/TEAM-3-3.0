"use client";
import type { CSSProperties } from "react";

export interface SegOption<T extends string> { value: T; label: string }

export function Segmented<T extends string>({ options, value, onChange, label }: { options: Array<SegOption<T>>; value: T; onChange: (v: T) => void; label: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="seg" role="tablist" aria-label={label} style={{ "--n": options.length, "--i": i } as CSSProperties}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
