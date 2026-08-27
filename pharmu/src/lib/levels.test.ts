import { describe, expect, it } from "vitest";
import { TIERS, nextTier, tierFor, xpProgress } from "./levels";
import { CPD_MILESTONES, cpdHoursFromCases, nextCpdMilestone } from "./cpd";

describe("tierFor", () => {
  it("places xp in the right tier at and around each boundary", () => {
    for (const tier of TIERS) {
      expect(tierFor(tier.min).level).toBe(tier.level);
      if (Number.isFinite(tier.max)) {
        expect(tierFor(tier.max).level).toBe(tier.level);
        expect(tierFor(tier.max + 1).level).toBe(tier.level + 1);
      }
    }
  });

  it("leaves no gaps between tiers", () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].min).toBe(TIERS[i - 1].max + 1);
    }
  });

  it("falls back to the first tier for nonsense input", () => {
    expect(tierFor(-100).level).toBe(1);
  });

  it("keeps the top tier open-ended", () => {
    expect(tierFor(10_000_000).level).toBe(TIERS[TIERS.length - 1].level);
  });
});

describe("nextTier", () => {
  it("points at the following tier", () => {
    expect(nextTier(0)?.level).toBe(2);
  });

  it("returns null at the top", () => {
    expect(nextTier(TIERS[TIERS.length - 1].min)).toBeNull();
  });
});

describe("xpProgress", () => {
  it("reports 0% at the start of a tier and approaches 100% at its end", () => {
    expect(xpProgress(TIERS[1].min).pct).toBe(0);
    expect(xpProgress(TIERS[1].max).pct).toBeGreaterThan(99);
  });

  it("never exceeds 100%", () => {
    for (const xp of [0, 499, 500, 2999, 8000, 999_999]) {
      expect(xpProgress(xp).pct).toBeLessThanOrEqual(100);
      expect(xpProgress(xp).pct).toBeGreaterThanOrEqual(0);
    }
  });

  it("shows a full bar with no next tier at the top", () => {
    const top = xpProgress(TIERS[TIERS.length - 1].min + 1);
    expect(top.pct).toBe(100);
    expect(top.next).toBeNull();
  });
});

describe("cpd hours", () => {
  it("awards one hour per ten completed cases, rounded down", () => {
    expect(cpdHoursFromCases(0)).toBe(0);
    expect(cpdHoursFromCases(9)).toBe(0);
    expect(cpdHoursFromCases(10)).toBe(1);
    expect(cpdHoursFromCases(19)).toBe(1);
    expect(cpdHoursFromCases(250)).toBe(25);
  });

  it("never awards hours for a negative case count", () => {
    expect(cpdHoursFromCases(0)).toBe(0);
  });

  it("finds the next milestone strictly above the current hours", () => {
    expect(nextCpdMilestone(0)).toBe(CPD_MILESTONES[0]);
    expect(nextCpdMilestone(10)).toBe(25);
    expect(nextCpdMilestone(CPD_MILESTONES[CPD_MILESTONES.length - 1])).toBeNull();
  });
});
