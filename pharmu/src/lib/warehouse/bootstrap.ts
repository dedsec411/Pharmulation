/**
 * Turning a clinical catalogue into a business.
 *
 * `drugs` knows what a medicine is: its class, its dose, what it interacts
 * with. It knows nothing a warehouse runs on - no price, no shelf life, no
 * lead time, no idea whether it needs a fridge. This derives that commercial
 * layer from the clinical one, deterministically, so a facility built from
 * seed "x" is the same facility every time.
 *
 * The prices are SIMULATED and are not DRAP notified prices. What they are is
 * internally consistent: an antibiotic course costs more than a paracetamol
 * pack, insulin more than either, and the margin sits in the band a Pakistani
 * retail pharmacy actually works within. That is enough for the decisions to
 * be real - order too much of the expensive line and the cash is gone - and
 * pretending to quote real notified prices would be worse than not trying.
 */

import { RUPEE, type Paisa } from "./economics";
import type { StorageZone } from "./economics";

export type CatalogueDrug = {
  id: string;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  drug_class?: string | null;
};

export type CatalogueLine = {
  drugId: string;
  name: string;
  mrp: Paisa;
  tradePrice: Paisa;
  baseWeekly: number;
  seasonality: number;
  peakWeek: number;
  shelfLifeWeeks: number;
  leadTimeWeeks: number;
  storage: Exclude<StorageZone, "quarantine">;
  controlled: boolean;
};

/** Deterministic unit value in [0,1) from any string. */
function unit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function haystack(drug: CatalogueDrug): string {
  return `${drug.name} ${drug.generic_name ?? ""} ${drug.category ?? ""} ${drug.drug_class ?? ""}`
    .toLowerCase();
}

/**
 * Medicines that must be kept cold.
 *
 * Getting this wrong is not untidiness: a vaccine left in ambient storage is
 * destroyed stock, and the mode should be able to destroy it.
 */
export function needsColdChain(drug: CatalogueDrug): boolean {
  return /insulin|vaccine|glargine|aspart|lispro|epoetin|enoxaparin|oxytocin/.test(haystack(drug));
}

/**
 * Medicines that live in the controlled drugs safe.
 *
 * Opioids and benzodiazepines. These also need the narcotics permit before
 * they can be ordered, and carry a register that has to reconcile exactly.
 */
export function isControlled(drug: CatalogueDrug): boolean {
  return /morphine|fentanyl|pethidine|tramadol|codeine|methadone|oxycodone|buprenorphine|alprazolam|diazepam|clonazepam|bromazepam|lorazepam|midazolam|nitrazepam|phenobarb/
    .test(haystack(drug));
}

function isFlammable(drug: CatalogueDrug): boolean {
  return /spirit|alcohol|acetone|ether|isopropyl|methylated/.test(haystack(drug));
}

export function storageFor(drug: CatalogueDrug): Exclude<StorageZone, "quarantine"> {
  if (isControlled(drug)) return "cd-safe";
  if (needsColdChain(drug)) return "cold-chain";
  if (isFlammable(drug)) return "flammables";
  return "ambient";
}

/**
 * Roughly what a pack goes for, by what kind of medicine it is.
 *
 * Bands in rupees per pack. Wide enough that ABC analysis separates the lines
 * that matter from the ones that do not, which is the whole point of running
 * the analysis.
 */
const PRICE_BAND: Record<string, [number, number]> = {
  antidiabetic: [400, 2200],
  cardiovascular: [250, 1400],
  antibiotic: [300, 1600],
  analgesic: [60, 400],
  antihistamine: [90, 450],
  gi: [120, 900],
  anxiolytic: [200, 800],
  psychiatric: [300, 1500],
  respiratory: [350, 1800],
};

const DEFAULT_BAND: [number, number] = [100, 700];

function bandFor(drug: CatalogueDrug): [number, number] {
  const key = (drug.category ?? "").toLowerCase().trim();
  if (PRICE_BAND[key]) return PRICE_BAND[key];
  // Whole words only. A plain substring test prices Insulin Glargine as a GI
  // medicine, because "glarGIne" contains "gi" - the same trap that once read
  // Desloratadine as Loratadine.
  const words = new Set(haystack(drug).split(/[^a-z0-9]+/).filter(Boolean));
  for (const [name, band] of Object.entries(PRICE_BAND)) {
    if (words.has(name)) return band;
  }
  // Cold-chain lines are expensive whatever else they are, and that is exactly
  // the pressure a fridge full of insulin puts on a small pharmacy's cash.
  return needsColdChain(drug) ? [900, 3500] : DEFAULT_BAND;
}

