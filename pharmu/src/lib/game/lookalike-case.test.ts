import { describe, expect, it } from "vitest";
import { buildLookalikeDrill, drillShape, explainWrongPack } from "./lookalike-case";
import { BRANDS_SCANNED, LOOKALIKE_PAIRS } from "./lookalike-pairs";
import { editDistance } from "./lookalike";
import type { Difficulty } from "./shared";

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

describe("the generated pair list", () => {
  it("found something worth teaching", () => {
    expect(LOOKALIKE_PAIRS.length).toBeGreaterThan(20);
    expect(BRANDS_SCANNED).toBeGreaterThan(1000);
  });

  it("is mostly the dangerous kind, across therapeutic classes", () => {
    const cross = LOOKALIKE_PAIRS.filter((p) => p.crossClass).length;
    expect(cross / LOOKALIKE_PAIRS.length).toBeGreaterThan(0.8);
  });

  it("never pairs a name with itself", () => {
    for (const p of LOOKALIKE_PAIRS) expect(p.a.toLowerCase()).not.toBe(p.b.toLowerCase());
  });

  it("lists each pair once", () => {
    const keys = LOOKALIKE_PAIRS.map((p) => [p.a, p.b].sort().join("|").toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names a real medicine on both sides", () => {
    for (const p of LOOKALIKE_PAIRS) {
      expect(p.aGeneric.length).toBeGreaterThan(2);
      expect(p.bGeneric.length).toBeGreaterThan(2);
    }
  });
});

describe("buildLookalikeDrill", () => {
  it("asks more of Expert than of Trainee", () => {
    expect(drillShape("hard").questions).toBeGreaterThan(drillShape("easy").questions);
    expect(drillShape("hard").shelfSize).toBeGreaterThan(drillShape("easy").shelfSize);
  });

  it("builds a full run at every level", () => {
    for (const level of LEVELS) {
      const drill = buildLookalikeDrill("seed", level);
      expect(drill).toHaveLength(drillShape(level).questions);
      for (const q of drill) expect(q.shelf).toHaveLength(drillShape(level).shelfSize);
    }
  });

  it("puts exactly one right pack on the shelf", () => {
    for (const level of LEVELS) {
      for (const q of buildLookalikeDrill("seed", level)) {
        expect(q.shelf.filter((p) => p.correct)).toHaveLength(1);
        expect(q.shelf.find((p) => p.correct)!.brand).toBe(q.prescribed);
      }
    }
  });

  it("always puts the look-alike on the shelf beside it", () => {
    for (const q of buildLookalikeDrill("seed", "hard")) {
      expect(q.shelf.map((p) => p.brand)).toContain(q.decoy);
    }
  });

  /**
   * A filler close to either name would make the shelf two look-alikes and a
   * third, and a wrong answer would stop meaning what the feedback says.
   */
  it("does not slip a second look-alike onto the shelf as filler", () => {
    for (let i = 0; i < 30; i += 1) {
      for (const q of buildLookalikeDrill(`s${i}`, "hard")) {
        for (const pack of q.shelf) {
          if (pack.brand === q.prescribed || pack.brand === q.decoy) continue;
          expect(editDistance(pack.brand, q.prescribed)).toBeGreaterThan(3);
          expect(editDistance(pack.brand, q.decoy)).toBeGreaterThan(3);
        }
      }
    }
  });

  it("never lists the same pack twice on one shelf", () => {
    for (let i = 0; i < 30; i += 1) {
      for (const q of buildLookalikeDrill(`s${i}`, "hard")) {
        const names = q.shelf.map((p) => p.brand);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  // Otherwise a learner answers by remembering which name came first.
  it("prescribes either side of a pair, not always the same one", () => {
    const prescribedFirst = new Set<boolean>();
    for (let i = 0; i < 40; i += 1) {
      for (const q of buildLookalikeDrill(`s${i}`, "hard")) prescribedFirst.add(q.prescribed === q.pair.a);
    }
    expect(prescribedFirst.size).toBe(2);
  });

  it("does not repeat a pair within one run", () => {
    for (let i = 0; i < 30; i += 1) {
      const keys = buildLookalikeDrill(`s${i}`, "hard").map((q) => `${q.pair.a}|${q.pair.b}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("gives the same seed the same drill, and different seeds different ones", () => {
    expect(buildLookalikeDrill("same", "medium")).toEqual(buildLookalikeDrill("same", "medium"));
    const runs = new Set(Array.from({ length: 30 }, (_, i) =>
      buildLookalikeDrill(`r${i}`, "medium").map((q) => q.prescribed).join("|")));
    expect(runs.size).toBeGreaterThan(25);
  });

  it("has nothing to build from an empty list rather than throwing", () => {
    expect(buildLookalikeDrill("seed", "medium", [])).toEqual([]);
  });
});

describe("explainWrongPack", () => {
  const q = buildLookalikeDrill("seed", "medium")[0];

  it("names both medicines, so the mistake is concrete", () => {
    const wrong = q.shelf.find((p) => p.brand === q.decoy)!;
    const { whyWrong } = explainWrongPack(q, wrong);
    expect(whyWrong).toContain(q.prescribed);
    expect(whyWrong).toContain(q.prescribedGeneric);
    expect(whyWrong).toContain(wrong.brand);
    expect(whyWrong).toContain(wrong.generic);
  });

  it("says the check to make, not just that it was wrong", () => {
    const wrong = q.shelf.find((p) => !p.correct)!;
    expect(explainWrongPack(q, wrong).whatToKnow.toLowerCase()).toContain("generic");
  });

  // No dose is invented anywhere: the whole task is reading accuracy.
  it("quotes no dose, because none was invented", () => {
    for (const level of LEVELS) {
      for (const question of buildLookalikeDrill("seed", level)) {
        const wrong = question.shelf.find((p) => !p.correct)!;
        const text = JSON.stringify(explainWrongPack(question, wrong)) + JSON.stringify(question.shelf);
        expect(text).not.toMatch(/\d+\s?(mg|mcg|ml|g)\b/i);
      }
    }
  });
});
