import { describe, expect, it } from "vitest";
import { closeWeek, openWeek, ARRIVES_IN, type WeekInput, type PendingOrder } from "./week";
import { RUPEE, type StockBatch, type PricedDrug, type DemandProfile } from "./economics";

const PANADOL: PricedDrug = { drugId: "panadol", mrp: 120 * RUPEE, tradePrice: 96 * RUPEE };

function stock(over: Partial<StockBatch> = {}): StockBatch {
  return {
    drugId: "panadol", batchNo: "B1", qty: 100, expiresPeriod: 99,
    unitCost: 96 * RUPEE, location: "ambient", ...over,
  };
}

function flatDemand(packs: number): DemandProfile {
  return { drugId: "panadol", baseWeekly: packs, seasonality: 0, peakWeek: 1 };
}

function order(over: Partial<PendingOrder> = {}): PendingOrder {
  return {
    id: "order-1", etaPeriod: 1, paymentDuePeriod: 5, total: 9_600 * RUPEE,
    paid: false, delivered: false,
    lines: [{ drugId: "panadol", packs: 100, unitPrice: 96 * RUPEE, shelfLifeWeeks: 52 }],
    ...over,
  };
}

function week(over: Partial<WeekInput> = {}): WeekInput {
  return {
    facility: { period: 1, cash: 100_000 * RUPEE, overdraft: 0, seed: "test" },
    stock: [],
    orders: [],
    prices: { panadol: PANADOL },
    demand: [],
    overheads: 0,
    ...over,
  };
}

describe("deliveries", () => {
  it("lands stock that has reached its ETA, and nothing that has not", () => {
    const out = closeWeek(week({
      orders: [order({ id: "here", etaPeriod: 1 }), order({ id: "later", etaPeriod: 4 })],
    }));
    expect(out.delivered).toEqual(["here"]);
    expect(out.stock).toHaveLength(1);
    expect(out.stock[0].qty).toBe(100);
  });

  // Goods-in is a decision, not something that happens to you. Arriving stock
  // is quarantined until the learner puts it away, and quarantined stock does
  // not sell - so a learner who never puts anything away finds out why.
  it("quarantines what arrives", () => {
    const out = closeWeek(week({ orders: [order()] }));
    expect(out.stock[0].location).toBe(ARRIVES_IN);
  });

  it("takes a short delivery at what actually turned up", () => {
    const short = order({ lines: [{ drugId: "panadol", packs: 100, unitPrice: 96 * RUPEE, shelfLifeWeeks: 52, receivedPacks: 60 }] });
    const out = closeWeek(week({ orders: [short] }));
    expect(out.stock[0].qty).toBe(60);
  });

  it("dates the batch from its shelf life at delivery", () => {
    const out = closeWeek(week({
      facility: { period: 10, cash: 0, overdraft: 0, seed: "s" },
      orders: [order({ etaPeriod: 10, lines: [{ drugId: "panadol", packs: 5, unitPrice: 1, shelfLifeWeeks: 12 }] })],
    }));
    expect(out.stock[0].expiresPeriod).toBe(22);
  });
});

describe("batch numbers", () => {
  // Everything downstream keys on them: a recall names one, a condemned list
  // is a list of them, and the learner reads them off a shelf.
  it("are unique across the lines of one delivery", () => {
    const out = closeWeek(week({
      orders: [order({
        lines: [
          { drugId: "panadol", packs: 10, unitPrice: 96 * RUPEE, shelfLifeWeeks: 52 },
          { drugId: "panadeine", packs: 10, unitPrice: 96 * RUPEE, shelfLifeWeeks: 52 },
        ],
      })],
    }));
    expect(new Set(out.stock.map((b) => b.batchNo)).size).toBe(2);
  });

  it("are unique across deliveries of the same medicine", () => {
    const out = closeWeek(week({
      orders: [order({ id: "order-a" }), order({ id: "order-b" })],
    }));
    expect(new Set(out.stock.map((b) => b.batchNo)).size).toBe(2);
  });
});

