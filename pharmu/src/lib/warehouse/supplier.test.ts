import { describe, expect, it } from "vitest";
import { orderAnalysis, SUPPLIER_BREAKS, PAYMENT_TERMS_WEEKS } from "./supplier";
import { RUPEE, type PricedDrug } from "./economics";

const panadol: PricedDrug = { drugId: "panadol", mrp: 120 * RUPEE, tradePrice: 100 * RUPEE };
const amox: PricedDrug = { drugId: "amox", mrp: 300 * RUPEE, tradePrice: 200 * RUPEE };

describe("the distributor's terms", () => {
  it("gives more away the more you buy, and gives you time to pay", () => {
    const rising = SUPPLIER_BREAKS.map((b) => b.discountPercent);
    expect([...rising].sort((a, b) => a - b)).toEqual(rising);
    expect(PAYMENT_TERMS_WEEKS).toBeGreaterThan(1);
  });
});

describe("costing an order", () => {
  it("charges list price for an order too small to earn anything", () => {
    const out = orderAnalysis([{ drug: panadol, packs: 10 }]);
    expect(out.total).toBe(1_000 * RUPEE);
    expect(out.discountPercent).toBe(0);
    expect(out.saved).toBe(0);
  });

  it("earns the break the whole order qualifies for", () => {
    const out = orderAnalysis([{ drug: panadol, packs: 50 }]);
    expect(out.discountPercent).toBe(3);
    expect(out.total).toBe(97 * RUPEE * 50);
    expect(out.saved).toBe(3 * RUPEE * 50);
  });

  // A wholesaler invoices the order, not the line. The learner who
  // consolidates four small orders into one gets the break, and the whole
  // point is that they find that out.
  it("counts packs across every line, not one line at a time", () => {
    const split = orderAnalysis([{ drug: panadol, packs: 30 }]);
    const together = orderAnalysis([
      { drug: panadol, packs: 30 },
      { drug: amox, packs: 25 },
    ]);
    expect(split.discountPercent).toBe(0);
    expect(together.discountPercent).toBe(3);
    expect(together.packs).toBe(55);
  });

  it("takes the best break, not the first", () => {
    expect(orderAnalysis([{ drug: panadol, packs: 500 }]).discountPercent).toBe(10);
  });
});

describe("the next break", () => {
  it("says how many more packs it takes and what it is worth", () => {
    const out = orderAnalysis([{ drug: panadol, packs: 40 }]);
    expect(out.nextBreak?.minPacks).toBe(50);
    expect(out.nextBreak?.morePacks).toBe(10);
    expect(out.nextBreak?.discountPercent).toBe(3);
    // Three percent off what they are already buying, not off the bigger order.
    expect(out.nextBreak?.wouldSave).toBe(3 * RUPEE * 40);
  });

  it("has nothing left to offer at the top break", () => {
    expect(orderAnalysis([{ drug: panadol, packs: 400 }]).nextBreak).toBeNull();
  });

  it("says nothing at all about an empty order", () => {
    const out = orderAnalysis([]);
    expect(out.packs).toBe(0);
    expect(out.total).toBe(0);
    expect(out.nextBreak).toBeNull();
  });

  it("ignores a line the learner zeroed out", () => {
    const out = orderAnalysis([{ drug: panadol, packs: 60 }, { drug: amox, packs: 0 }]);
    expect(out.packs).toBe(60);
    expect(out.total).toBe(97 * RUPEE * 60);
  });
});
