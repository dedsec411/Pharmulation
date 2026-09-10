import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  chooseCatalogue, openingStock, STARTING,
  type CatalogueDrug, type CatalogueLine, type Difficulty,
} from "@/lib/warehouse/bootstrap";
import { closeWeek, type PendingOrder } from "@/lib/warehouse/week";
import {
  orderCost, RUPEE, type Paisa, type PricedDrug, type StockBatch, type DemandProfile,
  type VolumeBreak,
} from "@/lib/warehouse/economics";

/**
 * Running a facility.
 *
 * Every one of these uses the caller's own Supabase client rather than the
 * service role, so row-level security is what keeps one learner's pharmacy out
 * of another's - the policies do the work, not a filter written by hand here
 * that could be forgotten on the one query that mattered.
 *
 * The simulation itself lives in lib/warehouse and is pure. These functions
 * only load state, hand it over, and write back what came out, which is what
 * makes the arithmetic testable without a database.
 */

/** Distributors here discount on volume. Ordering big is cheaper per pack and
 *  ties up the cash that buys next week - which is the whole tension. */
const SUPPLIER_BREAKS: readonly VolumeBreak[] = [
  { minPacks: 50, discountPercent: 3 },
  { minPacks: 150, discountPercent: 6 },
  { minPacks: 400, discountPercent: 10 },
];

/** Suppliers sell on 30-day terms, which is four of our weeks. */
const PAYMENT_TERMS_WEEKS = 4;

const CATALOGUE_SIZE = 40;

type Row = Record<string, any>;

/* ------------------------------------------------------------------ *
 * Opening a facility
 * ------------------------------------------------------------------ */

