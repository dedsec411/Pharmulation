import { describe, expect, it } from "vitest";
import { weekScore, type WeekScoreInput } from "./score";
import { RUPEE } from "./economics";

const week = (over: Partial<WeekScoreInput> = {}): WeekScoreInput => ({
  serviceLevel: 100,
  grossMarginPercent: 20,
  revenue: 100_000 * RUPEE,
  wastage: 0,
  fines: 0,
  traded: true,
  ...over,
});

describe("scoring a week", () => {
  it("pays a perfect week the full amount", () => {
    expect(weekScore(week()).score).toBe(200);
  });

  // Serving patients is the job, so it carries more than anything else.
  it("weighs patients served above everything else", () => {
    const noService = weekScore(week({ serviceLevel: 0 })).score;
    const noMargin = weekScore(week({ grossMarginPercent: 0 })).score;
    expect(noService).toBeLessThan(noMargin);
  });

  it("scales with how much of the demand was met", () => {
    expect(weekScore(week({ serviceLevel: 50 })).score).toBe(140);
  });

  // MRP is fixed by DRAP, so margin is earned at the buying end or not at all.
  it("rewards margin up to what a pharmacy here would be content with", () => {
    expect(weekScore(week({ grossMarginPercent: 10 })).score).toBe(160);
    expect(weekScore(week({ grossMarginPercent: 40 })).score)
      .toBe(weekScore(week({ grossMarginPercent: 20 })).score);
  });

  it("gives nothing for a negative margin rather than taking points away twice", () => {
    const score = weekScore(week({ grossMarginPercent: -30 })).score;
    expect(score).toBe(120);
  });
});

describe("what a week loses", () => {
  it("charges for stock that died on the shelf", () => {
    const out = weekScore(week({ wastage: 5_000 * RUPEE }));
    expect(out.score).toBe(170);
    expect(out.parts.find((p) => p.label === "Stock lost")?.points).toBe(-30);
  });

  it("stops taking points once wastage is already ruinous", () => {
    expect(weekScore(week({ wastage: 10_000 * RUPEE })).score)
      .toBe(weekScore(week({ wastage: 90_000 * RUPEE })).score);
  });

  it("says nothing about wastage when there was none", () => {
    expect(weekScore(week()).parts.some((p) => p.label === "Stock lost")).toBe(false);
  });

  it("charges a point per thousand rupees of fines", () => {
    expect(weekScore(week({ fines: 30_000 * RUPEE })).score).toBe(170);
  });

  // A fine large enough wipes out a week that was otherwise fine, which is
  // the correct lesson about what compliance costs.
  it("never goes below nothing", () => {
    expect(weekScore(week({ fines: 500_000 * RUPEE })).score).toBe(0);
  });
});

describe("a week the pharmacy was shut", () => {
  // A hundred percent of nothing is not a hundred percent.
  it("scores nothing, whatever the other figures say", () => {
    const out = weekScore(week({ traded: false, serviceLevel: 100, grossMarginPercent: 20 }));
    expect(out.score).toBe(0);
    expect(out.parts).toHaveLength(1);
    expect(out.parts[0].label).toBe("Closed");
  });
});

describe("the breakdown", () => {
  it("adds up to the score it reports", () => {
    const out = weekScore(week({ serviceLevel: 80, grossMarginPercent: 15, wastage: 3_000 * RUPEE, fines: 10_000 * RUPEE }));
    expect(out.parts.reduce((sum, p) => sum + p.points, 0)).toBe(out.score);
  });

  it("explains each part in the pharmacy's own terms", () => {
    const out = weekScore(week({ serviceLevel: 92 }));
    expect(out.parts[0].detail).toContain("92%");
    expect(out.parts[1].detail).toContain("gross margin");
  });

  it("survives a week where nothing was sold at all", () => {
    const out = weekScore(week({ serviceLevel: 0, revenue: 0, grossMarginPercent: 0 }));
    expect(out.score).toBe(0);
    expect(Number.isFinite(out.score)).toBe(true);
  });
});
