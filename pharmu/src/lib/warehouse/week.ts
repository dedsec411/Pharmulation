/**
 * Closing a week.
 *
 * One function decides everything that happens between the learner finishing
 * their decisions and seeing the result, in the order a real week happens it:
 * deliveries land, suppliers get paid, the counter sells what it can, stock
 * that ran out of life is written off, the rent goes out, and what is left is
 * next week's cash.
 *
 * Pure and total: same inputs, same week, every time. Nothing here reads a
 * clock, a database or an unseeded random number, so a result can be replayed
 * by a learner who disputes it and checked by an educator who has to mark it.
 *
 * The order matters and is deliberate. Stock arrives BEFORE demand is served,
 * because a delivery that lands on Monday sells that week. Suppliers are paid
 * BEFORE the week's takings are counted, because a pharmacy that cannot cover
 * its invoices does not get to use this week's sales to do it - that is what
 * running out of working capital means, and softening it would remove the one
 * pressure the budget is supposed to teach.
 */

import {
  fulfilFEFO, expireStock, periodKPIs, weeklyDemand,
  type Paisa, type PricedDrug, type StockBatch, type DemandProfile, type PeriodKPIs,
  type ExpiredWriteOff,
} from "./economics";

export type FacilityState = {
  period: number;
  cash: Paisa;
  /** How far below zero the account may go before the facility is finished. */
  overdraft: Paisa;
  seed: string;
};

export type PendingOrder = {
  id: string;
  etaPeriod: number;
  paymentDuePeriod: number;
  total: Paisa;
  paid: boolean;
  delivered: boolean;
  lines: Array<{
    drugId: string;
    packs: number;
    unitPrice: Paisa;
    /** Shelf life at delivery, in weeks. */
    shelfLifeWeeks: number;
    /** What actually turned up, when a supplier short-ships. */
    receivedPacks?: number;
  }>;
};

export type WeekInput = {
  facility: FacilityState;
  stock: readonly StockBatch[];
  orders: readonly PendingOrder[];
  /** Priced by drug id. A drug missing from here cannot be sold. */
  prices: Readonly<Record<string, PricedDrug>>;
  demand: readonly DemandProfile[];
  /** Rent, salaries, utilities - what the week costs before a single sale. */
  overheads: Paisa;
};

export type DrugOutcome = {
  drugId: string;
  demanded: number;
  sold: number;
  short: number;
  revenue: Paisa;
};

export type WeekResult = {
  period: number;
  stock: StockBatch[];
  orders: PendingOrder[];
  kpis: PeriodKPIs;
  perDrug: DrugOutcome[];
  writeOffs: ExpiredWriteOff[];
  /** Order ids that arrived this week. */
  delivered: string[];
  /** Order ids paid this week, and what they cost. */
  paid: Array<{ orderId: string; amount: Paisa }>;
  /** True when cash has fallen past the overdraft. The run is over. */
  insolvent: boolean;
  ledger: Array<{ kind: LedgerKind; amount: Paisa; note: string }>;
};

export type LedgerKind = "sale" | "purchase" | "overhead" | "write-off" | "licence" | "penalty";

/**
 * Where a delivered pack belongs before anyone touches it.
 *
 * Everything lands in quarantine. It is not a punishment - it is how goods-in
 * works, and it is what makes putting stock away a decision the learner makes
 * rather than something that happens to them. Unquarantined stock cannot be
 * sold, so a learner who never puts anything away sells nothing and finds out
 * why.
 */
export const ARRIVES_IN = "quarantine" as const;

