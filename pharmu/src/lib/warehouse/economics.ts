/**
 * The economics a Pakistani pharmacy warehouse actually runs on.
 *
 * Everything here is pure: no database, no clock, no randomness that is not
 * seeded. The simulation has to be reproducible, because a learner who orders
 * the same quantities in the same week must get the same outcome, and because
 * an educator marking the result has to be able to check it.
 *
 * The one fact that shapes all of it: DRAP fixes the Maximum Retail Price and
 * it is printed on the pack. A pharmacy cannot legally sell above it. So the
 * selling price is a ceiling handed to you, not a lever you pull, and the only
 * ways to make money are to buy well, to not let stock expire, and to keep it
 * moving. That is the whole lesson of the mode, and it falls out of the
 * arithmetic rather than being asserted at the learner.
 */

/** Money is held in paisa - integers - so a rupee never drifts. */
export type Paisa = number;

export const RUPEE: Paisa = 100;

export function rupees(value: Paisa): number {
  return value / RUPEE;
}

/** "Rs 1,240" - what a label or a report shows. */
export function formatPKR(value: Paisa): string {
  const whole = Math.round(value / RUPEE);
  return `Rs ${whole.toLocaleString("en-PK")}`;
}

export type StockBatch = {
  drugId: string;
  batchNo: string;
  /** Packs on hand. */
  qty: number;
  /** Period number this batch expires at the end of. */
  expiresPeriod: number;
  /** What this batch cost per pack, for cost of goods and for write-offs. */
  unitCost: Paisa;
  location: StorageZone;
};

export type StorageZone =
  | "ambient"
  | "cold-chain"
  | "cd-safe"
  | "flammables"
  | "quarantine";

/**
 * Where a medicine is allowed to live.
 *
 * Not a preference: a vaccine in ambient storage is destroyed stock, and a
 * controlled drug outside the safe is a licence problem, not a tidiness one.
 */
export type StorageRequirement = {
  zone: StorageZone;
  reason: string;
};

export type DemandProfile = {
  drugId: string;
  /** Packs a typical week sells before any seasonal swing. */
  baseWeekly: number;
  /** 0 = flat all year. 0.4 = swings 40% either side across the year. */
  seasonality: number;
  /** Week of the year the peak lands on, 1-52. */
  peakWeek: number;
};

export type PricedDrug = {
  drugId: string;
  /** DRAP-fixed ceiling. The most this may be sold for. */
  mrp: Paisa;
  /** What a distributor charges you per pack, before volume breaks. */
  tradePrice: Paisa;
};

/* ------------------------------------------------------------------ *
 * Margin
 * ------------------------------------------------------------------ */

/**
 * What a pack earns if it sells. Negative is possible and is worth showing:
 * buying above MRP happens, and a learner should see it as a loss rather than
 * have it quietly clamped to zero.
 */
export function unitMargin(drug: PricedDrug): Paisa {
  return drug.mrp - drug.tradePrice;
}

/** Margin as a percentage of the selling price, which is how retail talks. */
export function marginPercent(drug: PricedDrug): number {
  if (drug.mrp <= 0) return 0;
  return (unitMargin(drug) / drug.mrp) * 100;
}

/**
 * A sale may never exceed the printed MRP.
 *
 * Enforced here rather than trusted to the caller: this is the one price rule
 * that is law, and a mode about running a pharmacy legally should not be able
 * to break it by accident.
 */
export function lawfulSalePrice(drug: PricedDrug, asked: Paisa): Paisa {
  return Math.max(0, Math.min(asked, drug.mrp));
}

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

/**
 * The stock level at which an order has to be placed to avoid running out.
 *
 * Demand over the lead time, plus a buffer for the weeks it comes in higher
 * than average. Ordering at this level is the difference between a shelf that
 * is always stocked and one that is always nearly empty.
 */
export function reorderPoint(
  weeklyDemand: number, leadTimeWeeks: number, safetyWeeks: number,
): number {
  const cover = Math.max(0, leadTimeWeeks) + Math.max(0, safetyWeeks);
  return Math.ceil(Math.max(0, weeklyDemand) * cover);
}

/**
 * Volume breaks, as distributors here actually give them: a percentage off the
 * trade price once an order crosses a pack threshold.
 */
