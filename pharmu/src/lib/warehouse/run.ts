/**
 * Running a facility.
 *
 * All of it, with the transport taken off. Each function is handed a Supabase
 * client and the id of whoever is asking, and does the work - which means the
 * whole mode can be played through in a test against an in-memory database,
 * and that a bug in the week close is found by a test rather than by a learner
 * halfway through week nine.
 *
 * The client is always the caller's own rather than the service role, so
 * row-level security is what keeps one learner's pharmacy out of another's -
 * the policies do the work, not a filter written by hand here that could be
 * forgotten on the one query that mattered.
 *
 * The simulation itself lives alongside this and is pure. These functions only
 * load state, hand it over, and write back what came out.
 */

import {
  chooseCatalogue, openingStock, startingPosition,
  type CatalogueDrug, type Difficulty,
} from "./bootstrap";
import { closeWeek, type PendingOrder, type LedgerKind } from "./week";
import {
  orderCost, formatPKR,
  type Paisa, type PricedDrug, type StockBatch, type DemandProfile,
  type StorageZone,
} from "./economics";
import {
  canTrade, licenceValid, find as findLicence, inspect,
  LICENCE_FEE, LICENCE_TERM_WEEKS, NARCOTICS_LEAD_WEEKS, SUSPENSION_WEEKS,
  type Licence, type LicenceKind, type ComplianceStock, type RegisterLine,
} from "./compliance";
import {
  rollEvents, settleNotices,
  type EventStock, type ShortageEvent, type OpenNotice,
} from "./events";
import { SUPPLIER_BREAKS, PAYMENT_TERMS_WEEKS } from "./supplier";

/** Whatever speaks PostgREST: the real client, or a fake one in a test. */
export type Db = any;

export async function loadFacility(db: any, userId: string) {
  const facility = await db.from("wh_facilities")
    .select("*").eq("user_id", userId).eq("status", "running").maybeSingle();
  return facility.data as Row | null;
}

function toLicence(row: Row): Licence {
  return {
    kind: row.kind,
    status: row.status,
    issuedPeriod: Number(row.issued_period ?? 1),
    expiresPeriod: Number(row.expires_period),
  };
}

/** Whether the counter may open: licensed, and not shut by an inspector. */
function isTrading(facility: Row, licences: readonly Licence[], period: number): boolean {
  return canTrade(licences, period) && period > Number(facility.suspended_until_period ?? 0);
}

const CATALOGUE_SIZE = 40;

/** How long the previous owner's account has left to run when you take over. */
const OPENING_ACCOUNT_WEEKS = PAYMENT_TERMS_WEEKS * 2;

/**
 * When a week's buying counts as having gone wrong.
 *
 * Both of these are already priced into the week's result - unserved demand
 * earns nothing and dead stock costs what it cost - so these thresholds exist
 * only to name the fault, which is what lets the weakness map tell a learner
 * that their problem is buying rather than bad luck.
 */
const STOCKOUT_SERVICE_LEVEL = 90;
const OVER_ORDERED_WASTAGE_PERCENT = 5;

type Row = Record<string, any>;

/* ------------------------------------------------------------------ *
 * Opening a facility
 * ------------------------------------------------------------------ */

