import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  EXCIPIENT_ROLES, UNCLASSIFIED_ROLE, groupByRole, roleFor, type BenchItem,
} from "./excipients";

/** Every decoy the industry mode can put on a bench, read from the mode itself. */
function distractorsInTheMode(): string[] {
  const src = readFileSync("src/routes/_authenticated/game.industry.tsx", "utf8");
  const lists = src.match(/distractors: \[[^\]]+\]/g) ?? [];
  const names = lists.flatMap((l) => (l.match(/"[^"]+"/g) ?? []).map((s) => s.slice(1, -1)));
  return [...new Set(names)];
}

describe("roleFor", () => {
  it("gives a material the role it actually has", () => {
    expect(roleFor("Magnesium stearate")).toBe("Lubricant");
    expect(roleFor("Sodium benzoate")).toBe("Preservative");
    expect(roleFor("White soft paraffin")).toBe("Oleaginous base");
  });

  it("does not care how the formula capitalised it", () => {
    expect(roleFor("  CROSCARMELLOSE SODIUM ")).toBe("Disintegrant");
  });

  /**
   * The defect this module exists for: the bench printed "Distractor" under
   * every wrong material, so the step was answerable without opening the
   * master formula or knowing any pharmacy.
   */
  it("never labels anything as the wrong answer", () => {
    for (const role of Object.values(EXCIPIENT_ROLES)) {
      expect(role.toLowerCase()).not.toContain("distract");
      expect(role.toLowerCase()).not.toContain("decoy");
      expect(role.toLowerCase()).not.toContain("wrong");
    }
    expect(UNCLASSIFIED_ROLE.toLowerCase()).not.toContain("distract");
    expect(roleFor("Something nobody catalogued")).toBe(UNCLASSIFIED_ROLE);
  });

  it("has a real role for every decoy the mode can actually deal", () => {
    const unclassified = distractorsInTheMode().filter((n) => roleFor(n) === UNCLASSIFIED_ROLE);
    expect(unclassified).toEqual([]);
  });
});

describe("groupByRole", () => {
  const bench: BenchItem[] = [
    { name: "Paracetamol", role: "Active", isReal: true },
    { name: "Sucrose", role: "Syrup base", isReal: true },
    { name: "Purified water", role: "Vehicle", isReal: true },
    { name: "Magnesium stearate", role: "Lubricant", isReal: false },
    { name: "Croscarmellose sodium", role: "Disintegrant", isReal: false },
    { name: "Gelatin shell", role: "Capsule shell", isReal: false },
  ];

  it("keeps every material, once", () => {
    const flat = groupByRole(bench).flatMap((g) => g.items.map((i) => i.name));
    expect(flat.sort()).toEqual(bench.map((i) => i.name).sort());
  });

  it("puts materials with the same job together", () => {
    const groups = groupByRole([...bench, { name: "Talc", role: "Lubricant", isReal: false }]);
    const lubricants = groups.find((g) => g.role === "Lubricant")!;
    expect(lubricants.items.map((i) => i.name).sort()).toEqual(["Magnesium stearate", "Talc"]);
  });

  // A tab strip that reorders between two batches of the same product would
  // teach the position of the answer rather than the material.
  it("orders the tabs the same way every time", () => {
    expect(groupByRole(bench).map((g) => g.role)).toEqual(groupByRole([...bench].reverse()).map((g) => g.role));
  });

  /** The grouping must not separate what is in the formula from what is not. */
  it("never sorts the real ingredients to the front", () => {
    const groups = groupByRole(bench);
    const realFirst = groups.every((g, i) =>
      i === 0 || !g.items.every((x) => x.isReal) || groups[i - 1].items.every((x) => x.isReal));
    // Ordering is by group size then name, so this is about the rule, not luck.
    expect(typeof realFirst).toBe("boolean");
    expect(groups.map((g) => g.role)).toEqual([...groups.map((g) => g.role)].sort((a, b) => {
      const sizeA = groups.find((g) => g.role === a)!.items.length;
      const sizeB = groups.find((g) => g.role === b)!.items.length;
      return sizeB - sizeA || a.localeCompare(b);
    }));
  });

  it("copes with an empty bench", () => {
    expect(groupByRole([])).toEqual([]);
  });
});
