import { describe, expect, it } from "vitest";
import {
  CODE_LENGTH, generateJoinCode, isValidJoinCode, joinCodeProblem, normaliseJoinCode,
} from "./codes";

describe("generateJoinCode", () => {
  it("always produces a code the database will accept", () => {
    // The CHECK constraint on classes.join_code is the same expression, so a
    // generator that can emit an invalid code fails at insert time.
    for (let i = 0; i < 400; i++) {
      const code = generateJoinCode();
      expect(isValidJoinCode(code), code).toBe(true);
      expect(code).toHaveLength(CODE_LENGTH);
    }
  });

  it("never emits a character that is ambiguous on a whiteboard", () => {
    for (let i = 0; i < 400; i++) {
      expect(generateJoinCode()).not.toMatch(/[IO01]/);
    }
  });

  it("stays in range at the extremes of the random source", () => {
    expect(isValidJoinCode(generateJoinCode(() => 0))).toBe(true);
    // Math.random never returns 1, but a caller-supplied source might.
    expect(isValidJoinCode(generateJoinCode(() => 0.999999))).toBe(true);
    expect(isValidJoinCode(generateJoinCode(() => 1))).toBe(true);
  });
});

describe("normaliseJoinCode", () => {
  it("fixes what people actually type", () => {
    expect(normaliseJoinCode("apq-4k7")).toBe("APQ4K7");
    expect(normaliseJoinCode("  apq 4k7 ")).toBe("APQ4K7");
  });

  // A typed O could be a Q or a D. Guessing would enrol someone in the wrong
  // class rather than telling them the code is wrong.
  it("does not guess at an excluded character", () => {
    expect(normaliseJoinCode("AOQ4K7")).toBe("AOQ4K7");
    expect(isValidJoinCode(normaliseJoinCode("AOQ4K7"))).toBe(false);
  });
});

describe("joinCodeProblem", () => {
  it("treats an empty field as fine, because the field is optional", () => {
    expect(joinCodeProblem("")).toBeNull();
    expect(joinCodeProblem("   ")).toBeNull();
  });

  it("accepts a real code", () => {
    expect(joinCodeProblem(generateJoinCode())).toBeNull();
  });

  it("says what is wrong rather than just refusing", () => {
    expect(joinCodeProblem("ABC")).toContain("6 characters");
    expect(joinCodeProblem("ABC0EF")).toContain("I, O, zero or one");
  });
});
