import { describe, expect, it } from "vitest";
import {
  onHandByDrug, stockPositions, expiringSoon, briefing, cashRunwayWeeks,
  monthToDate, coverLabel, money,
  type ViewCatalogueLine, type ViewBatch, type ViewOrder, type PeriodRow,
} from "./view";
import { RUPEE } from "./economics";

const line = (over: Partial<ViewCatalogueLine> = {}): ViewCatalogueLine => ({
  drugId: "panadol", name: "Panadol", category: "Analgesic",
  mrp: 120 * RUPEE, tradePrice: 96 * RUPEE, baseWeekly: 20,
  leadTimeWeeks: 2, storage: "ambient", controlled: false, ...over,
});

const batch = (over: Partial<ViewBatch> = {}): ViewBatch => ({
  id: "s1", drugId: "panadol", batchNo: "B1", qty: 40, expiresPeriod: 99,
  unitCost: 96 * RUPEE, location: "ambient", ...over,
});

const order = (over: Partial<ViewOrder> = {}): ViewOrder => ({
  id: "o1", supplier: "Central", etaPeriod: 3, paymentDuePeriod: 5,
  total: 10_000 * RUPEE, paid: false, status: "placed",
  lines: [{ drugId: "panadol", packs: 50, receivedPacks: null }], ...over,
});

const period = (over: Partial<PeriodRow> = {}): PeriodRow => ({
  periodNo: 1, revenue: 10_000 * RUPEE, cogs: 8_000 * RUPEE, wastage: 0,
  purchases: 0, overheads: 1_000 * RUPEE, penalties: 0, fees: 0,
  openingCash: 100_000 * RUPEE, closingCash: 109_000 * RUPEE,
  demanded: 100, sold: 90, ...over,
});

describe("what is on the shelf", () => {
  it("adds up packs, value and where they are", () => {
    const held = onHandByDrug([
      batch({ batchNo: "A", qty: 10 }),
      batch({ batchNo: "B", qty: 5, location: "quarantine" }),
    ]).get("panadol")!;
    expect(held.packs).toBe(15);
    expect(held.sellable).toBe(10);
    expect(held.quarantined).toBe(5);
    expect(held.value).toBe(15 * 96 * RUPEE);
  });

  it("ignores an emptied batch", () => {
    expect(onHandByDrug([batch({ qty: 0 })]).size).toBe(0);
  });
});

describe("the position of a line", () => {
  // A pallet sitting in quarantine serves nobody. Counting it as cover would
  // tell a learner they have four weeks of stock they cannot dispense.
  it("counts only sellable stock as cover", () => {
    const [pos] = stockPositions(
      [line()], [batch({ qty: 40, location: "quarantine" })], []);
    expect(pos.weeksOfCover).toBe(0);
    expect(pos.onHand.packs).toBe(40);
  });

  it("measures cover against the usual weekly rate", () => {
    const [pos] = stockPositions([line({ baseWeekly: 20 })], [batch({ qty: 50 })], []);
    expect(pos.weeksOfCover).toBeCloseTo(2.5, 5);
  });

  // Stock on order stops a learner ordering the same line four weeks running,
  // without letting goods that have not arrived look dispensable.
  it("counts what is on order towards the reorder decision but not cover", () => {
    const thin = [batch({ qty: 5 })];
    const alone = stockPositions([line()], thin, [])[0];
    const covered = stockPositions([line()], thin, [order({ lines: [{ drugId: "panadol", packs: 200, receivedPacks: null }] })])[0];
    expect(alone.needsOrdering).toBe(true);
    expect(covered.needsOrdering).toBe(false);
    expect(covered.weeksOfCover).toBe(alone.weeksOfCover);
  });

  it("ignores an order that already arrived", () => {
    const [pos] = stockPositions(
      [line()], [batch({ qty: 5 })], [order({ status: "delivered" })]);
    expect(pos.onOrder).toBe(0);
  });

  it("classifies the lines worth managing closely", () => {
    const positions = stockPositions([
      line({ drugId: "big", baseWeekly: 500 }),
      line({ drugId: "mid", baseWeekly: 60 }),
      line({ drugId: "small", baseWeekly: 1 }),
    ], [], []);
    expect(positions.find((p) => p.line.drugId === "big")!.abc).toBe("A");
    expect(new Set(positions.map((p) => p.abc)).size).toBeGreaterThan(1);
  });

  it("says a line with no demand has no meaningful cover", () => {
    const [pos] = stockPositions([line({ baseWeekly: 0 })], [batch()], []);
    expect(Number.isFinite(pos.weeksOfCover)).toBe(false);
    expect(coverLabel(pos.weeksOfCover)).toBe("no demand");
  });
});

