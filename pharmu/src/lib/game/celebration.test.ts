import { describe, expect, it } from "vitest";
import { celebrationTier } from "./celebration";

describe("celebrationTier", () => {
  it("celebrates a clean run hardest", () => {
    const tier = celebrationTier(0);
    expect(tier.key).toBe("flawless");
    expect(tier.confetti).toBeGreaterThan(0);
  });

  it("still celebrates a run with a slip or two", () => {
    expect(celebrationTier(1).key).toBe("strong");
    expect(celebrationTier(2).key).toBe("strong");
    expect(celebrationTier(2).confetti).toBeGreaterThan(0);
  });

  // The screen underneath the celebration is a list of what went wrong. Confetti
  // over that would be telling the learner two opposite things at once.
  it("drops the confetti once the case went badly", () => {
    for (const errors of [3, 5, 12]) {
      const tier = celebrationTier(errors);
      expect(tier.key).toBe("steady");
      expect(tier.confetti).toBe(0);
    }
  });

  it("still marks the case complete however badly it went", () => {
    // Completion is always acknowledged; only the fanfare is conditional.
    for (const errors of [0, 1, 4, 20]) {
      const tier = celebrationTier(errors);
      expect(tier.title.trim()).not.toBe("");
      expect(tier.blurb.trim()).not.toBe("");
    }
  });

  it("never celebrates harder as mistakes go up", () => {
    let previous = Infinity;
    for (let errors = 0; errors <= 10; errors++) {
      const confetti = celebrationTier(errors).confetti;
      expect(confetti).toBeLessThanOrEqual(previous);
      previous = confetti;
    }
  });

  it("treats a negative count as a clean run rather than breaking", () => {
    expect(celebrationTier(-1).key).toBe("flawless");
  });
});