export function closeWeek(input: WeekInput): WeekResult {
  const { facility, prices, overheads } = input;
  const period = facility.period;
  const ledger: WeekResult["ledger"] = [];

  let stock: StockBatch[] = input.stock.map((b) => ({ ...b }));
  const orders: PendingOrder[] = input.orders.map((o) => ({ ...o, lines: o.lines.map((l) => ({ ...l })) }));

  // ---- 1. Deliveries land -------------------------------------------------
  const delivered: string[] = [];
  for (const order of orders) {
    if (order.delivered || order.etaPeriod > period) continue;
    order.delivered = true;
    delivered.push(order.id);
    for (const line of order.lines) {
      const packs = line.receivedPacks ?? line.packs;
      if (packs <= 0) continue;
      stock.push({
        drugId: line.drugId,
        batchNo: `${order.id.slice(0, 6)}-${line.drugId.slice(0, 4)}`.toUpperCase(),
        qty: packs,
        expiresPeriod: period + Math.max(1, line.shelfLifeWeeks),
        unitCost: line.unitPrice,
        location: ARRIVES_IN,
      });
    }
  }

  // ---- 2. Suppliers are paid ---------------------------------------------
  const paid: WeekResult["paid"] = [];
  let purchases: Paisa = 0;
  for (const order of orders) {
    if (order.paid || order.paymentDuePeriod > period) continue;
    order.paid = true;
    purchases += order.total;
    paid.push({ orderId: order.id, amount: order.total });
    ledger.push({ kind: "purchase", amount: -order.total, note: `Invoice ${order.id.slice(0, 6)}` });
  }

  // ---- 3. The counter sells what it can ----------------------------------
  const perDrug: DrugOutcome[] = [];
  let revenue: Paisa = 0;
  let cogs: Paisa = 0;
  let demandedTotal = 0;
  let soldTotal = 0;

  for (const profile of input.demand) {
    const priced = prices[profile.drugId];
    const wanted = weeklyDemand(profile, period, facility.seed);
    demandedTotal += wanted;
    if (!priced) {
      // Nothing to sell it at, so nothing is sold. Recorded rather than
      // silently dropped, or the service level would flatter the learner.
      perDrug.push({ drugId: profile.drugId, demanded: wanted, sold: 0, short: wanted, revenue: 0 });
      continue;
    }

    const forDrug = stock.filter((b) => b.drugId === profile.drugId);
    const others = stock.filter((b) => b.drugId !== profile.drugId);
    const out = fulfilFEFO(forDrug, wanted);

    // DRAP fixes the price on the pack: the sale is at MRP, never above.
    const lineRevenue = out.sold * priced.mrp;
    revenue += lineRevenue;
    cogs += out.cogs;
    soldTotal += out.sold;
    stock = [...others, ...out.remaining];

    perDrug.push({
      drugId: profile.drugId, demanded: wanted, sold: out.sold,
      short: out.short, revenue: lineRevenue,
    });
  }
  if (revenue > 0) ledger.push({ kind: "sale", amount: revenue, note: `Week ${period} takings` });

  // ---- 4. Stock that ran out of life -------------------------------------
  const expired = expireStock(stock, period);
  stock = expired.kept;
  if (expired.wastage > 0) {
    ledger.push({
      kind: "write-off", amount: 0,
      note: `${expired.writeOffs.length} batch(es) expired and destroyed`,
    });
  }

  // ---- 5. The week's costs ------------------------------------------------
  if (overheads > 0) ledger.push({ kind: "overhead", amount: -overheads, note: "Rent, salaries, utilities" });

  const kpis = periodKPIs({
    revenue, cogs, wastage: expired.wastage,
    demanded: demandedTotal, sold: soldTotal,
    openingCash: facility.cash, purchases, overheads,
  });

  return {
    period,
    stock,
    orders,
    kpis,
    perDrug,
    writeOffs: expired.writeOffs,
    delivered,
    paid,
    // Wastage is a loss of value, not of cash - the cash left when the stock
    // was bought - so it does not appear again here.
    insolvent: kpis.closingCash < -facility.overdraft,
    ledger,
  };
}

/**
 * What the learner is shown when a week opens.
 *
 * Deliberately not a recommendation engine: it reports the position and lets
 * them decide. Telling a learner what to order would remove the analysis the
 * mode exists to teach.
 */
export type WeekBriefing = {
  period: number;
  cash: Paisa;
  arrivingThisWeek: string[];
  paymentsDue: Paisa;
  expiringSoon: Array<{ drugId: string; batchNo: string; qty: number; inWeeks: number }>;
  onHand: Array<{ drugId: string; packs: number; sellable: number }>;
};

export function openWeek(input: WeekInput, expirySoonWeeks = 4): WeekBriefing {
  const period = input.facility.period;
  const onHandMap = new Map<string, { packs: number; sellable: number }>();
  for (const batch of input.stock) {
    const entry = onHandMap.get(batch.drugId) ?? { packs: 0, sellable: 0 };
    entry.packs += batch.qty;
    if (batch.location !== "quarantine") entry.sellable += batch.qty;
    onHandMap.set(batch.drugId, entry);
  }

  return {
    period,
    cash: input.facility.cash,
    arrivingThisWeek: input.orders
      .filter((o) => !o.delivered && o.etaPeriod <= period)
      .map((o) => o.id),
    paymentsDue: input.orders
      .filter((o) => !o.paid && o.paymentDuePeriod <= period)
      .reduce((sum, o) => sum + o.total, 0),
    expiringSoon: input.stock
      .filter((b) => b.qty > 0 && b.expiresPeriod - period <= expirySoonWeeks)
      .map((b) => ({
        drugId: b.drugId, batchNo: b.batchNo, qty: b.qty,
        inWeeks: b.expiresPeriod - period,
      }))
      .sort((a, b) => a.inWeeks - b.inWeeks),
    onHand: [...onHandMap.entries()].map(([drugId, v]) => ({ drugId, ...v })),
  };
}
