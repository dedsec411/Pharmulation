import { describe, expect, it } from "vitest";
import { ordinal, standing } from "./PeerBenchmark";

describe("standing", () => {
  // Best of five came out as "top 1%", which is what the percentile says and
  // is completely misleading, so a small cohort is reported as a rank.
  it("reports a rank rather than a percentile in a small cohort", () => {
    expect(standing(100, 5)).toBe("1st of 5");
    expect(standing(75, 5)).toBe("2nd of 5");
  });

  // The regression: the bottom of the cohort scores 0, and the formula turned
  // that into peers + 1.
  it("never ranks anyone below the size of the cohort", () => {
    expect(standing(0, 5)).toBe("5th of 5");
    expect(standing(0, 2)).toBe("2nd of 2");
    expect(standing(0, 1)).toBe("1st of 1");
  });

  it("switches to percentiles once the cohort is big enough", () => {
    expect(standing(96, 40)).toBe("top 4%");
    expect(standing(12, 40)).toBe("bottom 12%");
  });

  // A percentile of exactly 100 would otherwise read "top 0%".
  it("never claims a zero percent band", () => {
    expect(standing(100, 40)).toBe("top 1%");
    expect(standing(0, 40)).toBe("bottom 1%");
  });
});

describe("ordinal", () => {
  it("handles the teens, which do not follow the last digit", () => {
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
  });
});