export type VolumeBreak = { minPacks: number; discountPercent: number };

export function pricePerPack(
  drug: PricedDrug, packs: number, breaks: readonly VolumeBreak[],
): Paisa {
  const best = [...breaks]
    .filter((b) => packs >= b.minPacks)
    .sort((a, b) => b.discountPercent - a.discountPercent)[0];
  if (!best) return drug.tradePrice;
  return Math.round(drug.tradePrice * (1 - best.discountPercent / 100));
}

export function orderCost(
  drug: PricedDrug, packs: number, breaks: readonly VolumeBreak[],
): Paisa {
  return pricePerPack(drug, packs, breaks) * Math.max(0, packs);
}

/**
 * ABC classification by the money a line represents, not the units.
 *
 * A is the top 80% of value, B the next 15%, C the rest. It is what tells a
 * learner which twenty medicines deserve their attention out of two hundred,
 * and it is the analysis the mode is named after.
 */
export function abcClassify(
  lines: readonly { drugId: string; annualValue: Paisa }[],
): Record<string, "A" | "B" | "C"> {
  const sorted = [...lines].sort((a, b) => b.annualValue - a.annualValue);
  const total = sorted.reduce((sum, l) => sum + Math.max(0, l.annualValue), 0);
  const out: Record<string, "A" | "B" | "C"> = {};
  if (total <= 0) {
    for (const line of sorted) out[line.drugId] = "C";
    return out;
  }
  // Judged on the value that came BEFORE each line, so the line that carries
  // the catalogue past 80% is still in class A. Measuring after it instead
  // would let a pharmacy whose single biggest earner is 90% of the business
  // come back with no class A line at all, which is the opposite of what the
  // analysis is for.
  let running = 0;
  for (const line of sorted) {
    const before = running / total;
    out[line.drugId] = before < 0.8 ? "A" : before < 0.95 ? "B" : "C";
    running += Math.max(0, line.annualValue);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Demand
 * ------------------------------------------------------------------ */

/** Deterministic noise in [0,1) from a seed, so a week always replays. */
function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

/**
 * What a week actually asks for.
 *
 * A seasonal curve around the base, plus a modest weekly wobble. Antibiotics
 * peak in winter, antihistamines in spring, and a learner who orders a flat
 * quantity all year will feel both ends of that.
 */
export function weeklyDemand(profile: DemandProfile, week: number, seed = ""): number {
  const phase = ((week - profile.peakWeek) / 52) * Math.PI * 2;
  const seasonal = 1 + profile.seasonality * Math.cos(phase);
  const wobble = 0.85 + seededUnit(`${seed}:${profile.drugId}:${week}`) * 0.3;
  return Math.max(0, Math.round(profile.baseWeekly * seasonal * wobble));
}

/* ------------------------------------------------------------------ *
 * Fulfilment
 * ------------------------------------------------------------------ */

export type FulfilResult = {
  sold: number;
  short: number;
  cogs: Paisa;
  /** Batches after the draw-down, emptied ones removed. */
  remaining: StockBatch[];
  /** Batch numbers touched, for the audit trail. */
  drawnFrom: string[];
};

/**
 * Serve a week's demand from stock, first-expiry-first-out.
 *
 * FEFO rather than FIFO: what matters is what expires soonest, not what
 * arrived soonest, and a learner who ships the fresh stock first will watch
 * the old stock expire on the shelf and pay for it at period close.
 *
 * Quarantined stock is not available. That is the point of quarantine.
 */
export function fulfilFEFO(batches: readonly StockBatch[], demand: number): FulfilResult {
  const available = batches
    .filter((b) => b.location !== "quarantine" && b.qty > 0)
    .sort((a, b) => a.expiresPeriod - b.expiresPeriod || a.batchNo.localeCompare(b.batchNo));
  const held = batches.filter((b) => b.location === "quarantine" || b.qty <= 0);

  let want = Math.max(0, Math.round(demand));
  let cogs = 0;
  const drawnFrom: string[] = [];
  const after: StockBatch[] = [];

  for (const batch of available) {
    if (want <= 0) { after.push(batch); continue; }
    const take = Math.min(batch.qty, want);
    if (take > 0) {
      want -= take;
      cogs += take * batch.unitCost;
      drawnFrom.push(batch.batchNo);
    }
    const left = batch.qty - take;
    if (left > 0) after.push({ ...batch, qty: left });
  }

  const sold = Math.max(0, Math.round(demand)) - want;
  return { sold, short: want, cogs, remaining: [...after, ...held], drawnFrom };
}

/* ------------------------------------------------------------------ *
 * Period close
 * ------------------------------------------------------------------ */

export type ExpiredWriteOff = { batchNo: string; qty: number; value: Paisa };

/**
 * Stock that has run out of life, and what losing it cost.
 *
 * Expired stock is not merely unsellable - under DRAP it has to be separated,
 * recorded and destroyed, so it is removed from the shelf here and its value
 * is charged against the period rather than quietly vanishing.
 */
export function expireStock(
  batches: readonly StockBatch[], period: number,
): { kept: StockBatch[]; writeOffs: ExpiredWriteOff[]; wastage: Paisa } {
  const kept: StockBatch[] = [];
  const writeOffs: ExpiredWriteOff[] = [];
  let wastage = 0;
  for (const batch of batches) {
    if (batch.expiresPeriod <= period && batch.qty > 0) {
      const value = batch.qty * batch.unitCost;
      writeOffs.push({ batchNo: batch.batchNo, qty: batch.qty, value });
      wastage += value;
    } else {
      kept.push(batch);
    }
  }
  return { kept, writeOffs, wastage };
}

/**
 * Stock destroyed by being kept in the wrong place.
 *
 * Only the cold chain is destroyed. A tablet that spent a week on the wrong
 * shelf is a compliance finding and an untidy warehouse; a vaccine that spent
 * a week out of the fridge is gone, and pretending otherwise would teach a
 * learner that the fridge is a filing preference.
 *
 * Quarantine is exempt on purpose. It is where stock that has just arrived
 * sits before anyone touches it, and where recalled stock is held - neither is
 * a storage failure, and charging for it would punish the learner for the one
 * thing goods-in is supposed to do.
 */
export function spoilMisstored(
  batches: readonly StockBatch[],
  requiredZone: Readonly<Record<string, StorageZone>>,
): { kept: StockBatch[]; writeOffs: ExpiredWriteOff[]; wastage: Paisa } {
  const kept: StockBatch[] = [];
  const writeOffs: ExpiredWriteOff[] = [];
  let wastage = 0;
  for (const batch of batches) {
    const needs = requiredZone[batch.drugId];
    const ruined = needs === "cold-chain"
      && batch.qty > 0
      && batch.location !== "cold-chain"
      && batch.location !== "quarantine";
    if (ruined) {
      const value = batch.qty * batch.unitCost;
      writeOffs.push({ batchNo: batch.batchNo, qty: batch.qty, value });
      wastage += value;
    } else {
      kept.push(batch);
    }
  }
  return { kept, writeOffs, wastage };
}

export type PeriodKPIs = {
  revenue: Paisa;
  cogs: Paisa;
  grossMargin: Paisa;
  grossMarginPercent: number;
  wastage: Paisa;
  /** Share of demand actually served, 0-100. The number a patient feels. */
  serviceLevel: number;
  /** Wastage as a share of what was sold, 0-100. */
  wastagePercent: number;
  closingCash: Paisa;
};

export function periodKPIs(input: {
  revenue: Paisa;
  cogs: Paisa;
  wastage: Paisa;
  demanded: number;
  sold: number;
  openingCash: Paisa;
  purchases: Paisa;
  overheads: Paisa;
  /** Licence fees and fines: money that leaves without buying anything. */
  charges?: Paisa;
}): PeriodKPIs {
  const grossMargin = input.revenue - input.cogs;
  return {
    revenue: input.revenue,
    cogs: input.cogs,
    grossMargin,
    grossMarginPercent: input.revenue > 0 ? (grossMargin / input.revenue) * 100 : 0,
    wastage: input.wastage,
    serviceLevel: input.demanded > 0 ? (input.sold / input.demanded) * 100 : 100,
    wastagePercent: input.revenue > 0 ? (input.wastage / input.revenue) * 100 : 0,
    closingCash: input.openingCash + input.revenue - input.purchases - input.overheads
      - (input.charges ?? 0),
  };
}
