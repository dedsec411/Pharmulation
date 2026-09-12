import { makeRng, intBetween, pick, type Rng } from "./seeded-random";
import { difficultyContent, type Difficulty } from "./shared";

/**
 * A warehouse shift, recombined from material a pharmacist already signed off.
 *
 * The problem this solves is that warehousing shipped eight fixed cases, and
 * two of the three difficulty buckets held two. A player met the same delivery
 * within three sessions.
 *
 * The tempting fix - generate shipments from the drug catalogue - is not
 * available and should not be faked. `drugs` carries no storage column, so
 * deciding that a given medicine belongs at 2-8°C or in the light-protected
 * bay would mean inventing a storage condition for a real product and then
 * marking a pharmacy student wrong against it.
 *
 * So nothing here is invented. Every (medicine, storage requirement, zone)
 * triple below is lifted verbatim from the authored cases; the generator may
 * only ever emit those triples, and a test asserts it. What varies is the
 * combination - which consignments arrive together, their batch numbers,
 * dates and quantities, which cold chain broke, which count is short, and how
 * much of it there is. That is enough to make a repeat vanishingly unlikely
 * while every clinical claim on the screen is one somebody checked.
 *
 * Adding to VERIFIED_SHIPMENTS needs a pharmacist, not a developer.
 */

export type VerifiedShipment = {
  drug: string;
  requirement: string;
  correctZone: string;
  controlled?: boolean;
};

export const VERIFIED_SHIPMENTS: VerifiedShipment[] = [
  { drug: "Insulin Glargine", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Amoxicillin 500mg caps", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Nitroglycerin SL", requirement: "Protect from light", correctZone: "Light-Protected" },
  { drug: "Morphine 10mg/mL", requirement: "Controlled substance — register entry", correctZone: "Controlled Substances", controlled: true },
  { drug: "Trastuzumab 440mg", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Influenza Vaccine", requirement: "Store at 2-8°C, do not freeze", correctZone: "Cool Room 2-8°C" },
  { drug: "MMR Vaccine", requirement: "Store frozen ≤ -15°C", correctZone: "Freezer" },
  { drug: "Adrenaline 1mg/mL", requirement: "Protect from light, store below 25°C", correctZone: "Light-Protected" },
  { drug: "Fentanyl 100mcg/2mL", requirement: "Controlled substance — secure storage", correctZone: "Controlled Substances", controlled: true },
  { drug: "Pembrolizumab 100mg", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Midazolam", requirement: "Schedule IV — secure storage", correctZone: "Controlled Substances", controlled: true },
  { drug: "Paracetamol IV", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Trastuzumab", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Filgrastim", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Paracetamol 500mg", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Cetirizine 10mg", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Multivitamins", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Insulin Regular", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Insulin NPH", requirement: "Store at 2-8°C", correctZone: "Cool Room 2-8°C" },
  { drug: "Ferrous Sulfate", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Folic Acid", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Vitamin D3", requirement: "Protect from light", correctZone: "Light-Protected" },
  { drug: "Amoxicillin 500mg", requirement: "Store below 25°C", correctZone: "Ambient" },
  { drug: "Azithromycin", requirement: "Store below 25°C", correctZone: "Ambient" },
];

export const DISPATCH_DRUGS: string[] = [
  "Amoxicillin 500mg caps",
  "Insulin Glargine",
  "Influenza Vaccine",
  "Morphine 10mg/mL",
  "Midazolam",
  "Filgrastim",
  "Paracetamol 500mg",
  "Folic Acid",
  "Amoxicillin 500mg",
  "Azithromycin",
  "Cetirizine 10mg",
];

export const STOCK_COUNT_LINES: string[] = [
  "Amoxicillin 500mg",
  "Morphine 10mg/mL",
  "Paracetamol 500mg",
  "Fentanyl 100mcg/2mL",
  "Influenza Vaccine",
  "Paracetamol IV",
  "Trastuzumab",
  "Insulin Glargine",
  "Vitamin D3",
];

/** The bays the store actually has, exactly as the authored cases name them. */
export const ZONES = [
  "Ambient",
  "Cool Room 2-8°C",
  "Freezer",
  "Light-Protected",
  "Controlled Substances",
];

/** A bay with a temperature to log. Derived from the zone, not asserted about the drug. */
function isColdChain(zone: string): boolean {
  return zone === "Cool Room 2-8°C" || zone === "Freezer";
}

export type GeneratedShipment = {
  id: string;
  drug: string;
  batch: string;
  expiry: string;
  requirement: string;
  correctZone: string;
  controlled?: boolean;
  tempLog?: { min: number; max: number; excursion: boolean };
};

export type GeneratedShift = {
  zones: string[];
  shipments: GeneratedShipment[];
  dispatch: Array<{ drug: string; batches: Array<{ batch: string; expiry: string }>; correctBatch: string }>;
  expiring: Array<{ drug: string; batch: string; expiry: string; hasOrder: boolean; correctAction: string }>;
  reconciliation: Array<{ item: string; expected: number; actual: number; investigate: boolean }>;
};

/** Initials, so a batch number looks like it belongs to its medicine. */
function batchPrefix(drug: string): string {
  const letters = drug.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean);
  const from = letters.length >= 2
    ? letters.slice(0, 2).map((w) => w[0]).join("")
    : (letters[0] ?? "XX").slice(0, 3);
  return from.toUpperCase().padEnd(3, "X").slice(0, 3);
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Last day of a month, so an expiry reads the way a real one is printed. */
function monthEnd(from: Date, monthsAhead: number): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + monthsAhead + 1, 0));
}