export const createFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    name: z.string().min(1).max(60).default("My Pharmacy"),
    city: z.string().min(1).max(40).default("Karachi"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;

    // One running facility each. A learner who went under starts a new one;
    // the old one is kept, because the post-mortem is the lesson.
    const existing = await db.from("wh_facilities")
      .select("id").eq("user_id", context.userId).eq("status", "running").maybeSingle();
    if (existing.data?.id) {
      return { ok: false as const, error: "You already have a pharmacy running.", facilityId: existing.data.id };
    }

    const drugs = await db.from("drugs")
      .select("id, name, generic_name, category, drug_class").limit(2000);
    if (drugs.error || !drugs.data?.length) {
      return { ok: false as const, error: "Could not load the medicine catalogue." };
    }

    const difficulty = data.difficulty as Difficulty;
    const start = STARTING[difficulty];
    const seed = crypto.randomUUID();
    const lines = chooseCatalogue(drugs.data as CatalogueDrug[], seed, CATALOGUE_SIZE);
    if (!lines.length) return { ok: false as const, error: "The catalogue is empty." };

    const facility = await db.from("wh_facilities").insert({
      user_id: context.userId,
      name: data.name,
      city: data.city,
      difficulty,
      current_period: 1,
      cash_paisa: start.cash,
      overdraft_paisa: start.overdraft,
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

    await db.from("wh_stock").insert(
      openingStock(lines, seed, start.openingCoverWeeks).map((b) => ({
        facility_id: facilityId,
        drug_id: b.drugId,
        batch_no: b.batchNo,
        qty: b.qty,
        expires_period: b.expiresPeriod,
        unit_cost_paisa: b.unitCost,
        location: b.location,
        received_period: 1,
      })));

    // A Drug Sale Licence to trade at all. No narcotics permit: obtaining one
    // is a goal, and until it exists the controlled lines cannot be ordered.
    await db.from("wh_licences").insert({
      facility_id: facilityId,
      kind: "drug_sale",
      status: "active",
      issued_period: 1,
      expires_period: 1 + start.licenceWeeks,
      fee_paisa: 15_000 * RUPEE,
    });

    return { ok: true as const, facilityId };
  });

/* ------------------------------------------------------------------ *
 * Reading the position
 * ------------------------------------------------------------------ */

async function loadFacility(db: any, userId: string) {
  const facility = await db.from("wh_facilities")
    .select("*").eq("user_id", userId).eq("status", "running").maybeSingle();
  return facility.data as Row | null;
}

export const getFacilityState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const facility = await loadFacility(db, context.userId);
    if (!facility) return { ok: false as const, error: "No pharmacy open." };

    const [catalogue, stock, orders, periods, events, licences] = await Promise.all([
      db.from("wh_catalogue").select("*, drugs(name, category)").eq("facility_id", facility.id),
      db.from("wh_stock").select("*").eq("facility_id", facility.id).gt("qty", 0),
      db.from("wh_orders").select("*, wh_order_lines(*)").eq("facility_id", facility.id)
        .neq("status", "cancelled"),
      db.from("wh_periods").select("*").eq("facility_id", facility.id)
        .order("period_no", { ascending: false }).limit(12),
      db.from("wh_events").select("*").eq("facility_id", facility.id).eq("resolved", false),
      db.from("wh_licences").select("*").eq("facility_id", facility.id),
    ]);

    return {
      ok: true as const,
      facility,
      catalogue: catalogue.data ?? [],
      stock: stock.data ?? [],
      orders: orders.data ?? [],
      periods: periods.data ?? [],
      events: events.data ?? [],
      licences: licences.data ?? [],
    };
  });

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    supplier: z.string().min(1).max(60).default("Central Distributors"),
    lines: z.array(z.object({
      drugId: z.string().uuid(),
      packs: z.number().int().min(1).max(5000),
    })).min(1).max(40),
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const facility = await loadFacility(db, context.userId);
    if (!facility) return { ok: false as const, error: "No pharmacy open." };

    const catalogue = await db.from("wh_catalogue").select("*").eq("facility_id", facility.id);
    const byDrug = new Map<string, Row>((catalogue.data ?? []).map((r: Row) => [r.drug_id, r]));

    const licences = await db.from("wh_licences")
      .select("kind, status").eq("facility_id", facility.id);
    const hasNarcotics = (licences.data ?? []).some(
      (l: Row) => l.kind === "narcotics" && l.status === "active");

    let total: Paisa = 0;
    let eta = facility.current_period;
    const rows: Row[] = [];

    for (const line of data.lines) {
      const entry = byDrug.get(line.drugId);
      if (!entry) return { ok: false as const, error: "That medicine is not on your list." };

      // No permit, no controlled drugs. Refused at the order, which is where a
      // distributor would refuse it, rather than discovered at an inspection.
      if (entry.controlled && !hasNarcotics) {
        return {
          ok: false as const,
          error: "You cannot order controlled medicines without a narcotics permit.",
        };
      }

      const priced: PricedDrug = {
        drugId: entry.drug_id, mrp: Number(entry.mrp_paisa), tradePrice: Number(entry.trade_price_paisa),
      };
      const cost = orderCost(priced, line.packs, SUPPLIER_BREAKS);
      total += cost;
      eta = Math.max(eta, facility.current_period + Number(entry.lead_time_weeks));
      rows.push({
        drug_id: line.drugId,
        packs: line.packs,
        unit_price_paisa: Math.round(cost / line.packs),
      });
    }

    const order = await db.from("wh_orders").insert({
      facility_id: facility.id,
      supplier: data.supplier,
      placed_period: facility.current_period,
      eta_period: eta,
      status: "placed",
      total_paisa: total,
      payment_due_period: facility.current_period + PAYMENT_TERMS_WEEKS,
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
      paymentDuePeriod: facility.current_period + PAYMENT_TERMS_WEEKS,
    };
  });

/* ------------------------------------------------------------------ *
 * Putting stock away
 * ------------------------------------------------------------------ */

export const putAwayStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    moves: z.array(z.object({
      stockId: z.string().uuid(),
      zone: z.enum(["ambient", "cold-chain", "cd-safe", "flammables"]),
    })).min(1).max(200),
  }))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const facility = await loadFacility(db, context.userId);
    if (!facility) return { ok: false as const, error: "No pharmacy open." };

    const ids = data.moves.map((m) => m.stockId);
    const [batches, catalogue] = await Promise.all([
      db.from("wh_stock").select("id, drug_id, location").eq("facility_id", facility.id).in("id", ids),
      db.from("wh_catalogue").select("drug_id, storage, drugs(name)").eq("facility_id", facility.id),
    ]);
    const required = new Map<string, Row>(
      (catalogue.data ?? []).map((r: Row) => [r.drug_id, r]));
    const byId = new Map<string, Row>((batches.data ?? []).map((r: Row) => [r.id, r]));

    const wrong: string[] = [];
    const good: Array<{ id: string; zone: string }> = [];
    for (const move of data.moves) {
      const batch = byId.get(move.stockId);
      if (!batch) continue;
      const rule = required.get(batch.drug_id);
      const zone = rule?.storage ?? "ambient";
      if (zone !== move.zone) {
        const name = rule?.drugs?.name ?? "That medicine";
        wrong.push(`${name} belongs in ${zone.replace("-", " ")}.`);
      } else {
        good.push({ id: move.stockId, zone: move.zone });
      }
    }

    // Refused rather than accepted and punished later. Mis-stored stock has
    // real consequences - a vaccine left out is destroyed - and until the
    // events pass models that properly, telling the learner now is the honest
    // behaviour rather than silently ruining their week.
    if (wrong.length) {
      return { ok: false as const, error: "Some of that is in the wrong place.", detail: wrong };
    }

    for (const move of good) {
      await db.from("wh_stock").update({ location: move.zone }).eq("id", move.id);
    }
    return { ok: true as const, moved: good.length };
  });

