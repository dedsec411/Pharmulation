import { describe, expect, it } from "vitest";
import { createFakeDb, type FakeDb } from "./fake-db";
import * as run from "./run";
import { LICENCE_FEE, NARCOTICS_LEAD_WEEKS, SUSPENSION_WEEKS } from "./compliance";
import { ODDS } from "./events";
import { orderAnalysis } from "./supplier";
import { RUPEE } from "./economics";

/**
 * Playing the whole mode through.
 *
 * These drive the real functions against an in-memory database, so what is
 * tested is the thing that runs: the order in which a week resolves, what is
 * written back, and whether the rules survive contact with each other. The
 * engine's own tests cover the arithmetic; these cover the wiring, which is
 * where the week close can quietly do the wrong thing for months.
 */

const USER = "user-1";
const OTHER = "user-2";

const CATEGORIES = [
  "Analgesic", "Antibiotic", "Antidiabetic", "Cardiovascular", "Antihistamine",
  "Gastrointestinal", "Respiratory", "Anxiolytic",
];

/** Enough of a catalogue for the picker to spread across categories. */
function drugTable() {
  const named = [
    ["Paracetamol", "Analgesic"], ["Ibuprofen", "Analgesic"], ["Diclofenac", "Analgesic"],
    ["Tramadol", "Analgesic"], ["Morphine Sulfate", "Analgesic"],
    ["Amoxicillin", "Antibiotic"], ["Azithromycin", "Antibiotic"], ["Ciprofloxacin", "Antibiotic"],
    ["Metformin", "Antidiabetic"], ["Insulin Glargine", "Antidiabetic"], ["Insulin Aspart", "Antidiabetic"],
    ["Amlodipine", "Cardiovascular"], ["Atenolol", "Cardiovascular"], ["Losartan", "Cardiovascular"],
    ["Cetirizine", "Antihistamine"], ["Loratadine", "Antihistamine"],
    ["Omeprazole", "Gastrointestinal"], ["Ranitidine", "Gastrointestinal"],
    ["Salbutamol", "Respiratory"], ["Montelukast", "Respiratory"],
    ["Alprazolam", "Anxiolytic"], ["Diazepam", "Anxiolytic"],
  ];
  const rows = named.map(([name, category], i) => ({
    id: `drug-${i}`, name, generic_name: name, category, drug_class: category,
  }));
  // Padding so a forty-line catalogue is actually reachable.
  for (let i = 0; i < 40; i++) {
    rows.push({
      id: `drug-pad-${i}`,
      name: `Filler ${i}`,
      generic_name: `Filler ${i}`,
      category: CATEGORIES[i % CATEGORIES.length],
      drug_class: CATEGORIES[i % CATEGORIES.length],
    });
  }
  return rows;
}

async function openShop(
  over: { difficulty?: "easy" | "medium" | "hard"; seed?: string } = {},
): Promise<{ db: FakeDb; facilityId: string }> {
  const db = createFakeDb({ drugs: drugTable() });

  // A seeded shop gets deterministic ids too. The facility's own seed decides
  // the catalogue and the opening shelf as well as the weather, so leaving it
  // to a real uuid would make two "identical" runs differ in what they sell.
  const realUuid = crypto.randomUUID;
  if (over.seed) {
    let n = 0;
    (crypto as any).randomUUID = () => `${over.seed}-${String(++n).padStart(4, "0")}`;
  }
  try {
    const created: any = await run.createFacility(db, USER, {
      name: "Test Pharmacy", city: "Karachi", difficulty: over.difficulty ?? "medium",
    });
    expect(created.ok).toBe(true);
    return { db, facilityId: created.facilityId };
  } finally {
    (crypto as any).randomUUID = realUuid;
  }
}

const facilityRow = (db: FakeDb) => db.rows("wh_facilities")[0];
/** Orders the learner placed, ignoring the account inherited with the shop. */
const placedOrders = (db: FakeDb) =>
  db.rows("wh_orders").filter((o) => o.supplier !== "Previous owner's account");
const state = (db: FakeDb) => run.getFacilityState(db, USER) as Promise<any>;
const close = (db: FakeDb) => run.advanceWeek(db, USER) as Promise<any>;

/** Put everything sitting in goods-in where it belongs. */
async function putEverythingAway(db: FakeDb) {
  const s: any = await state(db);
  if (!s.ok) return { ok: false as const, moved: 0 };
  const storage = new Map<string, string>(
    s.catalogue.map((c: any) => [c.drug_id, c.storage]));
  const waiting = s.stock.filter((b: any) => b.location === "quarantine");
  if (!waiting.length) return { ok: true as const, moved: 0 };
  return run.putAwayStock(db, USER, {
    moves: waiting.map((b: any) => ({
      stockId: b.id, zone: storage.get(b.drug_id) as any ?? "ambient",
    })),
    confirm: false,
  });
}

/* ------------------------------------------------------------------ *
 * Opening
 * ------------------------------------------------------------------ */

