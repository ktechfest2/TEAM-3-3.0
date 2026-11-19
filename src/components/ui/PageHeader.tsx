import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="spread" style={{ alignItems: "flex-end" }}>
      <div className="stack stack-1 grow">
        <h1 className="large-title">{title}</h1>
        {subtitle && <p className="callout">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
