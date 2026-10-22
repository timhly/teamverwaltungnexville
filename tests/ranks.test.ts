import { describe, it, expect } from "vitest";
import {
  EXTRA_NAMES,
  RANK_NAMES,
  sortRoles,
  snapshotPosition,
} from "../src/lib/ranks";
describe("Nexville rank order", () => {
  it("sorts the nine ranks in the exact requested order", () => {
    const shuffled = [...RANK_NAMES]
      .reverse()
      .map((name) => ({ name, kind: "rank" as const, sort_order: 500 }));
    expect(sortRoles(shuffled).map((r) => r.name)).toEqual([...RANK_NAMES]);
  });
  it("places the six optional extra roles after the ranks", () => {
    const items = [...EXTRA_NAMES, ...RANK_NAMES].map((name) => ({
      name,
      kind: EXTRA_NAMES.includes(name as (typeof EXTRA_NAMES)[number])
        ? ("extra" as const)
        : ("rank" as const),
      sort_order: 500,
    }));
    expect(sortRoles(items).map((r) => r.name)).toEqual([
      ...RANK_NAMES,
      ...EXTRA_NAMES,
    ]);
  });
  it("understands historical rank names in attendance snapshots", () => {
    expect(snapshotPosition(["Unternehmensverwaltung", "Sr. Moderation"])).toBe(
      4,
    );
    expect(snapshotPosition(["Fraktionsverwaltung", "Sr. Supporter"])).toBe(6);
    expect(snapshotPosition(["High Team"])).toBe(2);
    expect(snapshotPosition(["Supportleitung"])).toBe(1000);
  });
});