describe("selling", () => {
  it("sells at the printed MRP and charges what the batch cost", () => {
    const out = closeWeek(week({
      stock: [stock({ qty: 10, unitCost: 96 * RUPEE })],
      demand: [flatDemand(10)],
    }));
    const line = out.perDrug[0];
    expect(line.sold).toBeGreaterThan(0);
    expect(line.revenue).toBe(line.sold * 120 * RUPEE);
    expect(out.kpis.cogs).toBe(line.sold * 96 * RUPEE);
  });

  it("cannot sell stock still sitting in quarantine", () => {
    const out = closeWeek(week({
      stock: [stock({ qty: 500, location: "quarantine" })],
      demand: [flatDemand(20)],
    }));
    expect(out.perDrug[0].sold).toBe(0);
    expect(out.perDrug[0].short).toBeGreaterThan(0);
    expect(out.kpis.serviceLevel).toBe(0);
  });

  // A medicine with no price cannot be sold, and saying so keeps the service
  // level honest rather than flattering the learner by ignoring the demand.
  it("counts demand it has no price for as unserved", () => {
    const out = closeWeek(week({
      prices: {},
      demand: [flatDemand(30)],
    }));
    expect(out.perDrug[0].sold).toBe(0);
    expect(out.kpis.serviceLevel).toBe(0);
  });

  it("reports service level as the share of demand actually served", () => {
    const out = closeWeek(week({
      stock: [stock({ qty: 5 })],
      demand: [flatDemand(10)],
    }));
    const line = out.perDrug[0];
    expect(out.kpis.serviceLevel).toBeCloseTo((line.sold / line.demanded) * 100, 5);
  });
});

describe("money", () => {
  it("pays an invoice when it falls due, not when the stock arrived", () => {
    const later = order({ etaPeriod: 1, paymentDuePeriod: 5, total: 9_600 * RUPEE });
    const onArrival = closeWeek(week({ orders: [later] }));
    expect(onArrival.paid).toHaveLength(0);

    const onDue = closeWeek(week({
      facility: { period: 5, cash: 100_000 * RUPEE, overdraft: 0, seed: "t" },
      orders: [{ ...later, delivered: true }],
    }));
    expect(onDue.paid).toEqual([{ orderId: "order-1", amount: 9_600 * RUPEE }]);
  });

  it("takes overheads out whether or not anything sold", () => {
    const out = closeWeek(week({ overheads: 8_000 * RUPEE }));
    expect(out.kpis.closingCash).toBe(92_000 * RUPEE);
  });

  // A budget you cannot overspend teaches nothing about budgets.
  it("declares the facility insolvent once cash passes the overdraft", () => {
    const out = closeWeek(week({
      facility: { period: 5, cash: 1_000 * RUPEE, overdraft: 0, seed: "t" },
      orders: [{ ...order({ paymentDuePeriod: 5, total: 50_000 * RUPEE }), delivered: true }],
    }));
    expect(out.kpis.closingCash).toBeLessThan(0);
    expect(out.insolvent).toBe(true);
  });

  it("stays solvent while the overdraft covers it", () => {
    const out = closeWeek(week({
      facility: { period: 5, cash: 1_000 * RUPEE, overdraft: 60_000 * RUPEE, seed: "t" },
      orders: [{ ...order({ paymentDuePeriod: 5, total: 50_000 * RUPEE }), delivered: true }],
    }));
    expect(out.insolvent).toBe(false);
  });
});

describe("expiry", () => {
  it("destroys stock that reached its date and charges the loss", () => {
    const out = closeWeek(week({
      facility: { period: 8, cash: 10_000 * RUPEE, overdraft: 0, seed: "t" },
      stock: [stock({ batchNo: "DEAD", expiresPeriod: 8, qty: 10, unitCost: 96 * RUPEE })],
    }));
    expect(out.stock).toHaveLength(0);
    expect(out.kpis.wastage).toBe(960 * RUPEE);
    expect(out.writeOffs[0].batchNo).toBe("DEAD");
  });

  // The cash left when the stock was bought. Charging it again at expiry would
  // make a learner pay twice for the same mistake.
  it("does not take cash a second time for stock already paid for", () => {
    const out = closeWeek(week({
      facility: { period: 8, cash: 10_000 * RUPEE, overdraft: 0, seed: "t" },
      stock: [stock({ expiresPeriod: 8, qty: 10 })],
    }));
    expect(out.kpis.closingCash).toBe(10_000 * RUPEE);
    expect(out.kpis.wastage).toBeGreaterThan(0);
  });
});

