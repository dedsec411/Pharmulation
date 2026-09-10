import { describe, expect, it } from "vitest";
import {
  rollEvents, requiredExcursionAction, applyRecall, recallHonoured, ODDS,
  type EventStock, type RollInput, type RecallEvent, type ExcursionEvent, type ShortageEvent,
} from "./events";

const item = (over: Partial<EventStock> = {}): EventStock => ({
  drugId: "d1", name: "Amoxicillin", batchNo: "B1", qty: 20,
  location: "ambient", requiredZone: "ambient", ...over,
});

const fridge = (over: Partial<EventStock> = {}): EventStock =>
  item({ name: "Insulin Glargine", batchNo: "COLD1", location: "cold-chain", requiredZone: "cold-chain", ...over });

function roll(over: Partial<RollInput> = {}): ReturnType<typeof rollEvents> {
  return rollEvents({
    period: 5, seed: "seed", difficulty: "medium",
    stock: [item()], arriving: [], ...over,
  });
}

/** Find a seed that produces the wanted event kind, so a test can be about
 *  the event rather than about dice. */
function seedFor(kind: string, base: Partial<RollInput>): string {
  for (let i = 0; i < 400; i++) {
    const seed = `s${i}`;
    if (roll({ ...base, seed }).some((e) => e.kind === kind)) return seed;
  }
  throw new Error(`no seed produced a ${kind}`);
}

describe("the same week arrives the same way", () => {
  it("rolls identically for one seed and differs across seeds", () => {
    const a = roll({ seed: "alpha", stock: [item(), fridge()] });
    const b = roll({ seed: "alpha", stock: [item(), fridge()] });
    expect(a).toEqual(b);
  });

  it("gets rougher as difficulty rises", () => {
    expect(ODDS.hard.recall).toBeGreaterThan(ODDS.medium.recall);
    expect(ODDS.medium.recall).toBeGreaterThan(ODDS.easy.recall);
    expect(ODDS.hard.inspectionEvery).toBeLessThan(ODDS.easy.inspectionEvery);
  });
});

describe("recalls", () => {
  // Recalling something the pharmacy never held is noise, not a decision.
  it("names a batch that is actually on the shelf", () => {
    const stock = [item({ batchNo: "REAL1" }), item({ batchNo: "REAL2", drugId: "d2" })];
    const seed = seedFor("recall", { stock });
    const recall = roll({ seed, stock }).find((e) => e.kind === "recall") as RecallEvent;
    expect(["REAL1", "REAL2"]).toContain(recall.batchNo);
  });

  it("never recalls stock already in quarantine", () => {
    const stock = [item({ batchNo: "HELD", location: "quarantine" })];
    for (let i = 0; i < 60; i++) {
      const events = roll({ seed: `q${i}`, stock });
      expect(events.some((e) => e.kind === "recall")).toBe(false);
    }
  });

  it("pulls only the named batch out of sale", () => {
    const stock = [
      { batchNo: "BAD", location: "ambient" as const, qty: 10 },
      { batchNo: "FINE", location: "ambient" as const, qty: 10 },
    ];
    const after = applyRecall(stock, "BAD");
    expect(after.find((s) => s.batchNo === "BAD")!.location).toBe("quarantine");
    expect(after.find((s) => s.batchNo === "FINE")!.location).toBe("ambient");
  });

  it("knows whether the notice was honoured", () => {
    const stock = [{ batchNo: "BAD", location: "ambient" as const, qty: 10 }];
    expect(recallHonoured(stock, "BAD")).toBe(false);
    expect(recallHonoured(applyRecall(stock, "BAD"), "BAD")).toBe(true);
  });
});

describe("cold chain excursions", () => {
  it("only happens when there is something in the fridge", () => {
    for (let i = 0; i < 60; i++) {
      expect(roll({ seed: `n${i}`, stock: [item()] }).some((e) => e.kind === "excursion")).toBe(false);
    }
  });

  it("names the affected batches and carries the data sheet", () => {
    const stock = [fridge()];
    const seed = seedFor("excursion", { stock });
    const event = roll({ seed, stock }).find((e) => e.kind === "excursion") as ExcursionEvent;
    expect(event.affectedBatches).toContain("COLD1");
    expect(event.stability.safeHours).toBeGreaterThan(0);
    expect(event.stability.safeMaxTempC).toBeGreaterThan(0);
  });

  // The action is read off the manufacturer's limits, not from a threshold
  // invented here - which is what a pharmacist actually does.
  it("keeps stock that stayed inside both limits", () => {
    expect(requiredExcursionAction(2, 10, { safeHours: 4, safeMaxTempC: 15 })).toBe("use");
    expect(requiredExcursionAction(4, 15, { safeHours: 4, safeMaxTempC: 15 })).toBe("use");
  });

  it("destroys stock that went far past temperature", () => {
    expect(requiredExcursionAction(6, 30, { safeHours: 4, safeMaxTempC: 15 })).toBe("destroy");
  });

  it("destroys stock that was out for a very long time and too warm", () => {
    expect(requiredExcursionAction(20, 18, { safeHours: 4, safeMaxTempC: 15 })).toBe("destroy");
  });

  // The honest answer more often than either extreme.
  it("quarantines the ambiguous middle pending advice", () => {
    expect(requiredExcursionAction(8, 16, { safeHours: 4, safeMaxTempC: 15 })).toBe("quarantine");
    expect(requiredExcursionAction(30, 12, { safeHours: 4, safeMaxTempC: 15 })).toBe("quarantine");
  });

  it("is stricter about a vaccine than a tablet", () => {
    const cold = roll({ seed: seedFor("excursion", { stock: [fridge()] }), stock: [fridge()] })
      .find((e) => e.kind === "excursion") as ExcursionEvent;
    expect(cold.stability.safeHours).toBeLessThanOrEqual(4);
  });
});

describe("short deliveries", () => {
  it("lands on an order that is actually arriving", () => {
    const arriving = [{ orderId: "o1", drugName: "Amoxicillin", packs: 100 }];
    const seed = seedFor("shortage", { arriving });
    const short = roll({ seed, arriving }).find((e) => e.kind === "shortage") as ShortageEvent;
    expect(short.orderId).toBe("o1");
    expect(short.delivered).toBeLessThan(short.ordered);
    expect(short.delivered).toBeGreaterThan(0);
  });

  it("never happens when nothing is arriving", () => {
    for (let i = 0; i < 40; i++) {
      expect(roll({ seed: `x${i}`, arriving: [] }).some((e) => e.kind === "shortage")).toBe(false);
    }
  });
});

describe("inspections", () => {
  // A regulator visits on a cadence. A learner getting away with something
  // should know it will eventually be looked at.
  it("arrives on schedule and without notice", () => {
    const every = ODDS.medium.inspectionEvery;
    const onTime = roll({ period: every, difficulty: "medium" });
    expect(onTime.some((e) => e.kind === "inspection")).toBe(true);
    const off = roll({ period: every + 1, difficulty: "medium" });
    expect(off.some((e) => e.kind === "inspection")).toBe(false);
  });

  it("does not inspect a pharmacy on its opening week", () => {
    expect(roll({ period: 1 }).some((e) => e.kind === "inspection")).toBe(false);
  });
});
