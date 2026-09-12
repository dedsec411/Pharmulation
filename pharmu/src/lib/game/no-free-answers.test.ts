import { describe, expect, it } from "vitest";
import { canStartWrong, shuffledBySeed, wrongStart } from "./no-free-answers";

describe("shuffledBySeed", () => {
  const options = ["a", "b", "c", "d"];

  it("keeps every option, and none twice", () => {
    const out = shuffledBySeed(options, "case-1:q1");
    expect([...out].sort()).toEqual([...options].sort());
  });

  it("gives the same case the same screen on a replay", () => {
    expect(shuffledBySeed(options, "case-1:q1")).toEqual(shuffledBySeed(options, "case-1:q1"));
  });

  it("does not hand every question in a case the same permutation", () => {
    const perms = ["q1", "q2", "q3", "q4"].map((q) => shuffledBySeed(options, `case-1:${q}`).join(""));
    expect(new Set(perms).size).toBeGreaterThan(1);
  });

  it("copes with nothing, one, and two options", () => {
    expect(shuffledBySeed([], "s")).toEqual([]);
    expect(shuffledBySeed(["only"], "s")).toEqual(["only"]);
    expect([...shuffledBySeed(["a", "b"], "s")].sort()).toEqual(["a", "b"]);
  });

  it("leaves the caller's array alone", () => {
    const original = [...options];
    shuffledBySeed(options, "s");
    expect(options).toEqual(original);
  });

  /**
   * The point of the whole exercise. Across many questions the answer has to
   * land in every position at roughly the same rate - the bug being fixed was
   * that it was first or second every single time.
   */
  it("spreads the answer across all four positions", () => {
    const counts = [0, 0, 0, 0];
    for (let q = 0; q < 400; q += 1) {
      const order = shuffledBySeed(options, `case-${q % 20}:q${q}`);
      counts[order.indexOf("a")] += 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(400 / 4 * 0.6);
      expect(count).toBeLessThan(400 / 4 * 1.4);
    }
  });
});

describe("wrongStart", () => {
  const band = { min: 40, max: 60, floor: 0, ceiling: 120 };

  it("never opens on a value that would already pass", () => {
    for (let i = 0; i < 300; i += 1) {
      const value = wrongStart({ ...band, seed: `ing-${i}` });
      expect(value < band.min || value > band.max).toBe(true);
    }
  });

  it("stays inside what the control can actually reach", () => {
    for (let i = 0; i < 300; i += 1) {
      const value = wrongStart({ ...band, seed: `ing-${i}` });
      expect(value).toBeGreaterThanOrEqual(band.floor);
      expect(value).toBeLessThanOrEqual(band.ceiling);
    }
  });

  it("uses both sides of the band rather than always starting low", () => {
    const values = Array.from({ length: 60 }, (_, i) => wrongStart({ ...band, seed: `x${i}` }));
    expect(values.some((v) => v < band.min)).toBe(true);
    expect(values.some((v) => v > band.max)).toBe(true);
  });

  it("does not sit one nudge from the answer", () => {
    // A value adjacent to the band is corrected by feel. This has to be aimed.
    const values = Array.from({ length: 60 }, (_, i) => wrongStart({ ...band, seed: `y${i}` }));
    const adjacent = values.filter((v) => v === band.min - 1 || v === band.max + 1);
    expect(adjacent.length).toBeLessThan(values.length / 2);
  });

  it("respects the control's step, so the slider can reach it", () => {
    for (let i = 0; i < 60; i += 1) {
      const value = wrongStart({ min: 400, max: 600, floor: 0, ceiling: 1200, step: 25, seed: `s${i}` });
      expect(value % 25).toBe(0);
    }
  });

  it("is the same value every time the same ingredient is reopened", () => {
    const once = wrongStart({ ...band, seed: "case-1:lactose" });
    expect(wrongStart({ ...band, seed: "case-1:lactose" })).toBe(once);
  });

  it("differs between ingredients, so one correction does not teach the next", () => {
    const values = new Set(
      ["lactose", "starch", "magnesium stearate", "api"].map((n) => wrongStart({ ...band, seed: `case-1:${n}` })),
    );
    expect(values.size).toBeGreaterThan(1);
  });

  // Only room above the band.
  it("works when the band sits on the floor of the control", () => {
    for (let i = 0; i < 40; i += 1) {
      const value = wrongStart({ min: 0, max: 10, floor: 0, ceiling: 100, seed: `z${i}` });
      expect(value).toBeGreaterThan(10);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  // Only room below.
  it("works when the band reaches the ceiling of the control", () => {
    for (let i = 0; i < 40; i += 1) {
      const value = wrongStart({ min: 90, max: 100, floor: 0, ceiling: 100, seed: `w${i}` });
      expect(value).toBeLessThan(90);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not throw when the band leaves no wrong value at all", () => {
    expect(canStartWrong({ min: 0, max: 100, floor: 0, ceiling: 100 })).toBe(false);
    const value = wrongStart({ min: 0, max: 100, floor: 0, ceiling: 100, seed: "q" });
    expect(Number.isFinite(value)).toBe(true);
  });

  it("reports honestly whether a control has room to start wrong", () => {
    expect(canStartWrong(band)).toBe(true);
    expect(canStartWrong({ min: 0, max: 10, floor: 0, ceiling: 100 })).toBe(true);
  });
});