/**
 * How much a typical week asks for, and whether it swings across the year.
 *
 * Everyday medicines move in volume at low value; specialist lines are the
 * opposite. Both are needed or the ABC split is meaningless.
 */
function demandFor(drug: CatalogueDrug, seed: string): {
  baseWeekly: number; seasonality: number; peakWeek: number;
} {
  const hay = haystack(drug);
  const r = unit(`${seed}:demand:${drug.id}`);

  if (/paracetamol|ibuprofen|analgesic|antacid|ors|vitamin/.test(hay)) {
    return { baseWeekly: 60 + Math.round(r * 90), seasonality: 0.15, peakWeek: 26 };
  }
  if (/antibiotic|amoxicillin|azithro|cef|cipro|doxycy/.test(hay)) {
    // Chest infections cluster in winter.
    return { baseWeekly: 25 + Math.round(r * 45), seasonality: 0.45, peakWeek: 2 };
  }
  if (/antihistamine|cetirizine|loratadine|fexofenadine|montelukast/.test(hay)) {
    // Pollen.
    return { baseWeekly: 20 + Math.round(r * 40), seasonality: 0.5, peakWeek: 14 };
  }
  if (needsColdChain(drug) || /insulin|oncolog|chemo/.test(hay)) {
    return { baseWeekly: 4 + Math.round(r * 10), seasonality: 0.1, peakWeek: 30 };
  }
  return { baseWeekly: 10 + Math.round(r * 30), seasonality: 0.2, peakWeek: 1 + Math.round(r * 50) };
}

export function commercialsFor(drug: CatalogueDrug, seed: string): CatalogueLine {
  const [low, high] = bandFor(drug);
  const spread = unit(`${seed}:price:${drug.id}`);
  const mrpRupees = Math.round(low + (high - low) * spread);

  // Retail margin lands between 12% and 22% of the printed price. Buying well
  // is one of the few levers a pharmacy has when the ceiling is set for it.
  const marginPct = 12 + unit(`${seed}:margin:${drug.id}`) * 10;
  const mrp: Paisa = mrpRupees * RUPEE;
  const tradePrice: Paisa = Math.max(RUPEE, Math.round(mrp * (1 - marginPct / 100)));

  const cold = needsColdChain(drug);
  const demand = demandFor(drug, seed);

  return {
    drugId: drug.id,
    name: drug.name,
    mrp,
    tradePrice,
    ...demand,
    // A fridge line has months of life, not years, which is what makes
    // over-ordering it expensive rather than merely untidy.
    shelfLifeWeeks: cold ? 26 + Math.round(unit(`${seed}:life:${drug.id}`) * 26)
      : 52 + Math.round(unit(`${seed}:life:${drug.id}`) * 104),
    leadTimeWeeks: 1 + Math.round(unit(`${seed}:lead:${drug.id}`) * 2),
    storage: storageFor(drug),
    controlled: isControlled(drug),
  };
}

/**
 * The medicines this pharmacy carries.
 *
 * Picked for spread rather than at random: a list that is all painkillers has
 * no ABC analysis worth doing, and one with no cold chain never teaches a
 * fridge. Categories are taken round-robin so every kind is represented before
 * any kind is doubled up, and the choice is seeded so a facility rebuilds
 * identically.
 */
export function chooseCatalogue(
  drugs: readonly CatalogueDrug[], seed: string, size = 40,
): CatalogueLine[] {
  const byCategory = new Map<string, CatalogueDrug[]>();
  for (const drug of drugs) {
    const key = (drug.category ?? "other").toLowerCase().trim() || "other";
    const list = byCategory.get(key) ?? [];
    list.push(drug);
    byCategory.set(key, list);
  }

  // Deterministic order within and across categories.
  const categories = [...byCategory.keys()].sort();
  for (const key of categories) {
    byCategory.get(key)!.sort(
      (a, b) => unit(`${seed}:pick:${a.id}`) - unit(`${seed}:pick:${b.id}`));
  }

  const picked: CatalogueDrug[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (picked.length < size && round < 200) {
    let addedThisRound = false;
    for (const key of categories) {
      if (picked.length >= size) break;
      const candidate = byCategory.get(key)![round];
      if (!candidate || seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      picked.push(candidate);
      addedThisRound = true;
    }
    if (!addedThisRound) break;
    round++;
  }

  return picked.map((drug) => commercialsFor(drug, seed));
}