describe("opening a pharmacy", () => {
  it("stocks the shelf, issues a sale licence and withholds the narcotics permit", async () => {
    const { db } = await openShop();
    const s = await state(db);

    expect(s.ok).toBe(true);
    expect(s.facility.current_period).toBe(1);
    // Cash is worked out from the catalogue this shop happened to get, so
    // what matters is that it is roughly a week of buying rather than a
    // particular number.
    expect(Number(s.facility.cash_paisa)).toBeGreaterThan(0);
    expect(Number(s.facility.weekly_overheads_paisa)).toBeGreaterThan(0);
    expect(s.catalogue.length).toBeGreaterThan(10);
    expect(s.stock.length).toBeGreaterThan(0);
    expect(s.licences.map((l: any) => l.kind)).toEqual(["drug_sale"]);
    expect(s.trading).toBe(true);
  });

  // Handing a new facility stock it is not licensed to hold would fail the
  // first inspection for a decision the learner never made.
  it("opens with nothing controlled on the shelf and nothing in goods-in", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const controlled = new Set(
      s.catalogue.filter((c: any) => c.controlled).map((c: any) => c.drug_id));

    expect(s.stock.some((b: any) => controlled.has(b.drug_id))).toBe(false);
    expect(s.stock.some((b: any) => b.location === "quarantine")).toBe(false);
  });

  it("refuses to open a second pharmacy while one is running", async () => {
    const { db, facilityId } = await openShop();
    const again: any = await run.createFacility(db, USER, {
      name: "Another", city: "Lahore", difficulty: "easy",
    });
    expect(again.ok).toBe(false);
    expect(again.facilityId).toBe(facilityId);
    expect(db.rows("wh_facilities")).toHaveLength(1);
  });

  // Every query is scoped by user id. Row-level security would catch this in
  // production; the test is here because the fake database has no policies and
  // would happily hand over another learner's shop if the code asked it to.
  it("shows one learner nothing of another's", async () => {
    const { db } = await openShop();
    expect((await run.getFacilityState(db, OTHER) as any).ok).toBe(false);
    expect((await run.advanceWeek(db, OTHER) as any).ok).toBe(false);
    expect((await run.logTemperature(db, OTHER) as any).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * A week
 * ------------------------------------------------------------------ */

describe("closing a week", () => {
  it("advances the period and records it exactly once", async () => {
    const { db } = await openShop();
    const result = await close(db);

    expect(result.ok).toBe(true);
    expect(result.period).toBe(1);
    expect(facilityRow(db).current_period).toBe(2);
    expect(db.rows("wh_periods")).toHaveLength(1);
    expect(db.rows("wh_periods")[0].period_no).toBe(1);
  });

  it("sells stock and takes money for it", async () => {
    const { db } = await openShop();
    const result = await close(db);
    expect(result.kpis.revenue).toBeGreaterThan(0);
    expect(result.traded).toBe(true);
    expect(db.rows("wh_ledger").some((r) => r.kind === "sale")).toBe(true);
  });

  // The ledger has to explain the cash, or a learner whose balance fell has no
  // way to find out what took it.
  it("leaves a ledger that reconciles the week", async () => {
    const { db } = await openShop();
    for (let i = 0; i < 4; i++) await close(db);

    for (const period of db.rows("wh_periods")) {
      const entries = db.rows("wh_ledger").filter((l) => l.period_no === period.period_no);
      const movement = entries.reduce((sum, l) => sum + Number(l.amount_paisa), 0);
      expect(Number(period.opening_cash_paisa) + movement)
        .toBe(Number(period.closing_cash_paisa));
    }
  });

  // A fee is paid the moment it is applied for, mid-week, while the period
  // report is written at the close. Getting the opening balance from the
  // facility's cash rather than the last week's closing would hide the fee.
  it("reconciles a week a licence fee was paid in", async () => {
    const { db } = await openShop();
    await close(db);
    await run.applyForLicence(db, USER, { kind: "narcotics" });
    const result = await close(db);

    const period = db.rows("wh_periods").find((p) => p.period_no === result.period)!;
    const entries = db.rows("wh_ledger").filter((l) => l.period_no === result.period);
    const movement = entries.reduce((sum, l) => sum + Number(l.amount_paisa), 0);

    expect(entries.some((l) => l.kind === "licence")).toBe(true);
    expect(Number(period.fees_paisa)).toBe(LICENCE_FEE.narcotics);
    expect(Number(period.opening_cash_paisa) + movement)
      .toBe(Number(period.closing_cash_paisa));
  });

  it("carries cash from one week's close to the next week's open", async () => {
    const { db } = await openShop();
    for (let i = 0; i < 4; i++) await close(db);

    const periods = db.rows("wh_periods").sort((a, b) => a.period_no - b.period_no);
    for (let i = 1; i < periods.length; i++) {
      expect(Number(periods[i].opening_cash_paisa))
        .toBe(Number(periods[i - 1].closing_cash_paisa));
    }
    expect(Number(facilityRow(db).cash_paisa))
      .toBe(Number(periods[periods.length - 1].closing_cash_paisa));
  });

  // A recall names a batch number and nothing else. Two batches sharing one
  // would withdraw stock that was never recalled.
  it("never mints two batches with the same number", async () => {
    const { db } = await openShop({ seed: "batch-numbers" });
    const seen = new Set<string>();
    for (let week = 1; week <= 10; week++) {
      const s = await state(db);
      for (const line of s.catalogue.slice(0, 3)) {
        await run.placeOrder(db, USER, {
          supplier: "Central Distributors",
          lines: [{ drugId: line.drug_id, packs: 20 }],
        });
      }
      await close(db);
      for (const batch of db.rows("wh_stock")) {
        seen.add(String(batch.batch_no));
      }
      const numbers = db.rows("wh_stock").map((b) => String(b.batch_no));
      expect(new Set(numbers).size).toBe(numbers.length);
      await putEverythingAway(db);
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  // The close used to ask only for orders still in transit. Delivery marks an
  // order delivered, and the invoice falls due weeks after that - so every
  // invoice was presented on a week the order was no longer in the query, and
  // the pharmacy got its stock for nothing.
  it("pays for stock that was delivered weeks ago", async () => {
    const { db } = await openShop({ seed: "invoices" });
    const s = await state(db);
    const line = s.catalogue.find((c: any) => !c.controlled);
    const order: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: line.drug_id, packs: 40 }],
    });

    let paid = false;
    for (let week = 0; week < order.paymentDuePeriod + 2 && !paid; week++) {
      const result = await close(db);
      paid = result.paid.some((p: any) => p.orderId === order.orderId);
    }

    expect(paid).toBe(true);
    expect(db.rows("wh_orders").find((o) => o.id === order.orderId)!.paid).toBe(true);
  });

  it("leaves no invoice unpaid once its week has passed", async () => {
    const { db } = await openShop({ seed: "invoices" });
    const s = await state(db);
    for (const line of s.catalogue.slice(0, 5)) {
      await run.placeOrder(db, USER, {
        supplier: "Central Distributors",
        lines: [{ drugId: line.drug_id, packs: 20 }],
      });
    }
    for (let week = 0; week < 10; week++) {
      await close(db);
      await putEverythingAway(db);
    }

    const period = Number(facilityRow(db).current_period);
    const overdue = db.rows("wh_orders").filter(
      (o) => !o.paid && Number(o.payment_due_period) < period && o.status !== "cancelled");
    expect(overdue).toEqual([]);
  });

  it("never leaves a batch with a negative or fractional quantity", async () => {
    const { db } = await openShop();
    for (let i = 0; i < 8; i++) {
      await close(db);
      for (const batch of db.rows("wh_stock")) {
        expect(Number.isInteger(Number(batch.qty))).toBe(true);
        expect(Number(batch.qty)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // Twelve weeks of everything interacting: demand, expiry, events, the
  // inspector. Nothing here should ever throw or produce a NaN.
  it("survives a long run without producing a number that is not a number", async () => {
    const { db } = await openShop({ seed: "long-run" });
    for (let week = 1; week <= 12; week++) {
      const result = await close(db);
      expect(result.ok).toBe(true);
      for (const value of Object.values(result.kpis)) {
        expect(Number.isFinite(value as number)).toBe(true);
      }
      await putEverythingAway(db);
    }
    expect(facilityRow(db).current_period).toBe(13);
    expect(db.rows("wh_periods")).toHaveLength(12);
  });
});

/* ------------------------------------------------------------------ *
 * Ordering and goods-in
 * ------------------------------------------------------------------ */

describe("ordering", () => {
  async function someLine(db: FakeDb, controlled = false) {
    const s = await state(db);
    return s.catalogue.find((c: any) => Boolean(c.controlled) === controlled);
  }

  it("places an order that lands weeks later and is paid weeks after that", async () => {
    const { db } = await openShop();
    const line = await someLine(db);
    const order: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: line.drug_id, packs: 60 }],
    });

    expect(order.ok).toBe(true);
    expect(order.etaPeriod).toBeGreaterThan(1);
    expect(order.paymentDuePeriod).toBeGreaterThan(order.etaPeriod - 1);
    expect(db.rows("wh_order_lines")).toHaveLength(1);
  });

  // The screen quotes the whole order's volume break. An invoice priced line by
  // line would charge more than the learner was told, which is the one thing an
  // ordering screen must never do.
  it("charges exactly what the ordering screen quoted", async () => {
    const { db } = await openShop({ seed: "quote" });
    const s = await state(db);
    const picked = s.catalogue.filter((c: any) => !c.controlled).slice(0, 6);
    const lines = picked.map((c: any) => ({ drugId: c.drug_id, packs: 30 }));

    const quoted = orderAnalysis(picked.map((c: any) => ({
      drug: {
        drugId: c.drug_id, mrp: Number(c.mrp_paisa), tradePrice: Number(c.trade_price_paisa),
      },
      packs: 30,
    })));
    expect(quoted.discountPercent).toBeGreaterThan(0);

    const order: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors", lines,
    });
    expect(order.ok).toBe(true);
    expect(order.total).toBe(quoted.total);
    expect(Number(db.rows("wh_orders").find((o) => o.id === order.orderId)!.total_paisa))
      .toBe(quoted.total);
  });

  it("bills what the order lines add up to", async () => {
    const { db } = await openShop({ seed: "quote" });
    const s = await state(db);
    const picked = s.catalogue.filter((c: any) => !c.controlled).slice(0, 4);
    const order: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: picked.map((c: any) => ({ drugId: c.drug_id, packs: 40 })),
    });

    const lineTotal = db.rows("wh_order_lines")
      .filter((l) => l.order_id === order.orderId)
      .reduce((sum, l) => sum + Number(l.unit_price_paisa) * Number(l.packs), 0);
    expect(lineTotal).toBe(order.total);
  });

  it("refuses a controlled medicine without the permit", async () => {
    const { db } = await openShop();
    const line = await someLine(db, true);
    const refused: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: line.drug_id, packs: 10 }],
    });
    expect(refused.ok).toBe(false);
    expect(refused.error).toContain("narcotics permit");
    expect(placedOrders(db)).toHaveLength(0);
  });

  it("refuses a medicine the pharmacy does not carry", async () => {
    const { db } = await openShop();
    const refused: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: "drug-does-not-exist", packs: 10 }],
    });
    expect(refused.ok).toBe(false);
    expect(placedOrders(db)).toHaveLength(0);
  });

  // Goods-in is the whole point of quarantine: what arrives cannot be sold
  // until someone puts it somewhere.
  it("quarantines what arrives and keeps it out of the week's sales", async () => {
    const { db } = await openShop();
    const line = await someLine(db);
    await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: line.drug_id, packs: 80 }],
    });

    for (let i = 0; i < 4; i++) {
      const result = await close(db);
      if (result.delivered.length) break;
    }

    const s = await state(db);
    const waiting = s.stock.filter((b: any) => b.location === "quarantine");
    expect(waiting.length).toBeGreaterThan(0);
  });

  it("puts stock away where it belongs, and only then", async () => {
    const { db } = await openShop();
    const line = await someLine(db);
    await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: line.drug_id, packs: 80 }],
    });
    for (let i = 0; i < 4; i++) {
      const result = await close(db);
      if (result.delivered.length) break;
    }

    const moved: any = await putEverythingAway(db);
    expect(moved.ok).toBe(true);
    const after = await state(db);
    expect(after.stock.some((b: any) => b.location === "quarantine")).toBe(false);
  });
});

