/**
 * Pure logic for result sheets (INEC Form EC8A): OCR text parsing, deterministic arithmetic
 * checks, and canonicalisation. No AI is used in the checks - they are plain arithmetic.
 */
export const DEFAULT_PARTIES = ["APC", "PDP", "LP", "NNPP", "ADC", "APGA", "SDP", "YPP"] as const;

export interface SheetNumbers {
  registered: number | null;
  accredited: number | null;
  valid: number | null;
  rejected: number | null;
  total: number | null;          // total votes cast
  scores: Record<string, number | null>;
}

export const emptySheet = (parties: readonly string[] = DEFAULT_PARTIES): SheetNumbers => ({
  registered: null, accredited: null, valid: null, rejected: null, total: null,
  scores: Object.fromEntries(parties.map((p) => [p, null])),
});

const toInt = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s]/g, "");
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
};

const LABELS: Array<[keyof Omit<SheetNumbers, "scores">, RegExp]> = [
  ["registered", /registered\s*voters?[^0-9\n]{0,30}(\d[\d,\s]{0,9})/i],
  ["accredited", /accredited\s*(?:voters?)?[^0-9\n]{0,30}(\d[\d,\s]{0,9})/i],
  ["valid", /(?:total\s*)?valid\s*votes?[^0-9\n]{0,30}(\d[\d,\s]{0,9})/i],
  ["rejected", /rejected\s*(?:ballots?|votes?)[^0-9\n]{0,30}(\d[\d,\s]{0,9})/i],
  ["total", /total\s*votes?\s*cast[^0-9\n]{0,30}(\d[\d,\s]{0,9})/i],
];

/** Best-effort extraction from OCR text. Everything is a guess a human must confirm. */
export function parseSheetText(text: string, parties: readonly string[] = DEFAULT_PARTIES): { sheet: SheetNumbers; found: number } {
  const sheet = emptySheet(parties);
  let found = 0;
  for (const [key, re] of LABELS) {
    const n = toInt(re.exec(text)?.[1]);
    if (n != null) { (sheet[key] as number | null) = n; found++; }
  }
  for (const party of parties) {
    const re = new RegExp(`\\b${party}\\b[^0-9\\n]{0,40}(\\d[\\d,\\s]{0,9})`, "i");
    const n = toInt(re.exec(text)?.[1]);
    if (n != null) { sheet.scores[party] = n; found++; }
  }
  return { sheet, found };
}

export type CheckId = "non_negative" | "parties_sum_valid" | "valid_plus_rejected" | "total_le_accredited" | "accredited_le_registered";
export type CheckStatus = "pass" | "fail" | "unknown";
export interface CheckResult { id: CheckId; status: CheckStatus; detail?: Record<string, number> }

const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** Deterministic checks. "unknown" means we lack the numbers - never treated as a failure. */
export function runChecks(s: SheetNumbers): CheckResult[] {
  const out: CheckResult[] = [];
  const partyVals = Object.values(s.scores).filter(num);
  const all = [s.registered, s.accredited, s.valid, s.rejected, s.total, ...partyVals].filter(num);

  out.push({ id: "non_negative", status: all.length === 0 ? "unknown" : all.every((n) => Number.isInteger(n) && n >= 0) ? "pass" : "fail" });

  const partyTotal = partyVals.reduce((a, b) => a + b, 0);
  out.push(
    !num(s.valid) || partyVals.length === 0
      ? { id: "parties_sum_valid", status: "unknown" }
      : { id: "parties_sum_valid", status: partyTotal === s.valid ? "pass" : "fail", detail: { partyTotal, valid: s.valid } },
  );

  out.push(
    !num(s.valid) || !num(s.rejected) || !num(s.total)
      ? { id: "valid_plus_rejected", status: "unknown" }
      : { id: "valid_plus_rejected", status: s.valid + s.rejected === s.total ? "pass" : "fail", detail: { valid: s.valid, rejected: s.rejected, total: s.total } },
  );

  const cast = num(s.total) ? s.total : num(s.valid) && num(s.rejected) ? s.valid + s.rejected : num(s.valid) ? s.valid : null;
  out.push(
    !num(s.accredited) || cast == null
      ? { id: "total_le_accredited", status: "unknown" }
      : { id: "total_le_accredited", status: cast <= s.accredited ? "pass" : "fail", detail: { cast, accredited: s.accredited } },
  );

  out.push(
    !num(s.registered) || !num(s.accredited)
      ? { id: "accredited_le_registered", status: "unknown" }
      : { id: "accredited_le_registered", status: s.accredited <= s.registered ? "pass" : "fail", detail: { accredited: s.accredited, registered: s.registered } },
  );
  return out;
}

export const summarise = (checks: CheckResult[]): "all_clear" | "needs_review" | "incomplete" =>
  checks.some((c) => c.status === "fail") ? "needs_review" : checks.every((c) => c.status === "pass") ? "all_clear" : "incomplete";

/**
 * Canonical JSON of the confirmed numbers: only integers, no nulls, keys sorted.
 * Two people who read the same sheet the same way must produce byte-identical objects,
 * because pu_result_consensus() groups on exact jsonb equality.
 */
export function canonicalizeSheet(s: SheetNumbers): Record<string, unknown> {
  const scores: Record<string, number> = {};
  for (const k of Object.keys(s.scores).map((p) => p.trim().toUpperCase()).sort()) {
    const original = Object.keys(s.scores).find((p) => p.trim().toUpperCase() === k)!;
    const v = s.scores[original];
    if (num(v)) scores[k] = v;
  }
  const out: Record<string, unknown> = {};
  for (const key of ["accredited", "registered", "rejected", "total", "valid"] as const) {
    const v = s[key];
    if (num(v)) out[key] = v;
  }
  out.scores = scores;
  return out;
}

export const hasAnyNumbers = (s: SheetNumbers) =>
  [s.registered, s.accredited, s.valid, s.rejected, s.total, ...Object.values(s.scores)].some(num);
