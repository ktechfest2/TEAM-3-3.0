/** Compact view of a confirmed_json object: party scores plus the headline totals. */
export function ScoreSummary({ scores }: { scores: Record<string, unknown> | null }) {
  if (!scores) return <span className="caption">Photo only (numbers not entered)</span>;
  const parties = (scores.scores ?? {}) as Record<string, number>;
  const totals = (["registered", "accredited", "valid", "rejected", "total"] as const).filter((k) => typeof scores[k] === "number");
  return (
    <div className="stack stack-2">
      <div className="row-wrap">{Object.entries(parties).map(([p, v]) => <span key={p} className="badge num">{p} {v}</span>)}</div>
      <div className="caption num">{totals.map((k) => `${k} ${scores[k] as number}`).join(" · ")}</div>
    </div>
  );
}
