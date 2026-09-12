import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_CONTENT, DIFFICULTY_RULES, DIFFICULTY_TIME_SCALE,
  difficultyContent, type Difficulty,
} from "./shared";

const LADDER: Difficulty[] = ["easy", "medium", "hard"];

describe("difficulty changes the case, not just the scoring", () => {
  /**
   * The complaint this answers: Expert and Trainee handed you the same work.
   * Every content lever has to actually move between the two ends, or the
   * choice is decoration.
   */
  it("makes Expert different from Trainee on every lever", () => {
    const easy = DIFFICULTY_CONTENT.easy;
    const hard = DIFFICULTY_CONTENT.hard;
    expect(hard.distractors).not.toBe(easy.distractors);
    expect(hard.cartons).not.toBe(easy.cartons);
    expect(hard.auditScenarios).not.toBe(easy.auditScenarios);
    expect(hard.showTolerances).not.toBe(easy.showTolerances);
  });

  it("never gets easier as you climb", () => {
    for (let i = 1; i < LADDER.length; i += 1) {
      const below = DIFFICULTY_CONTENT[LADDER[i - 1]];
      const here = DIFFICULTY_CONTENT[LADDER[i]];
      expect(here.distractors).toBeGreaterThanOrEqual(below.distractors);
      expect(here.cartons).toBeGreaterThanOrEqual(below.cartons);
      expect(here.auditScenarios).toBeGreaterThanOrEqual(below.auditScenarios);
      // Help may be withdrawn going up, never added.
      expect(Number(here.showTolerances)).toBeLessThanOrEqual(Number(below.showTolerances));
    }
  });

  it("gives Apprentice a real middle rather than a copy of a neighbour", () => {
    const { easy, medium, hard } = DIFFICULTY_CONTENT;
    expect(JSON.stringify(medium)).not.toBe(JSON.stringify(easy));
    expect(JSON.stringify(medium)).not.toBe(JSON.stringify(hard));
  });

  it("still leaves a playable amount of work at Trainee", () => {
    expect(DIFFICULTY_CONTENT.easy.cartons).toBeGreaterThan(0);
    expect(DIFFICULTY_CONTENT.easy.auditScenarios).toBeGreaterThan(0);
  });

  it("falls back to the middle for anything unrecognised", () => {
    expect(difficultyContent(null)).toEqual(DIFFICULTY_CONTENT.medium);
    expect(difficultyContent("nonsense")).toEqual(DIFFICULTY_CONTENT.medium);
    expect(difficultyContent("hard")).toEqual(DIFFICULTY_CONTENT.hard);
  });
});

describe("the levers that already existed still climb", () => {
  it("shortens the clock as it gets harder", () => {
    expect(DIFFICULTY_TIME_SCALE.easy).toBeGreaterThan(DIFFICULTY_TIME_SCALE.medium);
    expect(DIFFICULTY_TIME_SCALE.medium).toBeGreaterThan(DIFFICULTY_TIME_SCALE.hard);
  });

  it("punishes a mistake more at every step up", () => {
    expect(DIFFICULTY_RULES.hard.penaltyMultiplier).toBeGreaterThan(DIFFICULTY_RULES.medium.penaltyMultiplier);
    expect(DIFFICULTY_RULES.medium.penaltyMultiplier).toBeGreaterThan(DIFFICULTY_RULES.easy.penaltyMultiplier);
  });
});
