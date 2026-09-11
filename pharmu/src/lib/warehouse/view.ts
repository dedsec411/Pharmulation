/**
 * What the screens are actually showing.
 *
 * The interface needs numbers the database does not hold: how many weeks of
 * cover a line has left, whether it is below its reorder point, which lines are
 * worth managing closely, and how long the cash lasts at the current burn.
 * Every one of those is a judgement a pharmacist would argue about, so none of
 * them live inside a component - they live here, where they can be tested and
 * where changing one changes it everywhere at once.
 *
 * Nothing in this file touches a database or a clock.
 */

import {
  abcClassify, reorderPoint, formatPKR,
  type Paisa, type StorageZone,
} from "./economics";

export type ViewCatalogueLine = {
  drugId: string;
  name: string;
  category: string;
  mrp: Paisa;
  tradePrice: Paisa;
  baseWeekly: number;
  leadTimeWeeks: number;
  storage: StorageZone;
  controlled: boolean;
};

export type ViewBatch = {
  id: string;
  drugId: string;
  batchNo: string;
  qty: number;
  expiresPeriod: number;
  unitCost: Paisa;
  location: StorageZone;
};

export type ViewOrder = {
  id: string;
  supplier: string;
  etaPeriod: number;
  paymentDuePeriod: number;
  total: Paisa;
  paid: boolean;
  status: string;
  lines: Array<{ drugId: string; packs: number; receivedPacks: number | null }>;
};

/* ------------------------------------------------------------------ *
 * What is on the shelf
 * ------------------------------------------------------------------ */

export type OnHand = {
  /** Everything held, wherever it is. */
  packs: number;
  /** What could actually be dispensed: not quarantined. */
  sellable: number;
  quarantined: number;
  /** What it cost to buy, for the stock-value figure. */
  value: Paisa;
};

export function onHandByDrug(stock: readonly ViewBatch[]): Map<string, OnHand> {
  const out = new Map<string, OnHand>();
  for (const batch of stock) {
    if (batch.qty <= 0) continue;
    const entry = out.get(batch.drugId) ?? { packs: 0, sellable: 0, quarantined: 0, value: 0 };
    entry.packs += batch.qty;
    entry.value += batch.qty * batch.unitCost;
    if (batch.location === "quarantine") entry.quarantined += batch.qty;
    else entry.sellable += batch.qty;
    out.set(batch.drugId, entry);
  }
  return out;
}

/**
 * A week of cover on top of the lead time.
 *
 * Ordering at exactly the lead time means running out the moment a supplier is
 * a day late, and suppliers are late. One week is enough to absorb that
 * without turning the shelf into a warehouse of dead capital.
 */
const SAFETY_WEEKS = 1;

export type LinePosition = {
  line: ViewCatalogueLine;
  onHand: OnHand;
  /** Packs already ordered and not yet delivered. */
  onOrder: number;
  /** Weeks the sellable stock lasts at the usual rate. */
  weeksOfCover: number;
  reorderAt: number;
  /** True when stock plus what is coming will not cover the lead time. */
  needsOrdering: boolean;
  abc: "A" | "B" | "C";
};

/**
 * The position of every line the pharmacy carries.
 *
 * Cover counts only sellable stock, because a pallet sitting in quarantine
 * serves nobody - a learner looking at "four weeks of cover" that turns out to
 * be four weeks of stock they never put away has been told the wrong thing.
 *
 * Stock on order counts towards the reorder decision but not towards cover: it
 * stops the learner ordering the same line four weeks running, without letting
 * goods that have not arrived look like goods they can dispense.
 */
export function stockPositions(
  catalogue: readonly ViewCatalogueLine[],
  stock: readonly ViewBatch[],
  orders: readonly ViewOrder[],
): LinePosition[] {
  const held = onHandByDrug(stock);

  const onOrder = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "placed") continue;
    for (const line of order.lines) {
      onOrder.set(line.drugId, (onOrder.get(line.drugId) ?? 0) + line.packs);
    }
  }

  const classes = abcClassify(catalogue.map((l) => ({
    drugId: l.drugId,
    annualValue: l.mrp * l.baseWeekly * 52,
  })));

  return catalogue.map((line) => {
    const onHand = held.get(line.drugId) ?? { packs: 0, sellable: 0, quarantined: 0, value: 0 };
    const coming = onOrder.get(line.drugId) ?? 0;
    const reorderAt = reorderPoint(line.baseWeekly, line.leadTimeWeeks, SAFETY_WEEKS);
    return {
      line,
      onHand,
      onOrder: coming,
      weeksOfCover: line.baseWeekly > 0 ? onHand.sellable / line.baseWeekly : Infinity,
      reorderAt,
      needsOrdering: onHand.sellable + coming <= reorderAt,
      abc: classes[line.drugId] ?? "C",
    };
  });
}

/* ------------------------------------------------------------------ *
 * What is about to become a problem
 * ------------------------------------------------------------------ */

