import { describe, expect, it } from "vitest";
import {
  rollEvents, requiredExcursionAction, applyRecall, recallHonoured, settleNotices,
  ODDS, RECALL_IGNORED_FINE, EXCURSION_IGNORED_FINE,
  type EventStock, type RollInput, type RecallEvent, type ExcursionEvent, type ShortageEvent,
  type OpenNotice,
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

describe("settling last week's notices", () => {
  const onShelf = (batchNo: string, location: "ambient" | "quarantine" = "ambient") =>
    ({ batchNo, location, qty: 10 } as const);

  const recall = (over: Partial<OpenNotice> = {}): OpenNotice => ({
    id: "n1", kind: "recall", period: 4, resolved: false, resolution: null,
    batchNo: "BAD", ...over,
  });
  const excursion = (over: Partial<OpenNotice> = {}): OpenNotice => ({
    id: "n2", kind: "excursion", period: 4, resolved: false, resolution: null,
    affectedBatches: ["COLD1"], requiredAction: "destroy", ...over,
  });

  it("leaves a notice raised this week alone", () => {
    const out = settleNotices([recall({ period: 5 })], [onShelf("BAD")], 5);
    expect(out).toEqual({ condemned: [], charges: [], updates: [] });
  });

  describe("a recall", () => {
    it("writes off a batch that was pulled from sale", () => {
      const out = settleNotices([recall()], [onShelf("BAD", "quarantine")], 5);
      expect(out.condemned).toEqual(["BAD"]);
      expect(out.charges).toEqual([]);
      expect(out.updates[0]).toEqual({ id: "n1", resolution: "destroyed" });
    });

    // Charged again each week, because the harm is ongoing and so is the
    // choice to keep selling it. The notice stays open.
    it("fines a batch still on the shelf, and keeps the notice open", () => {
      const out = settleNotices([recall()], [onShelf("BAD")], 5);
      expect(out.condemned).toEqual([]);
      expect(out.charges[0].amount).toBe(RECALL_IGNORED_FINE);
      expect(out.charges[0].note).toContain("still on sale");
      expect(out.updates).toEqual([]);
    });

    it("charges again the following week if it is still there", () => {
      const twice = [5, 6].map((p) => settleNotices([recall()], [onShelf("BAD")], p));
      expect(twice.every((s) => s.charges.length === 1)).toBe(true);
    });

    // An empty shelf must never read as compliance: the batch went over the
    // counter after the notice, which is the worst outcome a recall has.
    it("treats a batch that has gone as dispensed, not as withdrawn", () => {
      const out = settleNotices([recall()], [onShelf("SOMETHING-ELSE")], 5);
      expect(out.condemned).toEqual([]);
      expect(out.charges[0].note).toContain("dispensed rather than withdrawn");
      expect(out.updates[0].resolution).toBe("dispensed before withdrawal");
    });

    it("writes off a batch the learner answered for", () => {
      const out = settleNotices(
        [recall({ resolved: true, resolution: "quarantined" })], [onShelf("BAD", "quarantine")], 5);
      expect(out.condemned).toEqual(["BAD"]);
      expect(out.updates[0].resolution).toBe("destroyed");
    });

    it("does not write the same batch off twice", () => {
      const first = settleNotices(
        [recall({ resolved: true, resolution: "quarantined" })], [onShelf("BAD", "quarantine")], 5);
      const after = settleNotices(
        [recall({ resolved: true, resolution: first.updates[0].resolution })], [], 6);
      expect(after.condemned).toEqual([]);
    });
  });

  describe("a cold chain excursion", () => {
    it("destroys the stock when nobody answered, and fines the silence", () => {
      const out = settleNotices([excursion()], [onShelf("COLD1")], 5);
      expect(out.condemned).toEqual(["COLD1"]);
      expect(out.charges[0].amount).toBe(EXCURSION_IGNORED_FINE);
      expect(out.updates[0].resolution).toBe("destroyed - not acted on");
    });

    // Nothing was required, so ignoring it costs nothing but the stock.
    it("does not fine silence on an excursion the data sheet cleared", () => {
      const out = settleNotices([excursion({ requiredAction: "use" })], [onShelf("COLD1")], 5);
      expect(out.charges).toEqual([]);
    });

    // The condition of the medicine does not depend on the decision.
    it("destroys condemned stock even when the learner chose to use it", () => {
      const out = settleNotices(
        [excursion({ resolved: true, resolution: "use" })], [onShelf("COLD1")], 5);
      expect(out.condemned).toEqual(["COLD1"]);
      expect(out.charges[0].note).toContain("stability limits");
    });

    it("charges nothing for using stock the data sheet cleared", () => {
      const out = settleNotices(
        [excursion({ resolved: true, resolution: "use", requiredAction: "use" })],
        [onShelf("COLD1")], 5);
      expect(out.charges).toEqual([]);
      expect(out.condemned).toEqual([]);
    });

    // Over-cautious is allowed to be expensive, but it is not an offence.
    it("lets a learner destroy stock that was fine, at their own cost", () => {
      const out = settleNotices(
        [excursion({ resolved: true, resolution: "destroy", requiredAction: "use" })],
        [onShelf("COLD1")], 5);
      expect(out.condemned).toEqual(["COLD1"]);
      expect(out.charges).toEqual([]);
    });

    it("settles a notice once and not again", () => {
      const out = settleNotices(
        [excursion({ resolved: true, resolution: "quarantine" })], [onShelf("COLD1")], 5);
      expect(out.updates[0].resolution).toBe("settled");
      const again = settleNotices(
        [excursion({ resolved: true, resolution: "settled" })], [onShelf("COLD1")], 6);
      expect(again.condemned).toEqual([]);
      expect(again.updates).toEqual([]);
    });
  });

  it("closes a short delivery without charging for it", () => {
    const out = settleNotices(
      [{ id: "n3", kind: "shortage", period: 4, resolved: false, resolution: null }], [], 5);
    expect(out.charges).toEqual([]);
    expect(out.updates[0].resolution).toBe("noted");
  });

  // An expired licence is not settled by the close: it is settled by renewing.
  it("leaves a licence expiry open", () => {
    const out = settleNotices(
      [{ id: "n4", kind: "licence-expiry", period: 4, resolved: false, resolution: null }], [], 5);
    expect(out).toEqual({ condemned: [], charges: [], updates: [] });
  });
});