export async function createFacility(db: Db, userId: string, data: { name: string; city: string; difficulty: Difficulty }) {
  
  // One running facility each. A learner who went under starts a new one;
  // the old one is kept, because the post-mortem is the lesson.
  const existing = await db.from("wh_facilities")
    .select("id").eq("user_id", userId).eq("status", "running").maybeSingle();
  if (existing.data?.id) {
    return { ok: false as const, error: "You already have a pharmacy running.", facilityId: existing.data.id };
  }

  const drugs = await db.from("drugs")
    .select("id, name, generic_name, category, drug_class").limit(2000);
  if (drugs.error || !drugs.data?.length) {
    return { ok: false as const, error: "Could not load the medicine catalogue." };
  }

  const difficulty = data.difficulty as Difficulty;
  const seed = crypto.randomUUID();
  const lines = chooseCatalogue(drugs.data as CatalogueDrug[], seed, CATALOGUE_SIZE);
  if (!lines.length) return { ok: false as const, error: "The catalogue is empty." };

  // Rent and working capital follow from what this particular shop sells.
  // Fixed figures cannot work: every facility gets a different catalogue, and
  // a rent that squeezed one would be pocket change to the next.
  const start = startingPosition(lines, difficulty);

  const facility = await db.from("wh_facilities").insert({
    user_id: userId,
    name: data.name,
    city: data.city,
    difficulty,
    current_period: 1,
    cash_paisa: start.cash,
    opening_cash_paisa: start.cash,
    overdraft_paisa: start.overdraft,
    weekly_overheads_paisa: start.weeklyOverheads,
    seed,
    status: "running",
  }).select("id").single();
  if (facility.error) {
    console.error("[warehouse] could not create facility:", facility.error);
    return { ok: false as const, error: "Could not open the pharmacy." };
  }
  const facilityId = facility.data.id as string;

  await db.from("wh_catalogue").insert(lines.map((l) => ({
    facility_id: facilityId,
    drug_id: l.drugId,
    mrp_paisa: l.mrp,
    trade_price_paisa: l.tradePrice,
    base_weekly: l.baseWeekly,
    seasonality: l.seasonality,
    peak_week: l.peakWeek,
    shelf_life_weeks: l.shelfLifeWeeks,
    lead_time_weeks: l.leadTimeWeeks,
    storage: l.storage,
    controlled: l.controlled,
  })));

  const opening = openingStock(lines, seed, start.openingCoverWeeks);
  await db.from("wh_stock").insert(
    opening.map((b) => ({
      facility_id: facilityId,
      drug_id: b.drugId,
      batch_no: b.batchNo,
      qty: b.qty,
      expires_period: b.expiresPeriod,
      unit_cost_paisa: b.unitCost,
      location: b.location,
      received_period: 1,
    })));

  // The shelf comes with the business, and so does the bill for it. Handing a
  // learner five weeks of free stock would let them bank the proceeds and coast
  // for a year on money they never earned - and taking over a going concern
  // means taking over its creditors. It falls due far enough out to be
  // survivable and close enough to have to be planned for, and it is the first
  // real thing the budget has to be managed around.
  const shelfCost = opening.reduce((sum, b) => sum + b.qty * b.unitCost, 0);
  if (shelfCost > 0) {
    await db.from("wh_orders").insert({
      facility_id: facilityId,
      supplier: "Previous owner's account",
      placed_period: 1,
      eta_period: 1,
      // Already on the shelf, so nothing is delivered again - only paid for.
      status: "delivered",
      total_paisa: shelfCost,
      payment_due_period: 1 + OPENING_ACCOUNT_WEEKS,
      paid: false,
    });
  }

  // A Drug Sale Licence to trade at all. No narcotics permit: obtaining one
  // is a goal, and until it exists the controlled lines cannot be ordered.
  await db.from("wh_licences").insert({
    facility_id: facilityId,
    kind: "drug_sale",
    status: "active",
    issued_period: 1,
    expires_period: 1 + start.licenceWeeks,
    fee_paisa: LICENCE_FEE.drug_sale,
  });

  return { ok: true as const, facilityId };
}

export async function getFacilityState(db: Db, userId: string) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);

  const [catalogue, stock, orders, periods, events, licences, register, paperwork,
         inspections, ledger] =
    await Promise.all([
      db.from("wh_catalogue").select("*, drugs(name, category)").eq("facility_id", facility.id),
      db.from("wh_stock").select("*").eq("facility_id", facility.id).gt("qty", 0),
      db.from("wh_orders").select("*, wh_order_lines(*)").eq("facility_id", facility.id)
        .neq("status", "cancelled"),
      db.from("wh_periods").select("*").eq("facility_id", facility.id)
        .order("period_no", { ascending: false }).limit(12),
      db.from("wh_events").select("*").eq("facility_id", facility.id).eq("resolved", false),
      db.from("wh_licences").select("*").eq("facility_id", facility.id),
      db.from("wh_cd_register").select("*, drugs(name)").eq("facility_id", facility.id),
      db.from("wh_paperwork").select("kind").eq("facility_id", facility.id).eq("period_no", period),
      // Inspection reports are resolved the moment they are written, so they
      // never appear in the open list - but a learner has to be able to go
      // back and read what the inspector actually found.
      db.from("wh_events").select("*").eq("facility_id", facility.id).eq("kind", "inspection")
        .order("period_no", { ascending: false }).limit(5),
      // The period table says what happened. The ledger says why, which is
      // the only way a learner whose cash fell can find out what took it.
      db.from("wh_ledger").select("*").eq("facility_id", facility.id)
        .order("period_no", { ascending: false }).limit(60),
    ]);

  const held = (licences.data ?? []).map(toLicence);
  const kept = new Set((paperwork.data ?? []).map((r: Row) => r.kind as string));

  // Whether each licence covers this week, worked out from its dates rather
  // than read off the status column. The column is only rewritten when a week
  // closes, so a permit granted for the very week the learner is standing in
  // would still read "pending" - which is exactly when they need to know it is
  // in force.
  const licenceRows = ((licences.data ?? []) as Row[]).map((row) => ({
    ...row,
    in_force: licenceValid(toLicence(row), period),
  }));

  return {
    ok: true as const,
    facility,
    catalogue: catalogue.data ?? [],
    stock: stock.data ?? [],
    orders: orders.data ?? [],
    periods: periods.data ?? [],
    events: events.data ?? [],
    inspections: inspections.data ?? [],
    ledger: ledger.data ?? [],
    licences: licenceRows,
    register: register.data ?? [],
    // What this week's paperwork looks like, so the interface can show what
    // is still outstanding rather than making the learner remember.
    paperwork: {
      temperatureLog: kept.has("temperature-log"),
      cdRegister: kept.has("cd-register"),
    },
    trading: isTrading(facility, held, period),
    suspendedUntilPeriod: Number(facility.suspended_until_period ?? 0),
  };
}

