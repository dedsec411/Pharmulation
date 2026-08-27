import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_RULES,
  MODE_TIMERS,
  RETRY_REWARD_FACTORS,
  SCORE_WEIGHTS,
  computeScore,
  computeScoreFromPoints,
  liveScore,
  liveScoreFromPoints,
  modeTimeLimit,
  publicModeCount,
  publicModeLabel,
  retryRewardFactor,
} from "./shared";

const NO_SPEED_BONUS = { timeTakenSec: 100, timeLimitSec: 100, timedOut: false };

describe("computeScore", () => {
  it("starts from the difficulty base with no answers given", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(computeScore({ difficulty: d, ...NO_SPEED_BONUS })).toBe(DIFFICULTY_RULES[d].base);
    }
  });

  it("falls back to medium for an unknown difficulty", () => {
    expect(computeScore({ difficulty: "nonsense", ...NO_SPEED_BONUS }))
      .toBe(computeScore({ difficulty: "medium", ...NO_SPEED_BONUS }));
    expect(computeScore({ difficulty: null, ...NO_SPEED_BONUS }))
      .toBe(computeScore({ difficulty: "medium", ...NO_SPEED_BONUS }));
  });

  it("applies the documented weight for each action", () => {
    const base = computeScore({ difficulty: "medium", ...NO_SPEED_BONUS });
    const delta = (input: Parameters<typeof computeScore>[0]) =>
      computeScore({ difficulty: "medium", ...NO_SPEED_BONUS, ...input }) - base;

    expect(delta({ correctDrugs: 1 })).toBe(SCORE_WEIGHTS.correctDrug);
    expect(delta({ infoRead: 1 })).toBe(SCORE_WEIGHTS.infoRead);
    expect(delta({ correctLabels: 1 })).toBe(SCORE_WEIGHTS.correctLabel);
    expect(delta({ wrongDrugs: 1 })).toBe(-SCORE_WEIGHTS.wrongDrug);
    expect(delta({ wrongLabels: 1 })).toBe(-SCORE_WEIGHTS.wrongLabel);
    expect(delta({ hintsUsed: 1 })).toBe(-SCORE_WEIGHTS.hint);
  });

  it("rewards more and punishes more as difficulty rises", () => {
    const reward = (d: "easy" | "medium" | "hard") =>
      computeScore({ difficulty: d, correctDrugs: 1, ...NO_SPEED_BONUS }) - DIFFICULTY_RULES[d].base;
    expect(reward("easy")).toBeLessThan(reward("medium"));
    expect(reward("medium")).toBeLessThan(reward("hard"));

    const penalty = (d: "easy" | "medium" | "hard") =>
      DIFFICULTY_RULES[d].base - computeScore({ difficulty: d, wrongDrugs: 1, ...NO_SPEED_BONUS });
    expect(penalty("easy")).toBeLessThan(penalty("medium"));
    expect(penalty("medium")).toBeLessThan(penalty("hard"));
  });

  it("gives the speed bonus only inside half the time limit", () => {
    const fast = computeScore({ difficulty: "medium", timeTakenSec: 49, timeLimitSec: 100 });
    const slow = computeScore({ difficulty: "medium", timeTakenSec: 51, timeLimitSec: 100 });
    expect(fast - slow).toBe(DIFFICULTY_RULES.medium.speedBonus);
  });

  it("scales the whole score down on timeout", () => {
    const finished = computeScore({ difficulty: "medium", correctDrugs: 3, ...NO_SPEED_BONUS });
    const timedOut = computeScore({ difficulty: "medium", correctDrugs: 3, ...NO_SPEED_BONUS, timedOut: true });
    expect(timedOut).toBe(Math.floor(finished * DIFFICULTY_RULES.medium.timeoutMultiplier));
  });

  it("never returns a negative score", () => {
    expect(computeScore({ difficulty: "hard", wrongDrugs: 99, hintsUsed: 99, ...NO_SPEED_BONUS })).toBe(0);
  });
});

