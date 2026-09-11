import { describe, expect, it } from "vitest";
import {
  RUPEE, formatPKR, unitMargin, marginPercent, lawfulSalePrice,
  reorderPoint, pricePerPack, orderCost, abcClassify,
  weeklyDemand, expectedDemand, forecastWeekly,
  fulfilFEFO, expireStock, spoilMisstored, periodKPIs,
  type StockBatch, type PricedDrug,
} from "./economics";

const panadol: PricedDrug = { drugId: "panadol", mrp: 120 * RUPEE, tradePrice: 96 * RUPEE };

function batch(over: Partial<StockBatch> = {}): StockBatch {
  return {
    drugId: "panadol", batchNo: "B1", qty: 10, expiresPeriod: 99,
    unitCost: 96 * RUPEE, location: "ambient", ...over,
  };
}

describe("money", () => {
  // Held in paisa so repeated arithmetic cannot drift a rupee.
  it("formats rupees the way a label reads", () => {
    expect(formatPKR(1240 * RUPEE)).toBe("Rs 1,240");
    expect(formatPKR(0)).toBe("Rs 0");
  });
});

describe("margin under a fixed MRP", () => {
  it("is the gap between the printed price and what you paid", () => {
    expect(unitMargin(panadol)).toBe(24 * RUPEE);
    expect(marginPercent(panadol)).toBeCloseTo(20, 5);
  });

  // Buying above MRP is a real mistake and should read as a loss, not a zero.
  it("reports a negative margin rather than hiding it", () => {
    const bad: PricedDrug = { drugId: "x", mrp: 100 * RUPEE, tradePrice: 130 * RUPEE };
    expect(unitMargin(bad)).toBe(-30 * RUPEE);
    expect(marginPercent(bad)).toBeLessThan(0);
  });

  // DRAP fixes the MRP and it is printed on the pack: selling above it is
  // illegal, so the simulation must not permit it even by accident.
  it("never lets a sale exceed the printed MRP", () => {
    expect(lawfulSalePrice(panadol, 200 * RUPEE)).toBe(120 * RUPEE);
    expect(lawfulSalePrice(panadol, 90 * RUPEE)).toBe(90 * RUPEE);
    expect(lawfulSalePrice(panadol, -5)).toBe(0);
  });
});

describe("ordering", () => {
  it("covers the lead time plus a safety buffer", () => {
    expect(reorderPoint(40, 2, 1)).toBe(120);
    expect(reorderPoint(0, 2, 1)).toBe(0);
  });

  // A NaN reorder point compares false against everything, so the line would
  // silently never be worth ordering and the shelf would empty with the screen
  // insisting nothing was wrong.
  it("never returns a figure that is not a number", () => {
    expect(reorderPoint(Number.NaN, 2, 1)).toBe(0);
    expect(reorderPoint(40, Number.NaN, 1)).toBe(40);
    expect(reorderPoint(40, 2, Number.NaN)).toBe(80);
    expect(reorderPoint(-5, 2, 1)).toBe(0);
  });

  it("takes the best volume break the order qualifies for", () => {
    const breaks = [{ minPacks: 50, discountPercent: 5 }, { minPacks: 200, discountPercent: 12 }];
    expect(pricePerPack(panadol, 10, breaks)).toBe(96 * RUPEE);
    expect(pricePerPack(panadol, 50, breaks)).toBe(Math.round(96 * RUPEE * 0.95));
    expect(pricePerPack(panadol, 500, breaks)).toBe(Math.round(96 * RUPEE * 0.88));
  });

  it("costs an order at the price the quantity earns", () => {
    const breaks = [{ minPacks: 100, discountPercent: 10 }];
    expect(orderCost(panadol, 100, breaks)).toBe(Math.round(96 * RUPEE * 0.9) * 100);
  });

  // The analysis that tells a learner which twenty of two hundred medicines
  // are worth their attention.
  it("puts the money, not the units, in class A", () => {
    const classes = abcClassify([
      { drugId: "insulin", annualValue: 800 * RUPEE },
      { drugId: "amox", annualValue: 150 * RUPEE },
      { drugId: "gauze", annualValue: 50 * RUPEE },
    ]);
    expect(classes.insulin).toBe("A");
    expect(classes.amox).toBe("B");
    expect(classes.gauze).toBe("C");
  });

  it("does not fall over on an empty or valueless catalogue", () => {
    expect(abcClassify([])).toEqual({});
    expect(abcClassify([{ drugId: "a", annualValue: 0 }])).toEqual({ a: "C" });
  });
});