function drawWithoutReplacement<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0]);
  }
  return out;
}

/**
 * Build a shift.
 *
 * `seed` decides everything, so a replay of the same generated shift is the
 * same shift - a disputed result has to be reproducible, the same rule the
 * rest of the generated content follows.
 */
export function buildWarehouseShift(seed: string, difficulty: Difficulty, now: Date = new Date()): GeneratedShift {
  const rng = makeRng(`warehouse:${seed}:${difficulty}`);
  const content = difficultyContent(difficulty);

  // Enough consignments for the goods-in phase to have its full quota, plus
  // the ones that only get put away.
  const shipmentCount = Math.min(VERIFIED_SHIPMENTS.length, content.cartons + 1);
  const picked = drawWithoutReplacement(VERIFIED_SHIPMENTS, shipmentCount, rng);

  // Expert meets more broken cold chains than Trainee, but never none and
  // never all: a shift where everything is wrong stops being a judgement.
  const coldOnes = picked.filter((s) => isColdChain(s.correctZone));
  const excursionCount = coldOnes.length
    ? Math.max(1, Math.round(coldOnes.length * (difficulty === "hard" ? 0.6 : difficulty === "medium" ? 0.4 : 0.34)))
    : 0;
  const excursionDrugs = new Set(
    drawWithoutReplacement(coldOnes, Math.min(excursionCount, Math.max(0, coldOnes.length - 1)), rng)
      .map((s) => s.drug),
  );

  const shipments: GeneratedShipment[] = picked.map((s, index) => {
    const monthsLeft = intBetween(rng, 6, 30);
    const cold = isColdChain(s.correctZone);
    const excursion = excursionDrugs.has(s.drug);
    return {
      id: `S${index + 1}`,
      drug: s.drug,
      batch: `${batchPrefix(s.drug)}-${intBetween(rng, 100, 999)}`,
      expiry: iso(monthEnd(now, monthsLeft)),
      requirement: s.requirement,
      correctZone: s.correctZone,
      ...(s.controlled ? { controlled: true } : {}),
      ...(cold
        ? {
            tempLog: s.correctZone === "Freezer"
              ? { min: -25, max: excursion ? -6 : -17, excursion }
              : { min: excursion ? 2 : 3, max: excursion ? intBetween(rng, 11, 16) : intBetween(rng, 6, 8), excursion },
          }
        : {}),
    };
  });

  // FEFO: three batches of one medicine, and the earliest expiry is the answer.
  const dispatchCount = difficulty === "easy" ? 1 : 2;
  const dispatch = drawWithoutReplacement(DISPATCH_DRUGS, dispatchCount, rng).map((drug) => {
    const months = drawWithoutReplacement([4, 9, 14, 19, 25, 31], 3, rng).sort((a, b) => a - b);
    const batches = months.map((m) => ({
      batch: `${batchPrefix(drug)}-${intBetween(rng, 100, 999)}`,
      expiry: iso(monthEnd(now, m)),
    }));
    return { drug, batches, correctBatch: batches[0].batch };
  });

  // The rule the authored cases use: something with an order against it goes
  // out first, something nobody wants goes back while it still earns a credit.
  const expiring = drawWithoutReplacement(DISPATCH_DRUGS, difficulty === "easy" ? 1 : 2, rng).map((drug) => {
    const hasOrder = rng() < 0.5;
    return {
      drug,
      batch: `${batchPrefix(drug)}-${intBetween(rng, 100, 999)}`,
      expiry: `in ${intBetween(rng, 9, 27)} days`,
      hasOrder,
      correctAction: hasOrder ? "Mark for Priority Dispatch" : "Mark for Return to Supplier",
    };
  });

  /**
   * Counts are generated from the decision, not the other way round: a line
   * either reconciles or is unmistakably short. Producing a number first and
   * then ruling on it would mean encoding a variance threshold, which is an
   * SOP question rather than a coding one.
   */
  const reconciliation = drawWithoutReplacement(STOCK_COUNT_LINES, content.auditScenarios, rng)
    .map((item, index) => {
      const investigate = index === 0 || rng() < 0.34;
      const expected = intBetween(rng, 8, 300) * 10;
      const actual = investigate
        ? expected - Math.max(3, Math.round(expected * (0.05 + rng() * 0.07)))
        : expected;
      return { item, expected, actual, investigate };
    });

  return { zones: [...ZONES], shipments, dispatch, expiring, reconciliation };
}