describe("the same week twice", () => {
  it("gives the same result", () => {
    const w = week({ stock: [stock()], demand: [{ drugId: "panadol", baseWeekly: 40, seasonality: 0.5, peakWeek: 3 }] });
    expect(closeWeek(w).perDrug).toEqual(closeWeek(w).perDrug);
  });

  it("does not mutate what it was given", () => {
    const original = stock({ qty: 100 });
    const w = week({ stock: [original], demand: [flatDemand(10)] });
    closeWeek(w);
    expect(original.qty).toBe(100);
  });
});

describe("the briefing a week opens with", () => {
  it("separates what is sellable from what is still in quarantine", () => {
    const brief = openWeek(week({
      stock: [stock({ qty: 30 }), stock({ batchNo: "Q", qty: 20, location: "quarantine" })],
    }));
    expect(brief.onHand[0]).toEqual({ drugId: "panadol", packs: 50, sellable: 30 });
  });

  it("warns about stock about to die, soonest first", () => {
    const brief = openWeek(week({
      stock: [
        stock({ batchNo: "LATER", expiresPeriod: 4 }),
        stock({ batchNo: "SOON", expiresPeriod: 2 }),
        stock({ batchNo: "FINE", expiresPeriod: 40 }),
      ],
    }));
    expect(brief.expiringSoon.map((e) => e.batchNo)).toEqual(["SOON", "LATER"]);
  });

  it("totals what has to be paid this week", () => {
    const brief = openWeek(week({
      orders: [
        order({ id: "due", paymentDuePeriod: 1, total: 5_000 * RUPEE }),
        order({ id: "later", paymentDuePeriod: 9, total: 7_000 * RUPEE }),
      ],
    }));
    expect(brief.paymentsDue).toBe(5_000 * RUPEE);
  });
});

describe("a week the pharmacy is not allowed to trade", () => {
  const shut = () => closeWeek(week({
    facility: { period: 1, cash: 100_000 * RUPEE, overdraft: 0, seed: "test" },
    stock: [stock()],
    demand: [flatDemand(30)],
    overheads: 5_000 * RUPEE,
    trading: false,
  }));

  // The counter is shut. The rent is not.
  it("sells nothing and still pays the overheads", () => {
    const out = shut();
    expect(out.kpis.revenue).toBe(0);
    expect(out.kpis.closingCash).toBe(95_000 * RUPEE);
  });

  it("counts the demand it turned away rather than pretending it never came", () => {
    const out = shut();
    // Demand carries a seeded weekly wobble, so what matters is that every
    // pack of it went unserved rather than the exact number.
    expect(out.perDrug[0].demanded).toBeGreaterThan(0);
    expect(out.perDrug[0].short).toBe(out.perDrug[0].demanded);
    expect(out.kpis.serviceLevel).toBe(0);
  });

  it("leaves the stock on the shelf", () => {
    expect(shut().stock[0].qty).toBe(100);
  });

  it("says why in the ledger", () => {
    expect(shut().ledger.some((e) => e.note.includes("not licensed"))).toBe(true);
  });
});

