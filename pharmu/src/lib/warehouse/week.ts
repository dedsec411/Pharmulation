/**
 * Closing a week.
 *
 * One function decides everything that happens between the learner finishing
 * their decisions and seeing the result, in the order a real week happens it:
 * deliveries land, suppliers get paid, anything kept in the wrong place is
 * written off, the counter sells what it can, stock that ran out of life is
 * written off too, the rent and any fines go out, and what is left is next
 * week's cash.
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
  fulfilFEFO, expireStock, spoilMisstored, periodKPIs, weeklyDemand,
  type Paisa, type PricedDrug, type StockBatch, type DemandProfile, type PeriodKPIs,
  type ExpiredWriteOff, type StorageZone,
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
  /**
   * Whether the pharmacy may lawfully sell this week.
   *
   * False when the licence has lapsed or an inspection suspended it. The
   * counter is shut and nothing is dispensed - but the rent still goes out,
   * the invoices still fall due and the stock still ages, which is precisely
   * why letting a licence lapse is expensive rather than merely embarrassing.
   */
  trading?: boolean;
  /** Where each medicine has to live, so stock kept wrongly can spoil. */
  requiredZone?: Readonly<Record<string, StorageZone>>;
  /** Fines handed down this week, most often by an inspection. */
  penalties?: ReadonlyArray<{ amount: Paisa; note: string }>;
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
  /** Batches destroyed by being kept somewhere they should not have been. */
  spoiled: ExpiredWriteOff[];
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

  // ---- 3. Stock ruined by being kept in the wrong place -------------------
  // Before the counter opens, because a vaccine that spent the week out of the
  // fridge was never fit to dispense at any point during it.
  const spoiled = spoilMisstored(stock, input.requiredZone ?? {});
  stock = spoiled.kept;
  if (spoiled.writeOffs.length) {
    ledger.push({
      kind: "write-off", amount: 0,
      note: `${spoiled.writeOffs.length} batch(es) destroyed - stored outside the cold chain`,
    });
  }

  // ---- 4. The counter sells what it can ----------------------------------
  const trading = input.trading !== false;
  const perDrug: DrugOutcome[] = [];
  let revenue: Paisa = 0;
  let cogs: Paisa = 0;
  let demandedTotal = 0;
  let soldTotal = 0;

  for (const profile of input.demand) {
    const priced = prices[profile.drugId];
    const wanted = weeklyDemand(profile, period, facility.seed);
    demandedTotal += wanted;
    if (!priced || !trading) {
      // Either there is no lawful price to sell at, or the pharmacy is shut.
      // Recorded as unserved demand rather than silently dropped, or the
      // service level would flatter a learner whose patients went elsewhere.
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

  if (!trading) {
    ledger.push({
      kind: "penalty", amount: 0,
      note: "Closed to the public: the pharmacy is not licensed to sell this week",
    });
  }

  // ---- 5. Stock that ran out of life -------------------------------------
  const expired = expireStock(stock, period);
  stock = expired.kept;
  if (expired.wastage > 0) {
    ledger.push({
      kind: "write-off", amount: 0,
      note: `${expired.writeOffs.length} batch(es) expired and destroyed`,
    });
  }

  // ---- 6. The week's costs ------------------------------------------------
  if (overheads > 0) ledger.push({ kind: "overhead", amount: -overheads, note: "Rent, salaries, utilities" });

  let penalties: Paisa = 0;
  for (const fine of input.penalties ?? []) {
    if (fine.amount <= 0) continue;
    penalties += fine.amount;
    ledger.push({ kind: "penalty", amount: -fine.amount, note: fine.note });
  }

  const kpis = periodKPIs({
    revenue, cogs, wastage: expired.wastage + spoiled.wastage,
    demanded: demandedTotal, sold: soldTotal,
    openingCash: facility.cash, purchases, overheads, penalties,
  });

  return {
    period,
    stock,
    orders,
    kpis,
    perDrug,
    writeOffs: expired.writeOffs,
    spoiled: spoiled.writeOffs,
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