/* ------------------------------------------------------------------ *
 * Closing the week
 * ------------------------------------------------------------------ */

export const advanceWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase as any;
    const facility = await loadFacility(db, context.userId);
    if (!facility) return { ok: false as const, error: "No pharmacy open." };

    const [catalogue, stock, orders] = await Promise.all([
      db.from("wh_catalogue").select("*").eq("facility_id", facility.id),
      db.from("wh_stock").select("*").eq("facility_id", facility.id).gt("qty", 0),
      db.from("wh_orders").select("*, wh_order_lines(*)").eq("facility_id", facility.id)
        .eq("status", "placed"),
    ]);

    const lines = (catalogue.data ?? []) as Row[];
    const prices: Record<string, PricedDrug> = {};
    const demand: DemandProfile[] = [];
    const shelfLife = new Map<string, number>();
    for (const line of lines) {
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
    }

    const batches: StockBatch[] = (stock.data ?? []).map((r: Row) => ({
      drugId: r.drug_id,
      batchNo: r.batch_no,
      qty: Number(r.qty),
      expiresPeriod: Number(r.expires_period),
      unitCost: Number(r.unit_cost_paisa),
      location: r.location,
    }));

    const pending: PendingOrder[] = (orders.data ?? []).map((o: Row) => ({
      id: o.id,
      etaPeriod: Number(o.eta_period),
      paymentDuePeriod: Number(o.payment_due_period),
      total: Number(o.total_paisa),
      paid: Boolean(o.paid),
      delivered: o.status === "delivered",
      lines: (o.wh_order_lines ?? []).map((l: Row) => ({
        drugId: l.drug_id,
        packs: Number(l.packs),
        unitPrice: Number(l.unit_price_paisa),
        shelfLifeWeeks: shelfLife.get(l.drug_id) ?? 52,
        receivedPacks: l.received_packs === null ? undefined : Number(l.received_packs),
      })),
    }));

    const difficulty = (facility.difficulty ?? "medium") as Difficulty;
    const result = closeWeek({
      facility: {
        period: Number(facility.current_period),
        cash: Number(facility.cash_paisa),
        overdraft: Number(facility.overdraft_paisa),
        seed: facility.seed,
      },
      stock: batches,
      orders: pending,
      prices,
      demand,
      overheads: STARTING[difficulty].weeklyOverheads,
    });

    const period = Number(facility.current_period);

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

    for (const orderId of result.delivered) {
      await db.from("wh_orders").update({ status: "delivered" }).eq("id", orderId);
    }
    for (const payment of result.paid) {
      await db.from("wh_orders").update({ paid: true }).eq("id", payment.orderId);
    }

    await db.from("wh_periods").insert({
      facility_id: facility.id,
      period_no: period,
      revenue_paisa: result.kpis.revenue,
      cogs_paisa: result.kpis.cogs,
      wastage_paisa: result.kpis.wastage,
      purchases_paisa: result.paid.reduce((sum, p) => sum + p.amount, 0),
      overheads_paisa: STARTING[difficulty].weeklyOverheads,
      opening_cash_paisa: Number(facility.cash_paisa),
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
      updated_at: new Date().toISOString(),
    }).eq("id", facility.id);

    return {
      ok: true as const,
      period,
      kpis: result.kpis,
      perDrug: result.perDrug,
      writeOffs: result.writeOffs,
      delivered: result.delivered,
      paid: result.paid,
      insolvent: result.insolvent,
    };
  });