describe("stock kept in the wrong place", () => {
  const cold = stock({ drugId: "insulin", batchNo: "COLD1", location: "ambient" });

  it("is written off, and charged as wastage", () => {
    const out = closeWeek(week({
      stock: [cold],
      requiredZone: { insulin: "cold-chain" },
    }));
    expect(out.spoiled[0].batchNo).toBe("COLD1");
    expect(out.stock).toHaveLength(0);
    expect(out.kpis.wastage).toBe(100 * 96 * RUPEE);
  });

  // Ruined before the counter opens: it was never fit to dispense.
  it("cannot be sold in the week it was ruined", () => {
    const out = closeWeek(week({
      stock: [cold],
      prices: { insulin: { drugId: "insulin", mrp: 120 * RUPEE, tradePrice: 96 * RUPEE } },
      demand: [{ drugId: "insulin", baseWeekly: 20, seasonality: 0, peakWeek: 1 }],
      requiredZone: { insulin: "cold-chain" },
    }));
    expect(out.kpis.revenue).toBe(0);
    expect(out.perDrug[0].short).toBe(out.perDrug[0].demanded);
  });

  it("survives a delivery that has not been put away yet", () => {
    const out = closeWeek(week({
      orders: [order({ lines: [{ drugId: "insulin", packs: 40, unitPrice: 96 * RUPEE, shelfLifeWeeks: 30 }] })],
      requiredZone: { insulin: "cold-chain" },
    }));
    expect(out.spoiled).toHaveLength(0);
    expect(out.stock[0].location).toBe(ARRIVES_IN);
  });
});

describe("fines and fees", () => {
  it("takes them out of the cash and names them in the ledger", () => {
    const out = closeWeek(week({
      charges: [{ kind: "penalty", amount: 30_000 * RUPEE, note: "Expired stock not separated" }],
    }));
    expect(out.kpis.closingCash).toBe(70_000 * RUPEE);
    const entry = out.ledger.find((e) => e.kind === "penalty");
    expect(entry?.amount).toBe(-30_000 * RUPEE);
    expect(entry?.note).toBe("Expired stock not separated");
  });

  // A fine large enough to clear the account ends the run, like any other
  // cash that leaves and does not come back.
  it("can finish a pharmacy that could not afford one", () => {
    const out = closeWeek(week({
      facility: { period: 1, cash: 10_000 * RUPEE, overdraft: 0, seed: "test" },
      charges: [{ kind: "penalty", amount: 75_000 * RUPEE, note: "Controlled medicines held without a permit" }],
    }));
    expect(out.insolvent).toBe(true);
  });

  // A licence fee and a fine both leave the account, but a learner reading the
  // ledger should be able to tell which of the two it was.
  it("keeps a licence fee apart from a fine", () => {
    const out = closeWeek(week({
      charges: [
        { kind: "licence", amount: 15_000 * RUPEE, note: "Drug Sale Licence renewal" },
        { kind: "penalty", amount: 10_000 * RUPEE, note: "No fridge temperature log" },
      ],
    }));
    expect(out.kpis.closingCash).toBe(75_000 * RUPEE);
    expect(out.ledger.find((e) => e.kind === "licence")?.amount).toBe(-15_000 * RUPEE);
    expect(out.ledger.find((e) => e.kind === "penalty")?.amount).toBe(-10_000 * RUPEE);
  });
});

describe("stock condemned outside the week", () => {
  const condemn = (over = {}) => closeWeek(week({
    stock: [stock({ batchNo: "PULLED" }), stock({ batchNo: "FINE" })],
    demand: [flatDemand(20)],
    condemned: ["PULLED"],
    ...over,
  }));

  it("writes it off and charges the value as wastage", () => {
    const out = condemn();
    expect(out.condemned[0].batchNo).toBe("PULLED");
    expect(out.kpis.wastage).toBe(100 * 96 * RUPEE);
    expect(out.stock.some((b) => b.batchNo === "PULLED")).toBe(false);
  });

  // A recalled batch is off sale from the moment the notice is honoured.
  it("cannot be dispensed in the week it was withdrawn", () => {
    const out = condemn();
    expect(out.perDrug[0].revenue).toBe(out.perDrug[0].sold * 120 * RUPEE);
    expect(out.stock.find((b) => b.batchNo === "FINE")!.qty).toBeLessThan(100);
  });

  it("leaves every other batch alone", () => {
    expect(condemn().stock.some((b) => b.batchNo === "FINE")).toBe(true);
  });

  it("ignores a batch number the pharmacy no longer holds", () => {
    const out = closeWeek(week({ stock: [stock()], condemned: ["GONE"] }));
    expect(out.condemned).toHaveLength(0);
    expect(out.stock).toHaveLength(1);
  });
});