export async function applyForLicence(db: Db, userId: string, data: { kind: LicenceKind }) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);
  const fee = LICENCE_FEE[data.kind];

  if (Number(facility.cash_paisa) < fee) {
    return {
      ok: false as const,
      error: `That application costs ${formatPKR(fee)}, and there is ${formatPKR(Number(facility.cash_paisa))} in the account.`,
    };
  }

  const rows = await db.from("wh_licences")
    .select("*").eq("facility_id", facility.id).eq("kind", data.kind).limit(1);
  const held = (rows.data ?? [])[0] as Row | undefined;

  if (held?.status === "pending") {
    return {
      ok: false as const,
      error: `That application is already with the authority. It is expected in week ${held.issued_period}.`,
    };
  }

  let issued = period;
  let expires = period + LICENCE_TERM_WEEKS;
  let status: Licence["status"] = "active";
  let note: string;

  if (held && held.status === "active") {
    // Renewing early does not throw away the weeks already paid for.
    expires = Math.max(Number(held.expires_period), period) + LICENCE_TERM_WEEKS;
    note = data.kind === "drug_sale" ? "Drug Sale Licence renewal" : "Narcotics permit renewal";
  } else if (data.kind === "narcotics") {
    // A fresh narcotics permit is inspected before it is granted.
    issued = period + NARCOTICS_LEAD_WEEKS;
    expires = issued + LICENCE_TERM_WEEKS;
    status = "pending";
    note = "Narcotics permit application";
  } else {
    note = "Drug Sale Licence";
  }

  const payload = {
    facility_id: facility.id,
    kind: data.kind,
    status,
    issued_period: issued,
    expires_period: expires,
    fee_paisa: fee,
  };
  const written = held
    ? await db.from("wh_licences").update(payload).eq("id", held.id)
    : await db.from("wh_licences").insert(payload);
  if (written.error) {
    console.error("[warehouse] could not write licence:", written.error);
    return { ok: false as const, error: "Could not lodge that application." };
  }

  await db.from("wh_facilities")
    .update({ cash_paisa: Number(facility.cash_paisa) - fee, updated_at: new Date().toISOString() })
    .eq("id", facility.id);
  await db.from("wh_ledger").insert({
    facility_id: facility.id,
    period_no: period,
    kind: "licence",
    amount_paisa: -fee,
    note,
  });

  // A licence back in force closes the notice that it had lapsed.
  if (status === "active") {
    await db.from("wh_events")
      .update({ resolved: true, resolution: "renewed" })
      .eq("facility_id", facility.id)
      .eq("kind", "licence-expiry")
      .eq("resolved", false);
  }

  return {
    ok: true as const,
    status,
    grantedPeriod: issued,
    expiresPeriod: expires,
    fee,
    pending: status === "pending",
  };
}

