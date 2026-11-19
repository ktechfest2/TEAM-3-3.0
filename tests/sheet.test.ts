import { describe, it, expect } from "vitest";
import { parseSheetText, runChecks, canonicalizeSheet, emptySheet, summarise } from "../src/lib/sheet.ts";

describe("parseSheetText", () => {
  const text = `FORM EC8A
Number of Registered Voters: 1,250
Number of Accredited Voters 410
APC ... 180
PDP: 150
LP 60
Total Valid Votes 390
Rejected Ballots 12
Total Votes Cast 402`;
  it("extracts labelled totals and party scores", () => {
    const { sheet, found } = parseSheetText(text);
    expect(sheet.registered).toBe(1250);
    expect(sheet.accredited).toBe(410);
    expect(sheet.valid).toBe(390);
    expect(sheet.rejected).toBe(12);
    expect(sheet.total).toBe(402);
    expect(sheet.scores.APC).toBe(180);
    expect(sheet.scores.PDP).toBe(150);
    expect(sheet.scores.LP).toBe(60);
    expect(found).toBe(8);
  });
  it("returns nothing for garbage", () => {
    expect(parseSheetText("lorem ipsum").found).toBe(0);
  });
});

describe("runChecks", () => {
  const good = () => {
    const s = emptySheet(["APC", "PDP"]);
    Object.assign(s, { registered: 1000, accredited: 400, valid: 390, rejected: 10, total: 400 });
    s.scores.APC = 200; s.scores.PDP = 190;
    return s;
  };
  it("passes a consistent sheet", () => {
    const c = runChecks(good());
    expect(c.every((x) => x.status === "pass")).toBe(true);
    expect(summarise(c)).toBe("all_clear");
  });
  it("flags party totals that do not add up", () => {
    const s = good(); s.scores.PDP = 250;
    const c = runChecks(s).find((x) => x.id === "parties_sum_valid")!;
    expect(c.status).toBe("fail");
    expect(c.detail).toEqual({ partyTotal: 450, valid: 390 });
  });
  it("flags votes above accredited voters", () => {
    const s = good(); s.accredited = 300;
    expect(runChecks(s).find((x) => x.id === "total_le_accredited")!.status).toBe("fail");
    expect(summarise(runChecks(s))).toBe("needs_review");
  });
  it("treats missing numbers as unknown, not failure", () => {
    const c = runChecks(emptySheet());
    expect(c.every((x) => x.status === "unknown")).toBe(true);
    expect(summarise(c)).toBe("incomplete");
  });
  it("flags negatives", () => {
    const s = good(); s.rejected = -1;
    expect(runChecks(s).find((x) => x.id === "non_negative")!.status).toBe("fail");
  });
});

describe("canonicalizeSheet", () => {
  it("drops nulls, uppercases and sorts parties", () => {
    const s = emptySheet(["pdp", "APC", "LP"]);
    s.accredited = 5; s.scores.pdp = 2; s.scores.APC = 3;
    expect(JSON.stringify(canonicalizeSheet(s))).toBe('{"accredited":5,"scores":{"APC":3,"PDP":2}}');
  });
});