describe("demand", () => {
  // A learner must be able to replay a week and get the same week.
  it("is deterministic for the same seed", () => {
    const profile = { drugId: "amox", baseWeekly: 40, seasonality: 0.4, peakWeek: 3 };
    expect(weeklyDemand(profile, 10, "run-1")).toBe(weeklyDemand(profile, 10, "run-1"));
  });

  it("swings across the year when a medicine is seasonal", () => {
    const profile = { drugId: "amox", baseWeekly: 100, seasonality: 0.5, peakWeek: 1 };
    const peak = weeklyDemand(profile, 1, "s");
    const trough = weeklyDemand(profile, 27, "s");
    expect(peak).toBeGreaterThan(trough);
  });

  it("stays flat when it is not", () => {
    const profile = { drugId: "para", baseWeekly: 100, seasonality: 0, peakWeek: 1 };
    for (const week of [1, 14, 27, 40]) {
      expect(weeklyDemand(profile, week, "s")).toBeGreaterThan(70);
      expect(weeklyDemand(profile, week, "s")).toBeLessThan(130);
    }
  });
});

describe("fulfilment is first-expiry-first-out", () => {
  it("ships the stock that dies soonest", () => {
    const stock = [
      batch({ batchNo: "FRESH", expiresPeriod: 40, qty: 10 }),
      batch({ batchNo: "OLD", expiresPeriod: 12, qty: 6 }),
    ];
    const out = fulfilFEFO(stock, 6);
    expect(out.sold).toBe(6);
    expect(out.drawnFrom).toEqual(["OLD"]);
    expect(out.remaining.find((b) => b.batchNo === "FRESH")?.qty).toBe(10);
    expect(out.remaining.find((b) => b.batchNo === "OLD")).toBeUndefined();
  });

  it("reports what it could not serve rather than overselling", () => {
    const out = fulfilFEFO([batch({ qty: 4 })], 10);
    expect(out.sold).toBe(4);
    expect(out.short).toBe(6);
  });

  // Quarantine exists to make stock unavailable. A recall that still shipped
  // would be worse than no recall at all.
  it("will not ship quarantined stock", () => {
    const stock = [
      batch({ batchNo: "HELD", location: "quarantine", qty: 50, expiresPeriod: 5 }),
      batch({ batchNo: "GOOD", qty: 3, expiresPeriod: 40 }),
    ];
    const out = fulfilFEFO(stock, 10);
    expect(out.sold).toBe(3);
    expect(out.short).toBe(7);
    expect(out.remaining.find((b) => b.batchNo === "HELD")?.qty).toBe(50);
  });

  it("charges cost of goods from the batches it actually drew", () => {
    const out = fulfilFEFO([batch({ qty: 5, unitCost: 90 * RUPEE })], 5);
    expect(out.cogs).toBe(5 * 90 * RUPEE);
  });
});

describe("period close", () => {
  it("writes off stock that has run out of life and charges it", () => {
    const stock = [
      batch({ batchNo: "DEAD", expiresPeriod: 6, qty: 4, unitCost: 100 * RUPEE }),
      batch({ batchNo: "LIVE", expiresPeriod: 20, qty: 2 }),
    ];
    const out = expireStock(stock, 6);
    expect(out.kept.map((b) => b.batchNo)).toEqual(["LIVE"]);
    expect(out.wastage).toBe(400 * RUPEE);
    expect(out.writeOffs[0]).toEqual({ batchNo: "DEAD", qty: 4, value: 400 * RUPEE });
  });

  it("reports the week in the terms a pharmacy is judged on", () => {
    const kpis = periodKPIs({
      revenue: 10_000 * RUPEE,
      cogs: 8_000 * RUPEE,
      wastage: 500 * RUPEE,
      demanded: 100,
      sold: 90,
      openingCash: 50_000 * RUPEE,
      purchases: 9_000 * RUPEE,
      overheads: 1_000 * RUPEE,
    });
    expect(kpis.grossMargin).toBe(2_000 * RUPEE);
    expect(kpis.grossMarginPercent).toBeCloseTo(20, 5);
    expect(kpis.serviceLevel).toBe(90);
    expect(kpis.wastagePercent).toBeCloseTo(5, 5);
    expect(kpis.closingCash).toBe(50_000 * RUPEE);
  });

  it("calls service level perfect when nobody asked for anything", () => {
    const kpis = periodKPIs({
      revenue: 0, cogs: 0, wastage: 0, demanded: 0, sold: 0,
      openingCash: 0, purchases: 0, overheads: 0,
    });
    expect(kpis.serviceLevel).toBe(100);
    expect(kpis.grossMarginPercent).toBe(0);
  });
});

