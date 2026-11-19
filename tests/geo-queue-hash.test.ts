import { describe, it, expect } from "vitest";
import { distanceMeters, geofenceVerdict, GEOFENCE_M } from "../src/lib/geo.ts";
import { estimateAhead, waitBucket } from "../src/lib/queue.ts";
import { sha256Hex } from "../src/lib/hash.ts";
import { daysUntil, safeUrl, isEmail } from "../src/lib/utils.ts";

describe("geo", () => {
  it("measures ~111 km per degree of latitude", () => {
    const d = distanceMeters({ lat: 9, lng: 7 }, { lat: 10, lng: 7 });
    expect(Math.abs(d - 111195) < 200).toBe(true);
  });
  it("geofence verdicts", () => {
    const unit = { lat: 9.0397, lng: 7.4905 };
    expect(geofenceVerdict(unit, { lat: 9.0398, lng: 7.4906 })).toBe("inside");
    expect(geofenceVerdict(unit, { lat: 9.06, lng: 7.5 })).toBe("outside");
    expect(geofenceVerdict({ lat: null, lng: null }, { lat: 1, lng: 1 })).toBe("no-unit-coords");
    expect(geofenceVerdict(unit, null)).toBe("no-fix");
    expect(GEOFENCE_M).toBe(500);
  });
});

describe("queue position", () => {
  it("is zero for the first ticket", () => {
    expect(estimateAhead({ ticket: 1, waiting: 1, accredited: 0, voted: 0 })).toBe(0);
  });
  it("subtracts people who already moved on", () => {
    expect(estimateAhead({ ticket: 10, waiting: 6, accredited: 3, voted: 2 })).toBe(4);
  });
  it("never exceeds who is actually waiting", () => {
    expect(estimateAhead({ ticket: 50, waiting: 4, accredited: 0, voted: 0 })).toBe(3);
  });
  it("never goes negative", () => {
    expect(estimateAhead({ ticket: 2, waiting: 1, accredited: 9, voted: 9 })).toBe(0);
  });
  it("buckets", () => {
    expect(waitBucket(0)).toBe("next"); expect(waitBucket(3)).toBe("few");
    expect(waitBucket(10)).toBe("some"); expect(waitBucket(99)).toBe("many");
  });
});

describe("hash", () => {
  it("matches the known SHA-256 of 'abc'", async () => {
    const h = await sha256Hex(new Blob(["abc"]));
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("differs for different bytes", async () => {
    expect((await sha256Hex(new Blob(["a"]))) === (await sha256Hex(new Blob(["b"])))).toBe(false);
  });
});

describe("utils", () => {
  it("daysUntil", () => { expect(daysUntil("2027-01-16", new Date(2027, 0, 6))).toBe(10); });
  it("safeUrl blocks javascript:", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://dubawa.org/x")).toBe("https://dubawa.org/x");
  });
  it("isEmail", () => { expect(isEmail("a@b.co")).toBe(true); expect(isEmail("nope")).toBe(false); });
});
