/**
 * The things that go wrong on their own.
 *
 * A warehouse where nothing ever happens is a spreadsheet. What makes it a
 * job is the batch recall that lands on a Tuesday, the fridge that fails over
 * a weekend, and the supplier who ships eighty of the hundred you ordered.
 *
 * Every event is rolled deterministically from the facility seed and the week
 * number, so the same facility meets the same week - a learner can be asked to
 * justify a decision, and an educator can look at the same problem they saw.
 *
 * The cold chain deliberately does not encode a clinical rule of my own. The
 * event carries the manufacturer's stability limits and the correct action
 * falls out of comparing the excursion against them, because that is what a
 * pharmacist actually does: read the data sheet, not recall a threshold.
 */

import { RUPEE, type Paisa, type StorageZone } from "./economics";

export type EventKind = "recall" | "excursion" | "inspection" | "shortage";

export type EventStock = {
  drugId: string;
  name: string;
  batchNo: string;
  qty: number;
  location: StorageZone;
  requiredZone: Exclude<StorageZone, "quarantine">;
};

export type RecallEvent = {
  kind: "recall";
  period: number;
  /** The batch DRAP named. Only this one. */
  batchNo: string;
  drugName: string;
  reason: string;
  /** What the learner must do: pull it from sale. */
  requiredAction: "quarantine";
};

export type ExcursionEvent = {
  kind: "excursion";
  period: number;
  hours: number;
  maxTempC: number;
  affectedBatches: string[];
  /** Straight off the manufacturer's data sheet, for the learner to read. */
  stability: { safeHours: number; safeMaxTempC: number };
  requiredAction: "use" | "quarantine" | "destroy";
};

export type ShortageEvent = {
  kind: "shortage";
  period: number;
  orderId: string;
  drugName: string;
  ordered: number;
  delivered: number;
};

export type InspectionEvent = {
  kind: "inspection";
  period: number;
  /** Nobody tells you an inspector is coming. */
  notice: 0;
};

export type WarehouseEvent = RecallEvent | ExcursionEvent | ShortageEvent | InspectionEvent;

/** Deterministic unit value in [0,1) from any string. */
function unit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function pick<T>(items: readonly T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(unit(seed) * items.length) % items.length];
}

export type EventOdds = {
  recall: number;
  excursion: number;
  inspectionEvery: number;
};

/**
 * How often the week bites, by difficulty.
 *
 * Inspections are on a cadence rather than a dice roll: a regulator visits
 * periodically, and a learner who has been getting away with something should
 * know it will eventually be looked at.
 */
export const ODDS: Record<"easy" | "medium" | "hard", EventOdds> = {
  easy:   { recall: 0.06, excursion: 0.05, inspectionEvery: 16 },
  medium: { recall: 0.10, excursion: 0.09, inspectionEvery: 10 },
  hard:   { recall: 0.16, excursion: 0.14, inspectionEvery: 6 },
};

/**
 * What ignoring a notice costs, charged every week it is still ignored.
 *
 * A recall is not advice. Leaving a withdrawn batch on the shelf is charged
 * again each week rather than once, because the harm is ongoing - and so is
 * the choice to keep selling it.
 */
export const RECALL_IGNORED_FINE: Paisa = 25_000 * RUPEE;

/** What dispensing stock the data sheet condemned costs. */
export const EXCURSION_IGNORED_FINE: Paisa = 40_000 * RUPEE;

const RECALL_REASONS = [
  "Out-of-specification assay result reported by the manufacturer.",
  "Packaging defect: incorrect leaflet included in the batch.",
  "Sterility concern raised during a routine manufacturing audit.",
  "Dissolution failure found on stability testing.",
];

/**
 * What the manufacturer's data sheet allows before stock is compromised.
 *
 * A vaccine tolerates almost nothing; a tablet that merely got warm is
 * usually fine. The learner is shown these numbers and asked to compare.
 */
function stabilityFor(name: string): { safeHours: number; safeMaxTempC: number } {
  const hay = name.toLowerCase();
  if (/vaccine|insulin|glargine|aspart|lispro/.test(hay)) {
    return { safeHours: 4, safeMaxTempC: 15 };
  }
  return { safeHours: 24, safeMaxTempC: 25 };
}