describe("putting stock in the wrong place", () => {
  async function fridgeBatch(db: FakeDb) {
    const s = await state(db);
    const cold = s.catalogue.find((c: any) => c.storage === "cold-chain");
    return { batch: s.stock.find((b: any) => b.drug_id === cold?.drug_id), cold };
  }

  it("warns before it lets them, and does not move anything", async () => {
    const { db } = await openShop();
    const { batch } = await fridgeBatch(db);
    if (!batch) return;

    const refused: any = await run.putAwayStock(db, USER, {
      moves: [{ stockId: batch.id, zone: "ambient" as any }],
      confirm: false,
    });
    expect(refused.ok).toBe(false);
    expect(refused.detail?.join(" ")).toContain("fridge");
    expect(db.rows("wh_stock").find((b) => b.id === batch.id)!.location).toBe("cold-chain");
  });

  // Warned and then permitted. The mistake has to be able to happen, or
  // storage is a puzzle with one answer and no consequence.
  it("allows it once confirmed, and destroys the stock at the close", async () => {
    const { db } = await openShop();
    const { batch } = await fridgeBatch(db);
    if (!batch) return;

    const done: any = await run.putAwayStock(db, USER, {
      moves: [{ stockId: batch.id, zone: "ambient" as any }],
      confirm: true,
    });
    expect(done.ok).toBe(true);
    expect(done.warnings.length).toBe(1);

    const result = await close(db);
    expect(result.spoiled.map((s: any) => s.batchNo)).toContain(batch.batch_no);
    expect(result.faults.some((f: any) => f.code === "cold-chain-broken")).toBe(true);
    expect(db.rows("wh_stock").some((b) => b.batch_no === batch.batch_no)).toBe(false);
  });

  it("treats quarantine as a legitimate place to put anything", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const any = s.stock[0];
    const held: any = await run.putAwayStock(db, USER, {
      moves: [{ stockId: any.id, zone: "quarantine" as any }],
      confirm: false,
    });
    expect(held.ok).toBe(true);
    expect(held.warnings).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Licences
 * ------------------------------------------------------------------ */

describe("licences", () => {
  it("takes the fee now and grants the narcotics permit weeks later", async () => {
    const { db } = await openShop();
    const before = Number(facilityRow(db).cash_paisa);

    const applied: any = await run.applyForLicence(db, USER, { kind: "narcotics" });
    expect(applied.ok).toBe(true);
    expect(applied.pending).toBe(true);
    expect(applied.grantedPeriod).toBe(1 + NARCOTICS_LEAD_WEEKS);
    expect(Number(facilityRow(db).cash_paisa)).toBe(before - LICENCE_FEE.narcotics);

    const s = await state(db);
    expect(s.licences.find((l: any) => l.kind === "narcotics").status).toBe("pending");
  });

  it("will not take the fee twice for an application already lodged", async () => {
    const { db } = await openShop();
    await run.applyForLicence(db, USER, { kind: "narcotics" });
    const cash = Number(facilityRow(db).cash_paisa);
    const again: any = await run.applyForLicence(db, USER, { kind: "narcotics" });

    expect(again.ok).toBe(false);
    expect(Number(facilityRow(db).cash_paisa)).toBe(cash);
    expect(db.rows("wh_licences").filter((l) => l.kind === "narcotics")).toHaveLength(1);
  });

  it("brings the permit into force on its date, and then controlled stock can be ordered", async () => {
    const { db } = await openShop();
    await run.applyForLicence(db, USER, { kind: "narcotics" });
    for (let i = 0; i < NARCOTICS_LEAD_WEEKS; i++) await close(db);

    // In force the moment its week arrives, not whenever something gets round
    // to rewriting the status column.
    const s = await state(db);
    expect(s.licences.find((l: any) => l.kind === "narcotics").in_force).toBe(true);

    const controlled = s.catalogue.find((c: any) => c.controlled);
    const order: any = await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: controlled.drug_id, packs: 5 }],
    });
    expect(order.ok).toBe(true);
  });

  // Payable on the overdraft like anything else. A shut pharmacy refused the
  // renewal it could have borrowed for would drain its overheads until it died
  // of a rule rather than a decision.
  it("lets a renewal be paid for on the overdraft", async () => {
    const { db } = await openShop();
    await db.from("wh_facilities").update({
      cash_paisa: 100, overdraft_paisa: 100_000 * RUPEE,
    }).eq("user_id", USER);

    const applied: any = await run.applyForLicence(db, USER, { kind: "narcotics" });
    expect(applied.ok).toBe(true);
    expect(Number(facilityRow(db).cash_paisa)).toBeLessThan(0);
  });

  it("refuses an application the account will not carry", async () => {
    const { db } = await openShop();
    await db.from("wh_facilities").update({
      cash_paisa: 100, overdraft_paisa: 0,
    }).eq("user_id", USER);
    const refused: any = await run.applyForLicence(db, USER, { kind: "narcotics" });
    expect(refused.ok).toBe(false);
    expect(db.rows("wh_licences").some((l) => l.kind === "narcotics")).toBe(false);
  });

  // Trading past expiry is not a paperwork slip. It shuts the counter.
  it("shuts the pharmacy when the sale licence lapses, and reopens it on renewal", async () => {
    const { db } = await openShop();
    await db.from("wh_licences").update({ expires_period: 1 }).eq("kind", "drug_sale");

    await close(db);
    const shut = await close(db);
    expect(shut.traded).toBe(false);
    expect(shut.kpis.revenue).toBe(0);
    expect(shut.kpis.serviceLevel).toBe(0);

    const s = await state(db);
    expect(s.trading).toBe(false);
    expect(s.events.some((e: any) => e.kind === "licence-expiry")).toBe(true);

    const renewed: any = await run.applyForLicence(db, USER, { kind: "drug_sale" });
    expect(renewed.ok).toBe(true);
    const after = await state(db);
    expect(after.trading).toBe(true);
    expect(after.events.some((e: any) => e.kind === "licence-expiry")).toBe(false);
  });

  it("keeps charging rent while the counter is shut", async () => {
    const { db } = await openShop();
    await db.from("wh_licences").update({ expires_period: 0 }).eq("kind", "drug_sale");
    const cash = Number(facilityRow(db).cash_paisa);
    const shut = await close(db);

    expect(shut.traded).toBe(false);
    expect(Number(facilityRow(db).cash_paisa))
      .toBe(cash - Number(facilityRow(db).weekly_overheads_paisa));
  });

  it("raises the expiry notice once, not once a week", async () => {
    const { db } = await openShop();
    await db.from("wh_licences").update({ expires_period: 0 }).eq("kind", "drug_sale");
    await close(db);
    await close(db);
    await close(db);

    const notices = db.rows("wh_events").filter((e) => e.kind === "licence-expiry");
    expect(notices).toHaveLength(1);
  });

  it("adds a renewal to the weeks already paid for rather than replacing them", async () => {
    const { db } = await openShop();
    const before = Number(db.rows("wh_licences")[0].expires_period);
    await run.applyForLicence(db, USER, { kind: "drug_sale" });
    expect(Number(db.rows("wh_licences")[0].expires_period)).toBeGreaterThan(before);
  });
});

