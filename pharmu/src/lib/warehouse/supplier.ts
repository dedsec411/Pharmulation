/**
 * The distributor you buy from.
 *
 * These terms have to be the same on both sides of the wire: the screen shows
 * a learner what an order will cost and what a bigger one would save, and the
 * server charges them for it. Two copies of the same numbers would eventually
 * disagree, and the learner would be the one who found out.
 *
 * The shape is the one wholesalers here actually work to - a percentage off
 * trade price once the order crosses a pack count, and thirty days to pay.
 * Both exist to pull the learner in the same direction: order more than you
 * need, because it is cheaper and you do not pay yet.
 */

import { orderCost, pricePerPack, type Paisa, type PricedDrug, type VolumeBreak } from "./economics";

export const SUPPLIER_NAME = "Central Distributors";

/** Bigger orders are cheaper per pack and tie up the cash that buys next week. */
export const SUPPLIER_BREAKS: readonly VolumeBreak[] = [
  { minPacks: 50, discountPercent: 3 },
  { minPacks: 150, discountPercent: 6 },
  { minPacks: 400, discountPercent: 10 },
];

/** Thirty days to pay, which is four of our weeks. */
export const PAYMENT_TERMS_WEEKS = 4;

export type OrderLine = { drug: PricedDrug; packs: number };

export type OrderAnalysis = {
  packs: number;
  /** What this order costs at the discount it has earned. */
  total: Paisa;
  /** What the same order would cost at list. */
  atListPrice: Paisa;
  saved: Paisa;
  discountPercent: number;
  /**
   * The next break, and what reaching it is worth. Null at the top break.
   *
   * Shown rather than acted on: the saving is real, and so is the cash it ties
   * up and the stock that has to sell before it expires. Which of those
   * matters more is the learner's judgement, and handing them the arithmetic is
   * not the same as making the decision for them.
   */
  nextBreak: { minPacks: number; morePacks: number; discountPercent: number; wouldSave: Paisa } | null;
};

/**
 * What an order costs, and what one pack more would.
 *
 * Discounts are earned on the whole order's pack count rather than per line,
 * because that is how a wholesaler invoices: the learner who consolidates four
 * small orders into one gets the break, and finding that out is the point.
 */
export function orderAnalysis(
  lines: readonly OrderLine[],
  breaks: readonly VolumeBreak[] = SUPPLIER_BREAKS,
): OrderAnalysis {
  const packs = lines.reduce((n, l) => n + Math.max(0, l.packs), 0);
  const priced = lines.filter((l) => l.packs > 0);

  const total = priced.reduce((sum, l) => sum + orderCost(l.drug, l.packs, breaks), 0);
  const atListPrice = priced.reduce((sum, l) => sum + l.drug.tradePrice * l.packs, 0);

  const earned = [...breaks]
    .filter((b) => packs >= b.minPacks)
    .sort((a, b) => b.discountPercent - a.discountPercent)[0];

  const next = [...breaks]
    .filter((b) => packs < b.minPacks)
    .sort((a, b) => a.minPacks - b.minPacks)[0];

  let nextBreak: OrderAnalysis["nextBreak"] = null;
  if (next && packs > 0) {
    // What the order as it stands would cost at the better rate. The extra
    // packs cost extra money, so this is the saving on what they are already
    // buying, not a promise that ordering more is free.
    const atNextRate = priced.reduce(
      (sum, l) => sum + pricePerPack(l.drug, next.minPacks, breaks) * l.packs, 0);
    nextBreak = {
      minPacks: next.minPacks,
      morePacks: next.minPacks - packs,
      discountPercent: next.discountPercent,
      wouldSave: Math.max(0, total - atNextRate),
    };
  }

  return {
    packs,
    total,
    atListPrice,
    saved: Math.max(0, atListPrice - total),
    discountPercent: earned?.discountPercent ?? 0,
    nextBreak,
  };
}
