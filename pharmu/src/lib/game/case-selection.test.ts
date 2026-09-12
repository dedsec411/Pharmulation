import { describe, expect, it } from "vitest";
import { difficultyPool, pickNextCase, playsBeforeRepeat, seenMap } from "./case-selection";

const pool = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}` }));

describe("difficultyPool", () => {
  it("serves the difficulty that was asked for and nothing else", () => {
    expect(difficultyPool("hard")).toEqual(["hard"]);
    expect(difficultyPool("easy")).toEqual(["easy"]);
  });

  // The widening this replaces made Expert and Trainee the same pool from
  // level eight up, so the choice changed nothing.
  it("never lets Expert and Trainee draw from the same pool", () => {
    expect(difficultyPool("hard")).not.toEqual(difficultyPool("easy"));
  });
});

describe("pickNextCase", () => {
  it("has nothing to give from an empty pool", () => {
    expect(pickNextCase([], new Map())).toBeNull();
  });

  it("takes something never played before anything already played", () => {
    const seen = new Map([["c1", 1_000], ["c2", 2_000]]);
    expect(pickNextCase(pool(3), seen)?.id).toBe("c3");
  });

  /**
   * The point of the whole module: a player works through everything in the
   * bucket before meeting anything twice. This used to be a uniform random
   * draw, and Expert OTC held exactly one case.
   */
  it("works through the whole pool before repeating", () => {
    const candidates = pool(8);
    const seen = new Map<string, number>();
    const order: string[] = [];
    for (let play = 0; play < 8; play += 1) {
      const next = pickNextCase(candidates, seen)!;
      order.push(next.id);
      seen.set(next.id, play);
    }
    expect(new Set(order).size).toBe(8);
  });

  it("comes back to the one played longest ago once everything has been played", () => {
    const seen = new Map([["c1", 500], ["c2", 9_000], ["c3", 3_000]]);
    expect(pickNextCase(pool(3), seen)?.id).toBe("c1");
  });

  it("keeps cycling rather than sticking on one case", () => {
    const candidates = pool(3);
    const seen = new Map([["c1", 1], ["c2", 2], ["c3", 3]]);
    const order: string[] = [];
    for (let play = 10; play < 19; play += 1) {
      const next = pickNextCase(candidates, seen)!;
      order.push(next.id);
      seen.set(next.id, play);
    }
    // Three full cycles, each visiting every case once.
    expect(new Set(order.slice(0, 3)).size).toBe(3);
    expect(new Set(order.slice(3, 6)).size).toBe(3);
    expect(new Set(order.slice(6, 9)).size).toBe(3);
  });

  it("does not send two players down the same path", () => {
    const candidates = pool(4);
    const first = pickNextCase(candidates, new Map(), () => 0.1)?.id;
    const second = pickNextCase(candidates, new Map(), () => 0.9)?.id;
    expect(first).not.toBe(second);
  });

  it("still returns something when the bucket holds one case", () => {
    expect(pickNextCase(pool(1), new Map([["c1", 5]]))?.id).toBe("c1");
  });

  it("survives an rng that returns exactly 1", () => {
    expect(pickNextCase(pool(3), new Map(), () => 1)).not.toBeNull();
  });
});

describe("seenMap", () => {
  it("reads the rows the database returns", () => {
    const map = seenMap([{ case_id: "a", last_seen_at: "2026-09-01T00:00:00Z" }]);
    expect(map.get("a")).toBe(Date.parse("2026-09-01T00:00:00Z"));
  });

  it("ignores rows for generated cases, which have no case id", () => {
    expect(seenMap([{ case_id: null, last_seen_at: "2026-09-01T00:00:00Z" }]).size).toBe(0);
  });

  it("treats an unreadable timestamp as long ago rather than throwing", () => {
    expect(seenMap([{ case_id: "a", last_seen_at: "not a date" }]).get("a")).toBe(0);
    expect(seenMap([{ case_id: "a" }]).get("a")).toBe(0);
  });
});

describe("playsBeforeRepeat", () => {
  it("tells the truth about a thin bucket", () => {
    expect(playsBeforeRepeat(1)).toBe(1);
    expect(playsBeforeRepeat(8)).toBe(8);
    expect(playsBeforeRepeat(0)).toBe(0);
  });
});