/* ------------------------------------------------------------------ *
 * Paperwork
 * ------------------------------------------------------------------ */

describe("paperwork", () => {
  it("records the fridge log once per week however often it is pressed", async () => {
    const { db } = await openShop();
    await run.logTemperature(db, USER);
    await run.logTemperature(db, USER);

    expect(db.rows("wh_paperwork").filter((p) => p.kind === "temperature-log")).toHaveLength(1);
    expect((await state(db)).paperwork.temperatureLog).toBe(true);
  });

  it("asks for the log again the following week", async () => {
    const { db } = await openShop();
    await run.logTemperature(db, USER);
    await close(db);
    expect((await state(db)).paperwork.temperatureLog).toBe(false);
  });

  it("writes the register balance the learner counted, not the shelf", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const controlled = s.catalogue.find((c: any) => c.controlled);

    const signed: any = await run.signCdRegister(db, USER, {
      counts: [{ drugId: controlled.drug_id, counted: 17 }],
    });
    expect(signed.ok).toBe(true);

    const book = db.rows("wh_cd_register")[0];
    expect(Number(book.balance)).toBe(17);
    expect(Number(book.posted_through_period)).toBe(1);
    expect((await state(db)).paperwork.cdRegister).toBe(true);
  });

  it("refuses a register entry for something the pharmacy does not carry", async () => {
    const { db } = await openShop();
    const refused: any = await run.signCdRegister(db, USER, {
      counts: [{ drugId: "drug-does-not-exist", counted: 5 }],
    });
    expect(refused.ok).toBe(false);
    expect(db.rows("wh_cd_register")).toHaveLength(0);
  });

  it("refuses a register entry for a medicine that is not controlled", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const ordinary = s.catalogue.find((c: any) => !c.controlled);
    const refused: any = await run.signCdRegister(db, USER, {
      counts: [{ drugId: ordinary.drug_id, counted: 5 }],
    });
    expect(refused.ok).toBe(false);
    expect(db.rows("wh_cd_register")).toHaveLength(0);
  });

  it("updates the same register line rather than adding another", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const controlled = s.catalogue.find((c: any) => c.controlled);

    await run.signCdRegister(db, USER, { counts: [{ drugId: controlled.drug_id, counted: 10 }] });
    await run.signCdRegister(db, USER, { counts: [{ drugId: controlled.drug_id, counted: 12 }] });

    expect(db.rows("wh_cd_register")).toHaveLength(1);
    expect(Number(db.rows("wh_cd_register")[0].balance)).toBe(12);
  });
});