export type ExpiringBatch = {
  batch: ViewBatch;
  name: string;
  inWeeks: number;
  /** What is lost if it is still here when it dies. */
  valueAtRisk: Paisa;
};

/**
 * Stock near the end of its life, worst first.
 *
 * Already-expired batches are included with a negative week count rather than
 * filtered out: expired stock left on the shelf is an inspection finding, so
 * the learner needs to see it, not have it quietly disappear from the list
 * that was supposed to warn them.
 */
export function expiringSoon(
  stock: readonly ViewBatch[],
  names: ReadonlyMap<string, string>,
  period: number,
  withinWeeks = 6,
): ExpiringBatch[] {
  return stock
    .filter((b) => b.qty > 0 && b.expiresPeriod - period <= withinWeeks)
    .map((batch) => ({
      batch,
      name: names.get(batch.drugId) ?? "Medicine",
      inWeeks: batch.expiresPeriod - period,
      valueAtRisk: batch.qty * batch.unitCost,
    }))
    .sort((a, b) => a.inWeeks - b.inWeeks || b.valueAtRisk - a.valueAtRisk);
}

/* ------------------------------------------------------------------ *
 * The week ahead
 * ------------------------------------------------------------------ */

export type Briefing = {
  arriving: ViewOrder[];
  paymentsDue: Paisa;
  /** Cash after this week's invoices, before anything is sold. */
  cashAfterCommitments: Paisa;
  stockValue: Paisa;
  linesBelowReorder: number;
  expiringCount: number;
  valueAtRisk: Paisa;
};

export function briefing(
  period: number,
  cash: Paisa,
  positions: readonly LinePosition[],
  orders: readonly ViewOrder[],
  expiring: readonly ExpiringBatch[],
): Briefing {
  const paymentsDue = orders
    .filter((o) => !o.paid && o.paymentDuePeriod <= period && o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  return {
    arriving: orders.filter((o) => o.status === "placed" && o.etaPeriod <= period),
    paymentsDue,
    cashAfterCommitments: cash - paymentsDue,
    stockValue: positions.reduce((sum, p) => sum + p.onHand.value, 0),
    linesBelowReorder: positions.filter((p) => p.needsOrdering).length,
    expiringCount: expiring.length,
    valueAtRisk: expiring.reduce((sum, e) => sum + e.valueAtRisk, 0),
  };
}

/* ------------------------------------------------------------------ *
 * How long the money lasts
 * ------------------------------------------------------------------ */

export type PeriodRow = {
  periodNo: number;
  revenue: Paisa;
  cogs: Paisa;
  wastage: Paisa;
  purchases: Paisa;
  overheads: Paisa;
  penalties: Paisa;
  fees: Paisa;
  openingCash: Paisa;
  closingCash: Paisa;
  demanded: number;
  sold: number;
};

/**
 * Weeks of cash left at the recent rate of loss.
 *
 * Null when the pharmacy is not losing money, because "infinite runway" is a
 * number that invites a learner to stop reading. Measured over the last four
 * closed weeks: one bad week is noise, a month of them is a trend.
 */
export function cashRunwayWeeks(cash: Paisa, periods: readonly PeriodRow[]): number | null {
  const recent = [...periods].sort((a, b) => b.periodNo - a.periodNo).slice(0, 4);
  if (recent.length < 2) return null;
  const first = recent[recent.length - 1];
  const last = recent[0];
  const change = last.closingCash - first.openingCash;
  if (change >= 0) return null;
  const perWeek = Math.abs(change) / recent.length;
  return perWeek > 0 ? Math.max(0, Math.floor(cash / perWeek)) : null;
}

/** A month is four closed weeks. What the owner would ask about. */
export function monthToDate(periods: readonly PeriodRow[], weeks = 4) {
  const recent = [...periods].sort((a, b) => b.periodNo - a.periodNo).slice(0, weeks);
  const sum = (pick: (p: PeriodRow) => number) => recent.reduce((n, p) => n + pick(p), 0);
  const revenue = sum((p) => p.revenue);
  const cogs = sum((p) => p.cogs);
  const demanded = sum((p) => p.demanded);
  return {
    weeks: recent.length,
    revenue,
    cogs,
    grossMargin: revenue - cogs,
    grossMarginPercent: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
    wastage: sum((p) => p.wastage),
    penalties: sum((p) => p.penalties),
    fees: sum((p) => p.fees),
    sold: sum((p) => p.sold),
    demanded,
    serviceLevel: demanded > 0 ? (sum((p) => p.sold) / demanded) * 100 : 100,
  };
}

/** "Rs 4,200" or "-" when there is nothing to show. */
export function money(value: Paisa | null | undefined): string {
  return value === null || value === undefined ? "-" : formatPKR(value);
}

/** "3.2 weeks", or "over a year" rather than a meaningless number. */
export function coverLabel(weeks: number): string {
  if (!Number.isFinite(weeks)) return "no demand";
  if (weeks >= 52) return "over a year";
  if (weeks < 1) return `${Math.round(weeks * 7)} days`;
  return `${weeks.toFixed(1)} weeks`;
}