describe("liveScore", () => {
  // The running score used to be a per-mode ad-hoc formula that disagreed with
  // the results screen. It now delegates to computeScore precisely so the two
  // cannot drift; this is the test that keeps that true.
  it("matches computeScore once the speed bonus is out of reach", () => {
    const counters = { correctDrugs: 3, wrongDrugs: 1, infoRead: 2, correctLabels: 2, wrongLabels: 1, hintsUsed: 1 };
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(liveScore({ difficulty: d, ...counters }))
        .toBe(computeScore({ difficulty: d, ...counters, ...NO_SPEED_BONUS }));
    }
  });

  it("excludes the speed bonus, which is not known mid-case", () => {
    expect(liveScore({ difficulty: "medium" })).toBe(DIFFICULTY_RULES.medium.base);
  });
});

describe("computeScoreFromPoints", () => {
  // Industry and warehousing previously did `computeScore(...) - 100`, which
  // hardcoded the medium base: easy quietly lost 10 points and hard gained 20.
  it("substitutes the mode's own points for the difficulty base", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(computeScoreFromPoints({ difficulty: d, points: 150, ...NO_SPEED_BONUS })).toBe(150);
    }
  });

  it("still applies hint and pause penalties", () => {
    const plain = computeScoreFromPoints({ difficulty: "medium", points: 150, ...NO_SPEED_BONUS });
    const hinted = computeScoreFromPoints({ difficulty: "medium", points: 150, hintsUsed: 1, ...NO_SPEED_BONUS });
    expect(plain - hinted).toBe(SCORE_WEIGHTS.hint);
  });

  it("treats negative points as zero and never goes below zero", () => {
    expect(computeScoreFromPoints({ difficulty: "medium", points: -500, ...NO_SPEED_BONUS })).toBe(0);
  });

  it("agrees with its live variant", () => {
    const args = { difficulty: "hard" as const, hintsUsed: 2, pauseUsed: true, points: 200 };
    expect(liveScoreFromPoints(args)).toBe(computeScoreFromPoints({ ...args, ...NO_SPEED_BONUS }));
  });
});

describe("retryRewardFactor", () => {
  it("pays full marks first time and nothing by the fourth attempt", () => {
    expect(retryRewardFactor(0)).toBe(1);
    expect(retryRewardFactor(3)).toBe(0);
  });

  it("decreases monotonically", () => {
    for (let i = 1; i < RETRY_REWARD_FACTORS.length; i++) {
      expect(retryRewardFactor(i)).toBeLessThan(retryRewardFactor(i - 1));
    }
  });

  it("clamps out-of-range attempt counts", () => {
    expect(retryRewardFactor(-5)).toBe(1);
    expect(retryRewardFactor(99)).toBe(0);
  });

  it("makes guessing cost more than it earns", () => {
    // Two wrong guesses then the right answer must be worse than one clean miss.
    const guessed = SCORE_WEIGHTS.correctDrug * retryRewardFactor(2) - 2 * SCORE_WEIGHTS.wrongDrug;
    expect(guessed).toBeLessThan(-SCORE_WEIGHTS.wrongDrug);
  });
});

describe("modeTimeLimit", () => {
  it("gives easy more time than hard", () => {
    expect(modeTimeLimit("otc", "easy")).toBeGreaterThan(modeTimeLimit("otc", "medium"));
    expect(modeTimeLimit("otc", "hard")).toBeLessThan(modeTimeLimit("otc", "medium"));
  });

  it("uses the mode baseline at medium, and for unknown difficulty", () => {
    expect(modeTimeLimit("hospital", "medium")).toBe(MODE_TIMERS.hospital);
    expect(modeTimeLimit("hospital", null)).toBe(MODE_TIMERS.hospital);
  });

  it("allows enough time for a typed OTC consultation", () => {
    // OTC was 120s, which is not survivable for a typed conversation.
    expect(modeTimeLimit("otc", "hard")).toBeGreaterThan(240);
  });
});

describe("publicModeLabel", () => {
  it("groups sub-modes under their public name", () => {
    expect(publicModeLabel("rx")).toBe("Community Pharmacy");
    expect(publicModeLabel("otc")).toBe("Community Pharmacy");
    expect(publicModeLabel("hospital")).toBe("Clinical");
  });

  it("falls back to the raw value for an unknown mode", () => {
    expect(publicModeLabel("mystery")).toBe("mystery");
  });
});

describe("publicModeCount", () => {
  it("sums the counts of every mode in a group", () => {
    expect(publicModeCount({ rx: 3, otc: 4, hospital: 9 }, ["rx", "otc"])).toBe(7);
  });

  it("treats missing modes as zero", () => {
    expect(publicModeCount({}, ["rx", "otc"])).toBe(0);
  });
});