/* ------------------------------------------------------------------ *
 * Notices
 * ------------------------------------------------------------------ */

describe("notices", () => {
  /** Run weeks until the named kind of notice appears, or give up. */
  async function weeksUntilNotice(db: FakeDb, kind: string, limit = 40) {
    for (let i = 0; i < limit; i++) {
      const result: any = await close(db);
      if (!result.ok) return null;
      await putEverythingAway(db);
      const open = db.rows("wh_events").find((e) => e.kind === kind && !e.resolved);
      if (open) return open;
      if (result.insolvent) return null;
    }
    return null;
  }

  it("raises a recall against a batch the pharmacy actually holds", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;

    const batchNo = (notice.payload as any).batchNo;
    expect(db.rows("wh_stock").some((b) => b.batch_no === batchNo)).toBe(true);
  });

  it("will not accept any answer to a recall except withdrawing the batch", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;

    const wrong: any = await run.resolveEvent(db, USER, { eventId: notice.id, action: "use" });
    expect(wrong.ok).toBe(false);
    expect(db.rows("wh_events").find((e) => e.id === notice.id)!.resolved).toBe(false);

    const right: any = await run.resolveEvent(db, USER, { eventId: notice.id, action: "quarantine" });
    expect(right.ok).toBe(true);
    const batchNo = (notice.payload as any).batchNo;
    expect(db.rows("wh_stock").find((b) => b.batch_no === batchNo)!.location).toBe("quarantine");
  });

  it("writes the withdrawn batch off at the next close, once", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;

    const batchNo = (notice.payload as any).batchNo;
    await run.resolveEvent(db, USER, { eventId: notice.id, action: "quarantine" });

    const after = await close(db);
    expect(after.condemned.map((c: any) => c.batchNo)).toContain(batchNo);
    expect(db.rows("wh_stock").some((b) => b.batch_no === batchNo)).toBe(false);

    const later = await close(db);
    expect(later.condemned.map((c: any) => c.batchNo)).not.toContain(batchNo);
  });

  it("fines a recall left on the shelf, every week it stays there", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;

    const first = await close(db);
    const second = await close(db);
    const fined = (r: any) => r.charges.some((c: any) => String(c.note).includes("still on sale"));
    expect(fined(first) || fined(second)).toBe(true);
  });

  it("refuses to answer a notice twice", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;

    await run.resolveEvent(db, USER, { eventId: notice.id, action: "quarantine" });
    const again: any = await run.resolveEvent(db, USER, { eventId: notice.id, action: "quarantine" });
    expect(again.ok).toBe(false);
  });

  it("refuses to answer a notice belonging to somebody else", async () => {
    const { db } = await openShop({ seed: "recall-seed" });
    const notice = await weeksUntilNotice(db, "recall");
    if (!notice) return;
    const stolen: any = await run.resolveEvent(db, OTHER, {
      eventId: notice.id, action: "quarantine",
    });
    expect(stolen.ok).toBe(false);
  });

  it("applies a short delivery to the order before the goods land", async () => {
    const { db } = await openShop({ seed: "short-seed" });
    const s = await state(db);
    for (const line of s.catalogue.slice(0, 6)) {
      await run.placeOrder(db, USER, {
        supplier: "Central Distributors",
        lines: [{ drugId: line.drug_id, packs: 100 }],
      });
    }

    let short: any = null;
    for (let i = 0; i < 8 && !short; i++) {
      const result = await close(db);
      short = result.events.find((e: any) => e.kind === "shortage");
    }
    if (!short) return;

    const line = db.rows("wh_order_lines").find((l) => l.received_packs !== undefined && l.received_packs !== null);
    expect(line).toBeTruthy();
    expect(Number(line!.received_packs)).toBeLessThan(Number(line!.packs));
  });
});

