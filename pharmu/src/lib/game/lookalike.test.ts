import { describe, expect, it } from "vitest";
import {
  editDistance, findConfusablePairs, isConfusable, sharedPrefix, summarise,
  type BrandRow,
} from "./lookalike";

const row = (brand: string, drugId: string, generic = "g", drugClass = "c"): BrandRow =>
  ({ brand, drugId, generic, drugClass });

describe("editDistance", () => {
  it("counts the edits between two names", () => {
    expect(editDistance("Clopid", "Lopid")).toBe(1);
    expect(editDistance("Plavix", "Lasix")).toBe(2);
    expect(editDistance("Lasix", "Lasix")).toBe(0);
  });

  it("ignores case, because a shelf label does", () => {
    expect(editDistance("LASIX", "lasix")).toBe(0);
  });

  it("stops early rather than measuring a hopeless comparison", () => {
    expect(editDistance("Paracetamol", "Zzz", 2)).toBeGreaterThan(2);
  });
});

describe("sharedPrefix", () => {
  it("counts how far two names read the same", () => {
    expect(sharedPrefix("Clarinex", "Claritek")).toBe(5);
    expect(sharedPrefix("Lasix", "Plavix")).toBe(0);
  });
});

describe("isConfusable", () => {
  it("catches a one-letter difference between two different medicines", () => {
    expect(isConfusable(row("Clopid", "d1"), row("Lopid", "d2"))).toBe(true);
  });

  it("ignores two brands of the same medicine", () => {
    // Reaching for the wrong one of these is a stock question, not a safety one.
    expect(isConfusable(row("Panadol", "d1"), row("Panadel", "d1"))).toBe(false);
  });

  it("ignores short names, where almost everything looks like everything", () => {
    expect(isConfusable(row("Cal", "d1"), row("Col", "d2"))).toBe(false);
  });

  it("ignores the same name listed twice", () => {
    expect(isConfusable(row("Lasix", "d1"), row("lasix ", "d2"))).toBe(false);
  });

  // Two edits is only a warning when the names also start the same way, which
  // is what the eye and the shelf go by.
  it("wants two-edit pairs to open the same way", () => {
    expect(isConfusable(row("Clarinex", "d1"), row("Claritek", "d2"))).toBe(true);
    expect(isConfusable(row("Abcdef", "d1"), row("Xybdef", "d2"))).toBe(false);
  });

  it("does not pair names of very different length", () => {
    expect(isConfusable(row("Amoxil", "d1"), row("Amoxilclav500", "d2"))).toBe(false);
  });
});

describe("findConfusablePairs", () => {
  const catalogue = [
    row("Clopid", "d1", "Clopidogrel", "Antiplatelet"),
    row("Lopid", "d2", "Gemfibrozil", "Fibrate"),
    row("Lasix", "d3", "Furosemide", "Loop Diuretic"),
    row("Plavix", "d1", "Clopidogrel", "Antiplatelet"),
    row("Paracetamol", "d4", "Paracetamol", "Analgesic"),
  ];

  it("finds the pairs and nothing else", () => {
    const names = findConfusablePairs(catalogue).map((p) => [p.a.brand, p.b.brand].sort().join("/"));
    expect(names).toContain("Clopid/Lopid");
    expect(names.some((n) => n.includes("Paracetamol"))).toBe(false);
  });

  it("marks the pairs that cross a therapeutic class", () => {
    const pair = findConfusablePairs(catalogue).find((p) => p.a.drugId !== p.b.drugId)!;
    expect(pair.crossClass).toBe(true);
  });

  /** A cross-class pair one letter apart is the one worth teaching first. */
  it("puts the most dangerous pair first", () => {
    const pairs = findConfusablePairs(catalogue);
    expect(pairs[0].crossClass).toBe(true);
    for (let i = 1; i < pairs.length; i += 1) {
      if (pairs[i - 1].crossClass === pairs[i].crossClass) {
        expect(pairs[i - 1].distance).toBeLessThanOrEqual(pairs[i].distance);
      }
    }
  });

  it("orders the list the same way every time, so a review can be repeated", () => {
    expect(findConfusablePairs(catalogue)).toEqual(findConfusablePairs([...catalogue].reverse()));
  });

  it("lists a pair once, not twice", () => {
    const keys = findConfusablePairs(catalogue).map((p) => [p.a.brand, p.b.brand].sort().join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("copes with an empty or single-entry catalogue", () => {
    expect(findConfusablePairs([])).toEqual([]);
    expect(findConfusablePairs([row("Lasix", "d1")])).toEqual([]);
  });
});

describe("summarise", () => {
  it("counts what the opening panel claims", () => {
    const pairs = findConfusablePairs([
      row("Clopid", "d1", "Clopidogrel", "Antiplatelet"),
      row("Lopid", "d2", "Gemfibrozil", "Fibrate"),
    ]);
    const s = summarise(pairs, 1286);
    expect(s.brandCount).toBe(1286);
    expect(s.pairCount).toBe(1);
    expect(s.crossClassCount).toBe(1);
    expect(s.oneLetterCount).toBe(1);
  });
});

describe("duplicate listings", () => {
  // The catalogue holds 1,286 rows under 1,212 names: a brand can be listed
  // more than once, and without deduplication the same pair of names comes out
  // two or three times and lands twice in one drill.
  it("does not report a pair once per duplicate listing", () => {
    const pairs = findConfusablePairs([
      row("Clopid", "d1", "Clopidogrel", "Antiplatelet"),
      row("Clopid", "d9", "Clopidogrel", "Antiplatelet"),
      row("Lopid", "d2", "Gemfibrozil", "Fibrate"),
      row("Lopid", "d8", "Gemfibrozil", "Fibrate"),
    ]);
    expect(pairs).toHaveLength(1);
  });

  it("treats names differing only in punctuation as the same listing", () => {
    const pairs = findConfusablePairs([
      row("Anti Dandruff", "d1"),
      row("Anti-Dandruff", "d2"),
    ]);
    expect(pairs).toEqual([]);
  });
});
