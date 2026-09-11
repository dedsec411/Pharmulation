import { describe, expect, it } from "vitest";
import {
  buildOperationsMap, skillForFault, weakestOperation, OPERATION_SKILLS, MIN_WEEKS,
  type WeekRow,
} from "./operations";

const week = (...codes: string[]): WeekRow => ({
  mode: "warehousing",
  errors_detail: codes.map((errorType) => ({ errorType })),
});

const clean = () => week();

function cell(rows: WeekRow[], skill: string) {
  return buildOperationsMap(rows).cells.find((c) => c.skill === skill)!;
}

describe("which part of the job a fault belongs to", () => {
  it("files running out and over-ordering under buying", () => {
    expect(skillForFault("stock-out")).toBe("procurement");
    expect(skillForFault("over-ordered")).toBe("procurement");
  });

  it("files the cold chain and the safe under storage", () => {
    expect(skillForFault("cold-chain-broken")).toBe("storage");
    expect(skillForFault("excursion-ignored")).toBe("storage");
    expect(skillForFault("cd-not-secured")).toBe("storage");
  });

  it("files licences, logs and ignored notices under compliance", () => {
    expect(skillForFault("no-licence")).toBe("compliance");
    expect(skillForFault("no-temperature-log")).toBe("compliance");
    expect(skillForFault("recall-ignored")).toBe("compliance");
  });

  it("files the register and expired stock under accuracy", () => {
    expect(skillForFault("cd-shortfall")).toBe("stock-accuracy");
    expect(skillForFault("expired-on-shelf")).toBe("stock-accuracy");
  });

  it("says nothing about a code it does not know", () => {
    expect(skillForFault("something-else")).toBeNull();
    expect(skillForFault("")).toBeNull();
  });

  // Keyed on codes, not wording, so rephrasing a message to a learner cannot
  // silently move it to a different skill.
  it("covers every skill it defines", () => {
    const covered = new Set(OPERATION_SKILLS.map((s) => s.key));
    for (const key of covered) {
      expect(OPERATION_SKILLS.some((s) => s.key === key)).toBe(true);
    }
    expect(covered.size).toBe(4);
  });
});

describe("building the map", () => {
  it("counts every closed week as an attempt at all four", () => {
    const map = buildOperationsMap([clean(), clean(), clean()]);
    expect(map.weeks).toBe(3);
    expect(map.cells).toHaveLength(4);
    expect(map.cells.every((c) => c.weeks === 3)).toBe(true);
    expect(map.cells.every((c) => c.accuracy === 1)).toBe(true);
  });

  it("ignores anything that is not a closed week", () => {
    const map = buildOperationsMap([
      { mode: "rx", errors_detail: [{ errorType: "Wrong drug selected" }] },
      clean(),
    ]);
    expect(map.weeks).toBe(1);
    expect(map.unmapped).toBe(0);
  });

  // A single bad week can throw three findings of the same kind. Counting
  // each one would read as three bad weeks, which it is not.
  it("counts a week as bad once, however many findings it produced", () => {
    const bad = cell([week("cd-shortfall", "cd-surplus", "expired-on-shelf"), clean(), clean(), clean()], "stock-accuracy");
    expect(bad.faults).toBe(3);
    expect(bad.accuracy).toBe(0.75);
  });

  it("keeps a fault out of the skills it has nothing to do with", () => {
    const rows = [week("no-licence"), clean(), clean()];
    expect(cell(rows, "compliance").faults).toBe(1);
    expect(cell(rows, "storage").faults).toBe(0);
    expect(cell(rows, "storage").accuracy).toBe(1);
  });

  it("records a fault it cannot place without scoring it", () => {
    const map = buildOperationsMap([week("mystery"), clean(), clean()]);
    expect(map.unmapped).toBe(1);
    expect(map.cells.every((c) => c.faults === 0)).toBe(true);
  });

  // Two weeks is not a track record.
  it("states no accuracy until there are enough weeks behind it", () => {
    const thin = buildOperationsMap(Array.from({ length: MIN_WEEKS - 1 }, clean));
    expect(thin.cells.every((c) => c.accuracy === null)).toBe(true);
    const enough = buildOperationsMap(Array.from({ length: MIN_WEEKS }, clean));
    expect(enough.cells.every((c) => c.accuracy === 1)).toBe(true);
  });

  it("reads errors_detail that arrived as JSON text", () => {
    const map = buildOperationsMap([
      { mode: "warehousing", errors_detail: JSON.stringify([{ errorType: "no-licence" }]) },
      clean(), clean(),
    ]);
    expect(map.cells.find((c) => c.skill === "compliance")!.faults).toBe(1);
  });

  it("does not fall over on a week with no detail at all", () => {
    const map = buildOperationsMap([{ mode: "warehousing" }, { mode: "warehousing", errors_detail: null }]);
    expect(map.weeks).toBe(2);
    expect(map.unmapped).toBe(0);
  });
});

describe("the weakest part of the job", () => {
  it("names the skill with the worst record", () => {
    const rows = [week("cold-chain-broken"), week("cold-chain-broken"), week("no-licence"), clean()];
    expect(weakestOperation(buildOperationsMap(rows))!.skill).toBe("storage");
  });

  it("says nothing when there is not enough history to say it", () => {
    expect(weakestOperation(buildOperationsMap([clean()]))).toBeNull();
    expect(weakestOperation(buildOperationsMap([]))).toBeNull();
  });
});