/* ------------------------------------------------------------------ *
 * The inspector
 * ------------------------------------------------------------------ */

describe("the inspection", () => {
  it("arrives on the cadence and writes a report", async () => {
    const { db } = await openShop({ seed: "inspect-seed" });
    let report: any = null;
    for (let week = 1; week <= ODDS.medium.inspectionEvery; week++) {
      const result = await close(db);
      await putEverythingAway(db);
      if (result.inspection) report = result;
    }

    expect(report).toBeTruthy();
    expect(report.period % ODDS.medium.inspectionEvery).toBe(0);
    expect(db.rows("wh_events").some((e) => e.kind === "inspection" && e.resolved)).toBe(true);
  });

  it("shuts the pharmacy when it finds something critical", async () => {
    const { db } = await openShop({ seed: "inspect-seed" });
    // Trade on unlicensed, which is the finding that stops a pharmacy.
    for (let week = 1; week < ODDS.medium.inspectionEvery; week++) await close(db);
    await db.from("wh_licences").update({ expires_period: 1 }).eq("kind", "drug_sale");

    const result = await close(db);
    expect(result.inspection?.suspended).toBe(true);
    expect(result.suspendedUntilPeriod).toBe(result.period + SUSPENSION_WEEKS);

    const s = await state(db);
    expect(s.trading).toBe(false);
  });

  it("reopens the pharmacy once the closure has run its course", async () => {
    const { db } = await openShop({ seed: "inspect-seed" });
    await db.from("wh_facilities")
      .update({ suspended_until_period: 3 }).eq("user_id", USER);

    expect((await state(db)).trading).toBe(false);
    await close(db);
    await close(db);
    await close(db);
    expect((await state(db)).trading).toBe(true);
  });

  it("does not ask for a fridge log from a pharmacy with no fridge stock", async () => {
    const { db } = await openShop({ seed: "inspect-seed" });
    const s = await state(db);
    const cold = s.catalogue.filter((c: any) => c.storage === "cold-chain").map((c: any) => c.drug_id);
    for (const drugId of cold) {
      await db.from("wh_stock").delete().eq("drug_id", drugId);
    }

    let report: any = null;
    for (let week = 1; week <= ODDS.medium.inspectionEvery; week++) {
      const result = await close(db);
      if (result.inspection) report = result.inspection;
    }
    expect(report?.findings.some((f: any) => f.code === "no-temperature-log")).toBe(false);
  });

  it("charges the fines to the same account as everything else", async () => {
    const { db } = await openShop({ seed: "inspect-seed" });
    for (let week = 1; week < ODDS.medium.inspectionEvery; week++) await close(db);
    await db.from("wh_licences").update({ expires_period: 1 }).eq("kind", "drug_sale");

    const result = await close(db);
    const period = db.rows("wh_periods").find((p) => p.period_no === result.period)!;
    expect(Number(period.penalties_paisa)).toBeGreaterThan(0);
    expect(db.rows("wh_ledger").some(
      (l) => l.kind === "penalty" && l.period_no === result.period)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Running out of money
 * ------------------------------------------------------------------ */

describe("running out of money", () => {
  it("ends the run when cash falls past the overdraft", async () => {
    const { db } = await openShop({ difficulty: "hard" });
    await db.from("wh_facilities").update({ cash_paisa: 0 }).eq("user_id", USER);
    // An invoice far larger than the shop can cover, already due.
    await db.from("wh_orders").insert({
      facility_id: facilityRow(db).id,
      supplier: "Central Distributors",
      placed_period: 1,
      eta_period: 1,
      status: "placed",
      total_paisa: 5_000_000 * RUPEE,
      payment_due_period: 1,
      paid: false,
    });

    const result = await close(db);
    expect(result.insolvent).toBe(true);
    expect(facilityRow(db).status).toBe("insolvent");
    expect((await state(db)).ok).toBe(false);
  });

  it("keeps the closed weeks on file after the run ends", async () => {
    const { db } = await openShop({ difficulty: "hard" });
    await close(db);
    await db.from("wh_facilities").update({ status: "insolvent" }).eq("user_id", USER);
    expect(db.rows("wh_periods")).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * The edges
 * ------------------------------------------------------------------ */

describe("stock running out of life", () => {
  it("writes an expired batch off and takes it off the shelf", async () => {
    const { db } = await openShop();
    const doomed = db.rows("wh_stock")[0];
    await db.from("wh_stock").update({ expires_period: 1 }).eq("id", doomed.id);

    const result = await close(db);
    expect(result.writeOffs.map((w: any) => w.batchNo)).toContain(doomed.batch_no);
    expect(result.kpis.wastage).toBeGreaterThan(0);
    expect(db.rows("wh_stock").some((b) => b.batch_no === doomed.batch_no)).toBe(false);
  });

  // Goods-in is where a delivery sits before anyone touches it. Charging for
  // that would punish the learner for the one thing quarantine exists to do.
  it("does not destroy a cold chain delivery still sitting in goods-in", async () => {
    const { db } = await openShop();
    const s = await state(db);
    const cold = s.catalogue.find((c: any) => c.storage === "cold-chain");
    if (!cold) return;

    await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: cold.drug_id, packs: 20 }],
    });
    for (let i = 0; i < 4; i++) {
      const landed = await close(db);
      if (landed.delivered.length) break;
    }

    const waiting = db.rows("wh_stock").filter(
      (b) => b.drug_id === cold.drug_id && b.location === "quarantine");
    expect(waiting.length).toBeGreaterThan(0);

    const after = await close(db);
    expect(after.spoiled).toHaveLength(0);
    expect(db.rows("wh_stock").some(
      (b) => b.drug_id === cold.drug_id && b.location === "quarantine")).toBe(true);
  });
});

describe("the register against the shelf", () => {
  it("reads unwritten controlled stock as unrecorded at the inspection", async () => {
    const { db } = await openShop({ seed: "register-seed" });
    await run.applyForLicence(db, USER, { kind: "narcotics" });
    for (let i = 0; i < NARCOTICS_LEAD_WEEKS; i++) await close(db);

    const s = await state(db);
    const controlled = s.catalogue.find((c: any) => c.controlled);
    await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: controlled.drug_id, packs: 20 }],
    });

    // Keep the safe stocked and never write the book up.
    let report: any = null;
    for (let week = 0; week < ODDS.medium.inspectionEvery + 4; week++) {
      await run.placeOrder(db, USER, {
        supplier: "Central Distributors",
        lines: [{ drugId: controlled.drug_id, packs: 40 }],
      });
      const result = await close(db);
      await putEverythingAway(db);
      if (result.inspection) { report = result.inspection; break; }
    }
    expect(report).toBeTruthy();
    expect(db.rows("wh_stock").some((b) => b.drug_id === controlled.drug_id)).toBe(true);

    expect(report.findings.some((f: any) => f.code.startsWith("cd-")
      || f.code === "no-cd-register")).toBe(true);
  });

  it("reconciles when the learner counted correctly", async () => {
    const { db } = await openShop({ seed: "register-seed" });
    await run.applyForLicence(db, USER, { kind: "narcotics" });
    for (let i = 0; i < NARCOTICS_LEAD_WEEKS; i++) await close(db);

    const s = await state(db);
    const controlled = s.catalogue.find((c: any) => c.controlled);
    await run.placeOrder(db, USER, {
      supplier: "Central Distributors",
      lines: [{ drugId: controlled.drug_id, packs: 20 }],
    });

    let report: any = null;
    for (let week = 0; week < ODDS.medium.inspectionEvery + 4; week++) {
      await run.placeOrder(db, USER, {
        supplier: "Central Distributors",
        lines: [{ drugId: controlled.drug_id, packs: 40 }],
      });
      const result = await close(db);
      await putEverythingAway(db);
      // Count the safe and write down what is there, every week.
      const held = db.rows("wh_stock")
        .filter((b) => b.drug_id === controlled.drug_id)
        .reduce((n, b) => n + Number(b.qty), 0);
      await run.signCdRegister(db, USER, {
        counts: [{ drugId: controlled.drug_id, counted: held }],
      });
      if (result.inspection) { report = result.inspection; break; }
    }
    expect(report).toBeTruthy();
    expect(report.findings.some((f: any) => f.code.startsWith("cd-")
      || f.code === "no-cd-register")).toBe(false);
  });
});

describe("borrowed money", () => {
  it("keeps trading while the account is inside the overdraft", async () => {
    const { db } = await openShop({ difficulty: "medium" });
    // Deep into the red but nowhere near the limit, and shut so no takings
    // can accidentally lift it back out.
    await db.from("wh_facilities").update({
      cash_paisa: -1_000_000 * RUPEE,
      overdraft_paisa: 9_000_000 * RUPEE,
    }).eq("user_id", USER);
    await db.from("wh_licences").update({ expires_period: 0 }).eq("kind", "drug_sale");

    const result = await close(db);
    expect(result.kpis.closingCash).toBeLessThan(0);
    expect(result.insolvent).toBe(false);
    expect(facilityRow(db).status).toBe("running");
  });

  it("lets a learner start again after going under", async () => {
    const { db } = await openShop({ difficulty: "hard" });
    await db.from("wh_facilities").update({ status: "insolvent" }).eq("user_id", USER);

    const again: any = await run.createFacility(db, USER, {
      name: "Second Attempt", city: "Lahore", difficulty: "medium",
    });
    expect(again.ok).toBe(true);
    expect(db.rows("wh_facilities")).toHaveLength(2);
    expect((await state(db)).facility.name).toBe("Second Attempt");
  });
});

describe("the same week, twice", () => {
  // A learner disputing a result has to be able to be shown the same week.
  it("replays identically from the same seed", async () => {
    const play = async () => {
      const { db } = await openShop({ seed: "replay" });
      const weeks = [];
      for (let i = 0; i < 6; i++) {
        const result = await close(db);
        weeks.push({
          revenue: result.kpis.revenue,
          wastage: result.kpis.wastage,
          served: Math.round(result.kpis.serviceLevel),
          events: result.events.map((e: any) => e.kind).sort(),
        });
      }
      return weeks;
    };
    expect(await play()).toEqual(await play());
  });
});