describe("stock kept in the wrong place", () => {
  const COLD = { insulin: "cold-chain" } as const;
  const insulin = (over: Partial<StockBatch> = {}) =>
    batch({ drugId: "insulin", batchNo: "COLD1", ...over });

  // A vaccine that spent the week on an ambient shelf is gone. Saying
  // otherwise would teach a learner that the fridge is a filing preference.
  it("destroys cold chain left out of the fridge", () => {
    const out = spoilMisstored([insulin({ location: "ambient" })], COLD);
    expect(out.kept).toHaveLength(0);
    expect(out.writeOffs[0].batchNo).toBe("COLD1");
    expect(out.wastage).toBe(10 * 96 * RUPEE);
  });

  it("leaves cold chain that is in the fridge alone", () => {
    const out = spoilMisstored([insulin({ location: "cold-chain" })], COLD);
    expect(out.kept).toHaveLength(1);
    expect(out.wastage).toBe(0);
  });

  // Goods-in and recalled stock both sit in quarantine. Charging for that
  // would punish the learner for the one thing quarantine exists to do.
  it("does not touch cold chain sitting in quarantine", () => {
    const out = spoilMisstored([insulin({ location: "quarantine" })], COLD);
    expect(out.kept).toHaveLength(1);
    expect(out.wastage).toBe(0);
  });

  // A tablet on the wrong shelf is an untidy warehouse, not destroyed stock.
  it("does not destroy an ambient medicine put somewhere odd", () => {
    const out = spoilMisstored([batch({ location: "flammables" })], { panadol: "ambient" });
    expect(out.kept).toHaveLength(1);
    expect(out.wastage).toBe(0);
  });

  it("ignores a medicine with no storage rule recorded", () => {
    const out = spoilMisstored([insulin({ location: "ambient" })], {});
    expect(out.kept).toHaveLength(1);
  });
});

describe("what a buyer can forecast", () => {
  const winter = { drugId: "amox", baseWeekly: 40, seasonality: 0.5, peakWeek: 4 };

  // The forecast is the curve without the noise. Planning against a flat
  // average empties the shelf every year at the exact moment it should not.
  it("follows the season and leaves the weekly wobble out", () => {
    expect(expectedDemand(winter, 4)).toBeCloseTo(60, 5);
    expect(expectedDemand(winter, 30)).toBeCloseTo(20, 5);
    expect(expectedDemand(winter, 4)).toBe(expectedDemand(winter, 4));
  });

  it("averages across the weeks an order has to cover", () => {
    const across = forecastWeekly(winter, 4, 4);
    expect(across).toBeLessThan(expectedDemand(winter, 4));
    expect(across).toBeGreaterThan(expectedDemand(winter, 30));
  });

  it("is the centre the actual week wobbles around", () => {
    const samples = Array.from({ length: 40 }, (_, i) => weeklyDemand(winter, 4, `s${i}`));
    const mean = samples.reduce((n, v) => n + v, 0) / samples.length;
    expect(mean).toBeGreaterThan(expectedDemand(winter, 4) * 0.9);
    expect(mean).toBeLessThan(expectedDemand(winter, 4) * 1.1);
  });

  it("treats a profile with nothing in it as no demand", () => {
    const empty = { drugId: "x", baseWeekly: Number.NaN, seasonality: Number.NaN, peakWeek: Number.NaN };
    expect(expectedDemand(empty, 5)).toBe(0);
    expect(forecastWeekly(empty, 5, 3)).toBe(0);
  });
});