describe("stock near the end of its life", () => {
  const names = new Map([["panadol", "Panadol"]]);

  it("lists the soonest first with what is at risk", () => {
    const out = expiringSoon([
      batch({ batchNo: "LATER", expiresPeriod: 14 }),
      batch({ batchNo: "SOON", expiresPeriod: 11, qty: 10 }),
    ], names, 10, 6);
    expect(out.map((e) => e.batch.batchNo)).toEqual(["SOON", "LATER"]);
    expect(out[0].inWeeks).toBe(1);
    expect(out[0].valueAtRisk).toBe(10 * 96 * RUPEE);
  });

  // Expired stock on the shelf is an inspection finding. Filtering it out of
  // the list meant to warn the learner would hide the worst case.
  it("keeps stock that has already expired, and says so", () => {
    const [worst] = expiringSoon([batch({ expiresPeriod: 8 })], names, 10);
    expect(worst.inWeeks).toBe(-2);
  });

  it("leaves healthy stock out of it", () => {
    expect(expiringSoon([batch({ expiresPeriod: 99 })], names, 10)).toEqual([]);
  });
});

describe("the week's briefing", () => {
  it("shows what the invoices leave behind", () => {
    const out = briefing(5, 100_000 * RUPEE, [], [order({ paymentDuePeriod: 5 })], []);
    expect(out.paymentsDue).toBe(10_000 * RUPEE);
    expect(out.cashAfterCommitments).toBe(90_000 * RUPEE);
  });

  it("does not count an invoice that is not due yet", () => {
    const out = briefing(5, 100_000 * RUPEE, [], [order({ paymentDuePeriod: 9 })], []);
    expect(out.paymentsDue).toBe(0);
  });

  it("counts the orders landing this week", () => {
    const out = briefing(5, 0, [], [order({ etaPeriod: 5 }), order({ id: "o2", etaPeriod: 8 })], []);
    expect(out.arriving.map((o) => o.id)).toEqual(["o1"]);
  });

  it("totals the stock at risk", () => {
    const positions = stockPositions([line()], [batch({ qty: 5 })], []);
    const expiring = expiringSoon([batch({ qty: 5, expiresPeriod: 12 })], new Map(), 10);
    const out = briefing(10, 0, positions, [], expiring);
    expect(out.linesBelowReorder).toBe(1);
    expect(out.valueAtRisk).toBe(5 * 96 * RUPEE);
    expect(out.stockValue).toBe(5 * 96 * RUPEE);
  });
});

describe("how long the money lasts", () => {
  // "Infinite runway" is a number that invites a learner to stop reading.
  it("says nothing when the pharmacy is not losing money", () => {
    expect(cashRunwayWeeks(100_000 * RUPEE, [
      period({ periodNo: 1, openingCash: 100_000 * RUPEE, closingCash: 105_000 * RUPEE }),
      period({ periodNo: 2, openingCash: 105_000 * RUPEE, closingCash: 110_000 * RUPEE }),
    ])).toBeNull();
  });

  it("counts the weeks left at the recent rate of loss", () => {
    const runway = cashRunwayWeeks(40_000 * RUPEE, [
      period({ periodNo: 1, openingCash: 60_000 * RUPEE, closingCash: 50_000 * RUPEE }),
      period({ periodNo: 2, openingCash: 50_000 * RUPEE, closingCash: 40_000 * RUPEE }),
    ]);
    expect(runway).toBe(4);
  });

  // One week is not a trend, and a facility that has only just opened has no
  // rate of loss to extrapolate from.
  it("will not extrapolate from a single week", () => {
    expect(cashRunwayWeeks(10_000 * RUPEE, [period()])).toBeNull();
    expect(cashRunwayWeeks(10_000 * RUPEE, [])).toBeNull();
  });
});

describe("the month so far", () => {
  it("adds up the last four closed weeks", () => {
    const month = monthToDate([
      period({ periodNo: 1, revenue: 10_000 * RUPEE, cogs: 8_000 * RUPEE, demanded: 100, sold: 90 }),
      period({ periodNo: 2, revenue: 20_000 * RUPEE, cogs: 16_000 * RUPEE, demanded: 100, sold: 100 }),
    ]);
    expect(month.weeks).toBe(2);
    expect(month.revenue).toBe(30_000 * RUPEE);
    expect(month.grossMargin).toBe(6_000 * RUPEE);
    expect(month.grossMarginPercent).toBeCloseTo(20, 5);
    expect(month.serviceLevel).toBeCloseTo(95, 5);
  });

  it("stops at four weeks however long the run has been", () => {
    const weeks = Array.from({ length: 9 }, (_, i) => period({ periodNo: i + 1 }));
    expect(monthToDate(weeks).weeks).toBe(4);
  });

  it("reads a pharmacy that has never opened as perfect rather than broken", () => {
    const month = monthToDate([]);
    expect(month.serviceLevel).toBe(100);
    expect(month.grossMarginPercent).toBe(0);
  });
});

describe("labels", () => {
  it("says days when weeks would read as zero", () => {
    expect(coverLabel(0.4)).toBe("3 days");
    expect(coverLabel(3.24)).toBe("3.2 weeks");
    expect(coverLabel(80)).toBe("over a year");
  });

  it("shows a dash rather than Rs 0 for a figure that does not exist", () => {
    expect(money(null)).toBe("-");
    expect(money(0)).toBe("Rs 0");
  });
});