export async function placeOrder(db: Db, userId: string, data: { supplier: string; lines: Array<{ drugId: string; packs: number }> }) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);

  const catalogue = await db.from("wh_catalogue").select("*").eq("facility_id", facility.id);
  const byDrug = new Map<string, Row>((catalogue.data ?? []).map((r: Row) => [r.drug_id, r]));

  const licences = await db.from("wh_licences")
    .select("kind, status, expires_period").eq("facility_id", facility.id);
  const held = (licences.data ?? []).map(toLicence);
  const hasNarcotics = licenceValid(findLicence(held, "narcotics"), period);

  let total: Paisa = 0;
  let eta = period;
  const rows: Row[] = [];

  for (const line of data.lines) {
    const entry = byDrug.get(line.drugId);
    if (!entry) return { ok: false as const, error: "That medicine is not on your list." };

    // No permit, no controlled drugs. Refused at the order, which is where a
    // distributor would refuse it, rather than discovered at an inspection.
    if (entry.controlled && !hasNarcotics) {
      return {
        ok: false as const,
        error: "You cannot order controlled medicines without a valid narcotics permit.",
      };
    }

    const priced: PricedDrug = {
      drugId: entry.drug_id, mrp: Number(entry.mrp_paisa), tradePrice: Number(entry.trade_price_paisa),
    };
    const cost = orderCost(priced, line.packs, SUPPLIER_BREAKS);
    total += cost;
    eta = Math.max(eta, period + Number(entry.lead_time_weeks));
    rows.push({
      drug_id: line.drugId,
      packs: line.packs,
      unit_price_paisa: Math.round(cost / line.packs),
    });
  }

  const order = await db.from("wh_orders").insert({
    facility_id: facility.id,
    supplier: data.supplier,
    placed_period: period,
    eta_period: eta,
    status: "placed",
    total_paisa: total,
    payment_due_period: period + PAYMENT_TERMS_WEEKS,
    paid: false,
  }).select("id").single();
  if (order.error) {
    console.error("[warehouse] could not place order:", order.error);
    return { ok: false as const, error: "Could not place that order." };
  }

  await db.from("wh_order_lines").insert(
    rows.map((r) => ({ ...r, order_id: order.data.id })));

  return {
    ok: true as const,
    orderId: order.data.id as string,
    total,
    etaPeriod: eta,
    paymentDuePeriod: period + PAYMENT_TERMS_WEEKS,
  };
}

export async function putAwayStock(db: Db, userId: string, data: { moves: Array<{ stockId: string; zone: StorageZone }>; confirm: boolean }) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };

  const ids = data.moves.map((m) => m.stockId);
  const [batches, catalogue] = await Promise.all([
    db.from("wh_stock").select("id, drug_id, location").eq("facility_id", facility.id).in("id", ids),
    db.from("wh_catalogue").select("drug_id, storage, drugs(name)").eq("facility_id", facility.id),
  ]);
  const required = new Map<string, Row>(
    (catalogue.data ?? []).map((r: Row) => [r.drug_id, r]));
  const byId = new Map<string, Row>((batches.data ?? []).map((r: Row) => [r.id, r]));

  const warnings: string[] = [];
  const moves: Array<{ id: string; zone: string }> = [];
  for (const move of data.moves) {
    const batch = byId.get(move.stockId);
    if (!batch) continue;
    const rule = required.get(batch.drug_id);
    const zone = (rule?.storage ?? "ambient") as StorageZone;
    const name = rule?.drugs?.name ?? "That medicine";
    // Quarantine is always a legitimate place to put something: it is where
    // stock is held, not a storage class you can get wrong.
    if (move.zone !== "quarantine" && zone !== move.zone) {
      warnings.push(zone === "cold-chain"
        ? `${name} belongs in the fridge. Left out of it, this batch will be destroyed.`
        : `${name} belongs in ${zone.replace("-", " ")}.`);
    }
    moves.push({ id: move.stockId, zone: move.zone });
  }

  if (warnings.length && !data.confirm) {
    return { ok: false as const, error: "Some of that is going in the wrong place.", detail: warnings };
  }

  for (const move of moves) {
    await db.from("wh_stock").update({ location: move.zone }).eq("id", move.id);
  }
  return { ok: true as const, moved: moves.length, warnings };
}

export async function signCdRegister(db: Db, userId: string, data: { counts: Array<{ drugId: string; counted: number }> }) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);

  for (const entry of data.counts) {
    await db.from("wh_cd_register").upsert({
      facility_id: facility.id,
      drug_id: entry.drugId,
      balance: entry.counted,
      posted_through_period: period,
      updated_at: new Date().toISOString(),
    }, { onConflict: "facility_id,drug_id" });
  }

  await db.from("wh_paperwork").upsert({
    facility_id: facility.id,
    period_no: period,
    kind: "cd-register",
  }, { onConflict: "facility_id,period_no,kind" });

  return { ok: true as const, posted: data.counts.length, period };
}

export async function logTemperature(db: Db, userId: string) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);

  await db.from("wh_paperwork").upsert({
    facility_id: facility.id,
    period_no: period,
    kind: "temperature-log",
  }, { onConflict: "facility_id,period_no,kind" });

  return { ok: true as const, period };
}