/** Every triple the generator emitted must be one somebody signed off. */
export function isVerifiedCombination(shipment: { drug: string; requirement: string; correctZone: string }): boolean {
  return VERIFIED_SHIPMENTS.some((v) =>
    v.drug === shipment.drug
    && v.requirement === shipment.requirement
    && v.correctZone === shipment.correctZone);
}

/**
 * A title and a one-line summary that describe the shift that was built.
 *
 * The authored cases carried titles like "Cold-Chain Heavy Day", which were
 * true of the fixed delivery they shipped with. Keeping one on a generated
 * shift would have been a label describing somebody else's delivery, so the
 * name is read off what actually arrived.
 */
export function describeShift(shift: GeneratedShift): { title: string; explanation: string } {
  const excursions = shift.shipments.filter((s) => s.tempLog?.excursion).length;
  const cold = shift.shipments.filter((s) => s.tempLog).length;
  const controlled = shift.shipments.filter((s) => s.controlled).length;
  const variances = shift.reconciliation.filter((r) => r.investigate).length;
  const parts: string[] = [];
  if (cold) parts.push(`${cold} cold-chain ${cold === 1 ? "consignment" : "consignments"}`);
  if (controlled) parts.push(`${controlled} controlled ${controlled === 1 ? "line" : "lines"}`);
  if (excursions) parts.push(`${excursions} broken cold ${excursions === 1 ? "chain" : "chains"}`);
  if (variances) parts.push(`${variances} ${variances === 1 ? "variance" : "variances"} at the count`);

  const title = excursions >= 2 ? "Cold-chain heavy day"
    : controlled >= 2 ? "Controlled substance receipt"
    : excursions === 1 ? "Cold chain excursion on the bay"
    : controlled === 1 ? "Mixed delivery with a controlled line"
    : "Routine receiving shift";

  return {
    title,
    explanation: parts.length
      ? `${shift.shipments.length} consignments: ${parts.join(", ")}.`
      : `${shift.shipments.length} consignments, all ambient, nothing flagged at the count.`,
  };
}
