import { describe, expect, it } from "vitest";
import { caseResultFrom, celebrationTier, isFailure, type CaseResult } from "./celebration";

const result = (over: Partial<CaseResult> = {}): CaseResult => ({
  errors: 0,
  earned: 60,
  hasBreakdown: true,
  correctDrugs: 1,
  wrongDrugs: 0,
  ...over,
});

describe("celebrationTier", () => {
  it("celebrates a clean, productive run hardest", () => {
    const tier = celebrationTier(result());
    expect(tier.key).toBe("flawless");
    expect(tier.confetti).toBeGreaterThan(0);
  });

  it("still celebrates a run with a slip or two", () => {
    expect(celebrationTier(result({ errors: 1 })).key).toBe("strong");
    expect(celebrationTier(result({ errors: 2 })).key).toBe("strong");
    expect(celebrationTier(result({ errors: 2 })).confetti).toBeGreaterThan(0);
  });

  // The screen underneath is a list of what went wrong. Confetti over that
  // would be telling the learner two opposite things at once.
  it("drops the confetti once the case went badly", () => {
    expect(celebrationTier(result({ errors: 3 })).key).toBe("steady");
    expect(celebrationTier(result({ errors: 3 })).confetti).toBe(0);
  });

  it("never celebrates harder as mistakes go up", () => {
    let previous = Infinity;
    for (let errors = 0; errors <= 10; errors++) {
      const confetti = celebrationTier(result({ errors })).confetti;
      expect(confetti).toBeLessThanOrEqual(previous);
      previous = confetti;
    }
  });

  it("names the outcome however the case went", () => {
    for (const over of [{}, { errors: 2 }, { errors: 3 }, { earned: 0 }]) {
      const tier = celebrationTier(result(over));
      expect(tier.title.trim()).not.toBe("");
      expect(tier.blurb.trim()).not.toBe("");
    }
  });
});

describe("isFailure", () => {
  /**
   * The case that exposed the original bug: a timed-out run scoring only the
   * difficulty base, every breakdown row at zero. No mistakes were *logged*, so
   * scoring on mistakes alone congratulated it as flawless.
   */
  it("fails a case that earned nothing at all", () => {
    const nothing = result({ errors: 0, earned: 0, correctDrugs: 0, wrongDrugs: 0 });
    expect(isFailure(nothing)).toBe(true);
    expect(celebrationTier(nothing).key).toBe("failed");
    expect(celebrationTier(nothing).confetti).toBe(0);
  });

  it("fails a case where no medicine was handled correctly", () => {
    expect(isFailure(result({ correctDrugs: 0, wrongDrugs: 2 }))).toBe(true);
  });

  it("fails a case with mistakes past recovery", () => {
    expect(isFailure(result({ errors: 4 }))).toBe(true);
    expect(isFailure(result({ errors: 9 }))).toBe(true);
  });

  // Not every mode reports a breakdown. Treating "none given" as "earned
  // nothing" would fail every hospital case outright.
  it("does not fail a mode that simply reports no breakdown", () => {
    const hospital = result({ earned: 0, hasBreakdown: false, correctDrugs: 2 });
    expect(isFailure(hospital)).toBe(false);
    expect(celebrationTier(hospital).key).toBe("flawless");
  });

  it("passes a productive case with a couple of slips", () => {
    expect(isFailure(result({ errors: 2, earned: 40 }))).toBe(false);
  });
});

describe("caseResultFrom", () => {
  it("counts only positive credit as earned", () => {
    const built = caseResultFrom(0, [{ delta: 20 }, { delta: -15 }, { delta: 25 }], []);
    expect(built.earned).toBe(45);
    expect(built.hasBreakdown).toBe(true);
  });

  it("reproduces the all-zero breakdown as a failure", () => {
    const built = caseResultFrom(0, [
      { delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 },
    ], []);
    expect(built.earned).toBe(0);
    expect(isFailure(built)).toBe(true);
  });

  it("separates correct from incorrect medicines", () => {
    const built = caseResultFrom(1, [], [{ correct: true }, { correct: false }, { correct: true }]);
    expect(built.correctDrugs).toBe(2);
    expect(built.wrongDrugs).toBe(1);
    expect(built.hasBreakdown).toBe(false);
  });

  it("treats a case with no data at all as not a failure", () => {
    // Nothing to judge on: better to say nothing than to accuse.
    expect(isFailure(caseResultFrom(0, [], []))).toBe(false);
  });
});