export async function resolveEvent(db: Db, userId: string, data: { eventId: string; action: "quarantine" | "use" | "destroy" | "acknowledge" }) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };

  const found = await db.from("wh_events")
    .select("*").eq("facility_id", facility.id).eq("id", data.eventId).maybeSingle();
  const event = found.data as Row | null;
  if (!event) return { ok: false as const, error: "That notice is not on file." };
  if (event.resolved) return { ok: false as const, error: "That notice has already been dealt with." };

  const payload = (event.payload ?? {}) as Row;

  if (event.kind === "recall") {
    if (data.action !== "quarantine") {
      return {
        ok: false as const,
        error: "A recalled batch has to be pulled from sale. There is no other lawful answer.",
      };
    }
    await db.from("wh_stock").update({ location: "quarantine" })
      .eq("facility_id", facility.id).eq("batch_no", payload.batchNo);
    await db.from("wh_events")
      .update({ resolved: true, resolution: "quarantined" }).eq("id", event.id);
    return { ok: true as const, resolution: "quarantined" };
  }

  if (event.kind === "excursion") {
    if (data.action === "acknowledge") {
      return { ok: false as const, error: "An excursion needs a decision: use it, hold it, or destroy it." };
    }
    // Whatever the learner decides, the medicine is in the condition it is
    // in. Choosing to dispense stock the data sheet condemned does not make
    // it safe; it only adds a fine to the loss.
    if (data.action === "quarantine") {
      for (const batchNo of (payload.affectedBatches ?? []) as string[]) {
        await db.from("wh_stock").update({ location: "quarantine" })
          .eq("facility_id", facility.id).eq("batch_no", batchNo);
      }
    }
    await db.from("wh_events")
      .update({ resolved: true, resolution: data.action }).eq("id", event.id);
    return { ok: true as const, resolution: data.action };
  }

  await db.from("wh_events")
    .update({ resolved: true, resolution: "acknowledged" }).eq("id", event.id);
  return { ok: true as const, resolution: "acknowledged" };
}

