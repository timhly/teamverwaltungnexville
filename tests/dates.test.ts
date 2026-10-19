import { describe, it, expect } from "vitest";
import {
  berlinDay,
  berlinToISO,
  isoToBerlin,
  warningActive,
} from "../src/lib/utils";
describe("Europe/Berlin date rules", () => {
  it("keeps expiry active until the end of the Berlin calendar day", () => {
    const w = {
      revoked: false,
      starts_on: "2026-10-01",
      expires_on: "2026-10-19",
    };
    expect(warningActive(w, new Date("2026-10-19T21:59:59Z"))).toBe(true);
    expect(warningActive(w, new Date("2026-10-19T22:00:00Z"))).toBe(false);
  });
  it("uses Berlin instead of the device day at midnight", () => {
    expect(berlinDay(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
  });
  it("handles summer and winter appointment times explicitly", () => {
    expect(berlinToISO("2026-07-10T20:00")).toBe("2026-07-10T18:00:00.000Z");
    expect(berlinToISO("2026-12-10T20:00")).toBe("2026-12-10T19:00:00.000Z");
    expect(isoToBerlin("2026-12-10T19:00:00Z")).toBe("2026-12-10T20:00");
  });
  it("rejects nonexistent and ambiguous clock-change times", () => {
    expect(() => berlinToISO("2026-03-29T02:30")).toThrow("Zeitumstellung");
    expect(() => berlinToISO("2026-10-25T02:30")).toThrow("Zeitumstellung");
  });
  it("never treats revoked or future warnings as active", () => {
    expect(
      warningActive({
        revoked: true,
        starts_on: "2020-01-01",
        expires_on: null,
      }),
    ).toBe(false);
    expect(
      warningActive({
        revoked: false,
        starts_on: "2099-01-01",
        expires_on: null,
      }),
    ).toBe(false);
  });
});