/**
 * The action the excursion calls for, read off the data sheet.
 *
 * Inside both limits the stock is still good. Past temperature by a long way,
 * or past both, and it is destroyed. Anything in between is quarantined
 * pending the manufacturer's advice, which is the honest answer far more
 * often than either extreme.
 */
export function requiredExcursionAction(
  hours: number, maxTempC: number, stability: { safeHours: number; safeMaxTempC: number },
): ExcursionEvent["requiredAction"] {
  if (hours <= stability.safeHours && maxTempC <= stability.safeMaxTempC) return "use";
  if (maxTempC > stability.safeMaxTempC * 1.6 || (hours > stability.safeHours * 4 && maxTempC > stability.safeMaxTempC)) {
    return "destroy";
  }
  return "quarantine";
}

export type RollInput = {
  period: number;
  seed: string;
  difficulty: "easy" | "medium" | "hard";
  stock: readonly EventStock[];
  /** Orders arriving this week, so a shortage can land on a real one. */
  arriving: ReadonlyArray<{ orderId: string; drugName: string; packs: number }>;
};

/**
 * What this week throws at the learner.
 *
 * Rolled from the seed and the week, never from the clock, so the same week
 * always arrives the same way.
 */
export function rollEvents(input: RollInput): WarehouseEvent[] {
  const { period, seed, difficulty } = input;
  const odds = ODDS[difficulty];
  const events: WarehouseEvent[] = [];

  // A recall names one batch that actually exists. Recalling something the
  // pharmacy never held would be noise, not a decision.
  const recallable = input.stock.filter((s) => s.qty > 0 && s.location !== "quarantine");
  if (recallable.length && unit(`${seed}:recall:${period}`) < odds.recall) {
    const target = pick(recallable, `${seed}:recall-pick:${period}`)!;
    events.push({
      kind: "recall",
      period,
      batchNo: target.batchNo,
      drugName: target.name,
      reason: pick(RECALL_REASONS, `${seed}:recall-why:${period}`)!,
      requiredAction: "quarantine",
    });
  }

  // A fridge failure only matters if there is something in the fridge.
  const cold = input.stock.filter((s) => s.requiredZone === "cold-chain" && s.qty > 0);
  if (cold.length && unit(`${seed}:exc:${period}`) < odds.excursion) {
    const r = unit(`${seed}:exc-size:${period}`);
    const hours = 2 + Math.round(r * 46);
    const maxTempC = 9 + Math.round(unit(`${seed}:exc-temp:${period}`) * 22);
    const stability = stabilityFor(cold.map((c) => c.name).join(" "));
    events.push({
      kind: "excursion",
      period,
      hours,
      maxTempC,
      affectedBatches: cold.map((c) => c.batchNo),
      stability,
      requiredAction: requiredExcursionAction(hours, maxTempC, stability),
    });
  }

  // Suppliers short-ship. The learner is supposed to catch it on the
  // three-way match rather than discover it at a stock count.
  for (const arrival of input.arriving) {
    if (unit(`${seed}:short:${period}:${arrival.orderId}`) < 0.12) {
      const kept = Math.max(1, Math.round(arrival.packs * (0.5 + unit(`${seed}:short-amt:${period}:${arrival.orderId}`) * 0.4)));
      if (kept < arrival.packs) {
        events.push({
          kind: "shortage",
          period,
          orderId: arrival.orderId,
          drugName: arrival.drugName,
          ordered: arrival.packs,
          delivered: kept,
        });
      }
    }
  }

  // The regulator turns up on a cadence, unannounced.
  if (period > 1 && period % odds.inspectionEvery === 0) {
    events.push({ kind: "inspection", period, notice: 0 });
  }

  return events;
}

/**
 * Pull a recalled batch out of sale.
 *
 * Quarantine is the whole mechanism: recalled stock stays on the books, and
 * stays unsellable, until it is dealt with.
 */
export function applyRecall<T extends { batchNo: string; location: StorageZone }>(
  stock: readonly T[], batchNo: string,
): T[] {
  return stock.map((batch) =>
    batch.batchNo === batchNo ? { ...batch, location: "quarantine" as StorageZone } : batch);
}

/** Whether the learner did what the recall notice required. */
export function recallHonoured(
  stock: ReadonlyArray<{ batchNo: string; location: StorageZone; qty: number }>,
  batchNo: string,
): boolean {
  const held = stock.filter((s) => s.batchNo === batchNo && s.qty > 0);
  return held.every((s) => s.location === "quarantine");
}