export async function advanceWeek(db: Db, userId: string) {
    const facility = await loadFacility(db, userId);
  if (!facility) return { ok: false as const, error: "No pharmacy open." };
  const period = Number(facility.current_period);
  const difficulty = (facility.difficulty ?? "medium") as Difficulty;
  const weeklyOverheads = Number(facility.weekly_overheads_paisa ?? 0);

  const [catalogue, stock, orders, unpaid, licenceRows, openEvents, registerRows,
         paperwork, lastPeriod] =
    await Promise.all([
      db.from("wh_catalogue").select("*, drugs(name)").eq("facility_id", facility.id),
      db.from("wh_stock").select("*").eq("facility_id", facility.id).gt("qty", 0),
      // Two queries, because an order matters to the close for two separate
      // reasons and they do not expire together. One is still on its way; the
      // other landed weeks ago and has not been paid for. Asking only for
      // orders still in transit means a delivered invoice is never presented
      // and the pharmacy gets its stock for nothing.
      db.from("wh_orders").select("*, wh_order_lines(*)").eq("facility_id", facility.id)
        .eq("status", "placed"),
      db.from("wh_orders").select("*, wh_order_lines(*)").eq("facility_id", facility.id)
        .eq("paid", false).neq("status", "cancelled"),
      db.from("wh_licences").select("*").eq("facility_id", facility.id),
      db.from("wh_events").select("*").eq("facility_id", facility.id).eq("resolved", false),
      db.from("wh_cd_register").select("*").eq("facility_id", facility.id),
      db.from("wh_paperwork").select("kind").eq("facility_id", facility.id).eq("period_no", period),
      db.from("wh_periods").select("closing_cash_paisa").eq("facility_id", facility.id)
        .eq("period_no", period - 1).maybeSingle(),
    ]);

  const lines = (catalogue.data ?? []) as Row[];
  const prices: Record<string, PricedDrug> = {};
  const demand: DemandProfile[] = [];
  const shelfLife = new Map<string, number>();
  const requiredZone: Record<string, StorageZone> = {};
  const catalogueByDrug = new Map<string, Row>();
  for (const line of lines) {
    catalogueByDrug.set(line.drug_id, line);
    prices[line.drug_id] = {
      drugId: line.drug_id,
      mrp: Number(line.mrp_paisa),
      tradePrice: Number(line.trade_price_paisa),
    };
    demand.push({
      drugId: line.drug_id,
      baseWeekly: Number(line.base_weekly),
      seasonality: Number(line.seasonality),
      peakWeek: Number(line.peak_week),
    });
    shelfLife.set(line.drug_id, Number(line.shelf_life_weeks));
    requiredZone[line.drug_id] = line.storage as StorageZone;
  }

  const stockRows = (stock.data ?? []) as Row[];
  const batches: StockBatch[] = stockRows.map((r) => ({
    drugId: r.drug_id,
    batchNo: r.batch_no,
    qty: Number(r.qty),
    expiresPeriod: Number(r.expires_period),
    unitCost: Number(r.unit_cost_paisa),
    location: r.location,
  }));

  // Merged and de-duplicated: an order that is both in transit and unpaid
  // comes back from both queries.
  const orderRows = [...new Map(
    [...((orders.data ?? []) as Row[]), ...((unpaid.data ?? []) as Row[])]
      .map((row) => [row.id as string, row]),
  ).values()];

  /* ---- 1. Licences mature and lapse before anyone looks at the shelf ---- */
  const licences: Licence[] = [];
  const licenceEvents: Row[] = [];
  for (const row of (licenceRows.data ?? []) as Row[]) {
    let status = row.status as Licence["status"];
    const expires = Number(row.expires_period);

    // A permit applied for weeks ago comes through on its date.
    if (status === "pending" && Number(row.issued_period) <= period) {
      status = "active";
      await db.from("wh_licences").update({ status }).eq("id", row.id);
    }
    if (status === "active" && expires < period) {
      status = "expired";
      await db.from("wh_licences").update({ status }).eq("id", row.id);
      licenceEvents.push({
        facility_id: facility.id,
        period_no: period,
        kind: "licence-expiry",
        payload: { licence: row.kind, expiredPeriod: expires },
        resolved: false,
      });
    }
    licences.push({
      kind: row.kind,
      status,
      issuedPeriod: Number(row.issued_period ?? 1),
      expiresPeriod: expires,
    });
  }
  if (licenceEvents.length) await db.from("wh_events").insert(licenceEvents);

  const trading = isTrading(facility, licences, period);

  /* ---- 2. What this week throws at them -------------------------------- */
  const eventStock: EventStock[] = stockRows.map((r) => ({
    drugId: r.drug_id,
    name: catalogueByDrug.get(r.drug_id)?.drugs?.name ?? "Medicine",
    batchNo: r.batch_no,
    qty: Number(r.qty),
    location: r.location,
    requiredZone: (requiredZone[r.drug_id] ?? "ambient") as Exclude<StorageZone, "quarantine">,
  }));

  // One arrival per order, represented by its largest line, so a short
  // delivery lands on something the learner can see is short.
  const arrivingLine = new Map<string, Row>();
  const arriving: Array<{ orderId: string; drugName: string; packs: number }> = [];
  for (const order of orderRows) {
    if (Number(order.eta_period) > period) continue;
    const biggest = [...((order.wh_order_lines ?? []) as Row[])]
      .sort((a, b) => Number(b.packs) - Number(a.packs))[0];
    if (!biggest) continue;
    arrivingLine.set(order.id, biggest);
    arriving.push({
      orderId: order.id,
      drugName: catalogueByDrug.get(biggest.drug_id)?.drugs?.name ?? "Medicine",
      packs: Number(biggest.packs),
    });
  }

  const rolled = rollEvents({
    period, seed: facility.seed, difficulty, stock: eventStock, arriving,
  });

  // A short delivery is applied to the order before the goods land, so what
  // arrives is what the supplier actually sent.
  for (const event of rolled) {
    if (event.kind !== "shortage") continue;
    const short = event as ShortageEvent;
    const line = arrivingLine.get(short.orderId);
    if (!line) continue;
    line.received_packs = short.delivered;
    await db.from("wh_order_lines")
      .update({ received_packs: short.delivered }).eq("id", line.id);
  }

  /* ---- 3. Notices from earlier weeks, answered or ignored --------------- */
  // Which notice costs what is decided by settleNotices, not here, so the
  // judgements can be tested and shown to a learner who disputes one.
  const answered = await db.from("wh_events")
    .select("*").eq("facility_id", facility.id).eq("resolved", true)
    .in("resolution", ["quarantined", "quarantine", "destroy", "use"]);

  const notices: OpenNotice[] = [
    ...((openEvents.data ?? []) as Row[]),
    ...((answered.data ?? []) as Row[]),
  ].map((row) => {
    const payload = (row.payload ?? {}) as Row;
    return {
      id: row.id as string,
      kind: row.kind as string,
      period: Number(row.period_no),
      resolved: Boolean(row.resolved),
      resolution: (row.resolution ?? null) as string | null,
      batchNo: payload.batchNo as string | undefined,
      affectedBatches: (payload.affectedBatches ?? []) as string[],
      requiredAction: payload.requiredAction,
    };
  });

  const settled = settleNotices(notices, batches, period);
  const condemned = settled.condemned;
  const charges: Array<{ kind: LedgerKind; amount: Paisa; note: string }> = [...settled.charges];
  // What went wrong this week, coded rather than matched on prose, so the
  // week can be scored and the learner told what cost them.
  const faults: Array<{ code: string; detail: string }> =
    settled.charges.map((c) => ({ code: c.code, detail: c.note }));
  for (const update of settled.updates) {
    await db.from("wh_events")
      .update({ resolved: true, resolution: update.resolution }).eq("id", update.id);
  }

  /* ---- 4. The inspector, if this is the week ---------------------------- */
  const inspection = rolled.find((e) => e.kind === "inspection");
  let suspendedUntil = Number(facility.suspended_until_period ?? 0);
  let inspectionResult: ReturnType<typeof inspect> | null = null;

  if (inspection) {
    const physical = new Map<string, number>();
    for (const row of stockRows) {
      physical.set(row.drug_id, (physical.get(row.drug_id) ?? 0) + Number(row.qty));
    }
    const registerByDrug = new Map<string, Row>(
      ((registerRows.data ?? []) as Row[]).map((r) => [r.drug_id, r]));

    const register: RegisterLine[] = [];
    for (const line of lines) {
      if (!line.controlled) continue;
      const book = registerByDrug.get(line.drug_id);
      const counted = physical.get(line.drug_id) ?? 0;
      if (!book && counted === 0) continue;
      register.push({
        drugId: line.drug_id,
        name: line.drugs?.name ?? "Controlled medicine",
        expected: Number(book?.balance ?? 0),
        counted,
      });
    }

    const complianceStock: ComplianceStock[] = stockRows.map((r) => ({
      drugId: r.drug_id,
      batchNo: r.batch_no,
      qty: Number(r.qty),
      expiresPeriod: Number(r.expires_period),
      location: r.location,
      requiredZone: (requiredZone[r.drug_id] ?? "ambient") as Exclude<StorageZone, "quarantine">,
      controlled: Boolean(catalogueByDrug.get(r.drug_id)?.controlled),
    }));

    // An inspector only asks for a fridge log where there is a fridge in use.
    const kept = new Set(((paperwork.data ?? []) as Row[]).map((r) => r.kind as string));
    const usesFridge = complianceStock.some((s) => s.requiredZone === "cold-chain" && s.qty > 0);

    inspectionResult = inspect({
      period,
      licences,
      stock: complianceStock,
      register,
      temperatureLogKept: !usesFridge || kept.has("temperature-log"),
      cdRegisterKept: kept.has("cd-register"),
    });

    if (inspectionResult.totalFine > 0) {
      charges.push({
        kind: "penalty",
        amount: inspectionResult.totalFine,
        note: `Inspection, week ${period}: ${inspectionResult.findings.length} finding(s)`,
      });
    }
    faults.push(...inspectionResult.findings.map((f) => ({ code: f.code, detail: f.detail })));
    if (inspectionResult.suspended) suspendedUntil = period + SUSPENSION_WEEKS;

    await db.from("wh_events").insert({
      facility_id: facility.id,
      period_no: period,
      kind: "inspection",
      payload: {
        notice: 0,
        findings: inspectionResult.findings,
        totalFine: inspectionResult.totalFine,
        suspended: inspectionResult.suspended,
        passed: inspectionResult.passed,
        suspendedUntilPeriod: inspectionResult.suspended ? suspendedUntil : null,
      },
      // An inspection is a report, not a task. There is nothing to answer.
      resolved: true,
      resolution: inspectionResult.passed ? "passed" : "findings recorded",
    });
  }

  /* ---- 5. Recalls, excursions and short deliveries raised this week ----- */
  const raised = rolled.filter((e) => e.kind !== "inspection");
  if (raised.length) {
    await db.from("wh_events").insert(raised.map((event) => ({
      facility_id: facility.id,
      period_no: period,
      kind: event.kind,
      payload: event as unknown as Row,
      // A short delivery is information. A recall or an excursion is a
      // decision, and it stays open until the learner makes it.
      resolved: event.kind === "shortage",
      resolution: event.kind === "shortage" ? "noted" : null,
    })));
  }

  /* ---- 6. The week itself ----------------------------------------------- */
  const pending: PendingOrder[] = orderRows.map((o) => ({
    id: o.id,
    etaPeriod: Number(o.eta_period),
    paymentDuePeriod: Number(o.payment_due_period),
    total: Number(o.total_paisa),
    paid: Boolean(o.paid),
    delivered: o.status === "delivered",
    lines: ((o.wh_order_lines ?? []) as Row[]).map((l) => ({
      drugId: l.drug_id,
      packs: Number(l.packs),
      unitPrice: Number(l.unit_price_paisa),
      shelfLifeWeeks: shelfLife.get(l.drug_id) ?? 52,
      receivedPacks: l.received_packs === null || l.received_packs === undefined
        ? undefined : Number(l.received_packs),
    })),
  }));

  const result = closeWeek({
    facility: {
      period,
      cash: Number(facility.cash_paisa),
      overdraft: Number(facility.overdraft_paisa),
      seed: facility.seed,
    },
    stock: batches,
    orders: pending,
    prices,
    demand,
    overheads: weeklyOverheads,
    trading,
    requiredZone,
    condemned,
    charges,
  });

  /* ---- 7. Write it all back --------------------------------------------- */
  // Stock is replaced wholesale rather than diffed. At forty lines this is a
  // handful of rows, and a replace cannot leave a batch behind the way a
  // partial update can.
  await db.from("wh_stock").delete().eq("facility_id", facility.id);
  if (result.stock.length) {
    await db.from("wh_stock").insert(result.stock.map((b) => ({
      facility_id: facility.id,
      drug_id: b.drugId,
      batch_no: b.batchNo,
      qty: b.qty,
      expires_period: b.expiresPeriod,
      unit_cost_paisa: b.unitCost,
      location: b.location,
      received_period: period,
    })));
  }

  // Buying faults are read off the result rather than reported by anyone.
  // Turning demand away and letting stock die are the two ways the ordering
  // decision goes wrong, and a learner should be told which one they did.
  if (result.kpis.serviceLevel < STOCKOUT_SERVICE_LEVEL && trading) {
    const short = result.perDrug.reduce((n, d) => n + d.short, 0);
    faults.push({
      code: "stock-out",
      detail: `${short} pack(s) of demand went unserved - ${result.kpis.serviceLevel.toFixed(0)}% service level.`,
    });
  }
  if (result.kpis.wastagePercent > OVER_ORDERED_WASTAGE_PERCENT) {
    faults.push({
      code: "over-ordered",
      detail: `${result.kpis.wastagePercent.toFixed(1)}% of the week's takings written off as dead stock.`,
    });
  }

  // Stock destroyed by bad storage is a fault too, and one nobody reported.
  if (result.spoiled.length) {
    faults.push({
      code: "cold-chain-broken",
      detail: `${result.spoiled.length} batch(es) destroyed - stored outside the cold chain`,
    });
  }

  for (const orderId of result.delivered) {
    await db.from("wh_orders").update({ status: "delivered" }).eq("id", orderId);
  }
  for (const payment of result.paid) {
    await db.from("wh_orders").update({ paid: true }).eq("id", payment.orderId);
  }

  const penalties = charges.reduce(
    (sum, c) => sum + (c.kind === "penalty" ? c.amount : 0), 0);
  const fees = await db.from("wh_ledger").select("amount_paisa")
    .eq("facility_id", facility.id).eq("period_no", period).eq("kind", "licence");
  const feesPaid = ((fees.data ?? []) as Row[])
    .reduce((sum, r) => sum + Math.abs(Number(r.amount_paisa)), 0);

  await db.from("wh_periods").insert({
    facility_id: facility.id,
    period_no: period,
    revenue_paisa: result.kpis.revenue,
    cogs_paisa: result.kpis.cogs,
    wastage_paisa: result.kpis.wastage,
    purchases_paisa: result.paid.reduce((sum, p) => sum + p.amount, 0),
    overheads_paisa: weeklyOverheads,
    penalties_paisa: penalties,
    fees_paisa: feesPaid,
    // The week opened where the last one closed. Fees paid during the week
    // are in the ledger, so opening plus the ledger still lands on closing.
    opening_cash_paisa: lastPeriod.data
      ? Number(lastPeriod.data.closing_cash_paisa)
      : Number(facility.opening_cash_paisa ?? facility.cash_paisa),
    closing_cash_paisa: result.kpis.closingCash,
    demanded: result.perDrug.reduce((n, d) => n + d.demanded, 0),
    sold: result.perDrug.reduce((n, d) => n + d.sold, 0),
  });

  if (result.ledger.length) {
    await db.from("wh_ledger").insert(result.ledger.map((entry) => ({
      facility_id: facility.id,
      period_no: period,
      kind: entry.kind,
      amount_paisa: entry.amount,
      note: entry.note,
    })));
  }

  await db.from("wh_facilities").update({
    current_period: period + 1,
    cash_paisa: result.kpis.closingCash,
    status: result.insolvent ? "insolvent" : "running",
    suspended_until_period: suspendedUntil,
    updated_at: new Date().toISOString(),
  }).eq("id", facility.id);

  return {
    ok: true as const,
    period,
    kpis: result.kpis,
    perDrug: result.perDrug,
    writeOffs: result.writeOffs,
    spoiled: result.spoiled,
    condemned: result.condemned,
    delivered: result.delivered,
    paid: result.paid,
    insolvent: result.insolvent,
    traded: trading,
    suspendedUntilPeriod: suspendedUntil,
    events: rolled,
    inspection: inspectionResult,
    charges,
    faults,
  };
}
