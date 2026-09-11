/**
 * What a week was worth.
 *
 * Every other mode scores a case by counting right and wrong answers. A week
 * in a pharmacy has no answers to count - it has a result - so this scores the
 * things a pharmacy is actually judged on: did patients get their medicines,
 * did you buy well enough to make a margin under a fixed MRP, did you let stock
 * die, and did anything go wrong that a regulator would write down.
 *
 * Difficulty is deliberately not a multiplier here. On hard the week is harder
 * to have at all - less working capital, higher overheads, no overdraft, events
 * more often - so a good week on hard already scores higher on its own merits.
 * Multiplying it again would pay twice for the same thing.
 */

import type { Paisa } from "./economics";
import { RUPEE } from "./economics";

export type WeekScoreInput = {
  /** Share of demand actually served, 0-100. */
  serviceLevel: number;
  grossMarginPercent: number;
  revenue: Paisa;
  wastage: Paisa;
  /** Fines handed down this week. */
  fines: Paisa;
  /** False when the counter was shut - unlicensed, or closed by an inspector. */
  traded: boolean;
};

export type WeekScore = {
  score: number;
  /** Why, in the same order the screen shows it. */
  parts: Array<{ label: string; points: number; detail: string }>;
};

/** A retail margin a pharmacy here would be content with. */
const GOOD_MARGIN_PERCENT = 20;

/** Wastage at or above this share of revenue scores nothing at all. */
const RUINOUS_WASTAGE_PERCENT = 10;

const SERVICE_POINTS = 120;
const MARGIN_POINTS = 80;
const WASTE_PENALTY = 60;

/** A fine of this much costs a point. Rs 100,000 wipes out a good week. */
const PAISA_PER_PENALTY_POINT = 1_000 * RUPEE;

export function weekScore(input: WeekScoreInput): WeekScore {
  const parts: WeekScore["parts"] = [];

  // A week the pharmacy was not allowed to open is not a week it played
  // badly - it is a week it was not entitled to have. Scoring the service
  // level of a closed shop would read as a hundred percent of nothing.
  if (!input.traded) {
    return {
      score: 0,
      parts: [{
        label: "Closed",
        points: 0,
        detail: "The pharmacy was not trading. Nothing was dispensed, and nothing was earned.",
      }],
    };
  }

  const service = Math.round((clamp(input.serviceLevel, 0, 100) / 100) * SERVICE_POINTS);
  parts.push({
    label: "Patients served",
    points: service,
    detail: `${input.serviceLevel.toFixed(0)}% of what was asked for was dispensed.`,
  });

  const margin = Math.round(
    clamp(input.grossMarginPercent / GOOD_MARGIN_PERCENT, 0, 1) * MARGIN_POINTS);
  parts.push({
    label: "Bought well",
    points: margin,
    detail: `${input.grossMarginPercent.toFixed(1)}% gross margin against a fixed retail price.`,
  });

  const wastagePercent = input.revenue > 0 ? (input.wastage / input.revenue) * 100 : 0;
  const waste = -Math.round(
    clamp(wastagePercent / RUINOUS_WASTAGE_PERCENT, 0, 1) * WASTE_PENALTY);
  if (waste < 0) {
    parts.push({
      label: "Stock lost",
      points: waste,
      detail: `${wastagePercent.toFixed(1)}% of the week's takings written off.`,
    });
  }

  const penalty = -Math.round(input.fines / PAISA_PER_PENALTY_POINT);
  if (penalty < 0) {
    parts.push({
      label: "Findings",
      points: penalty,
      detail: "Fines are paid out of the same account as everything else.",
    });
  }

  const score = Math.max(0, parts.reduce((sum, part) => sum + part.points, 0));
  return { score, parts };
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.min(high, Math.max(low, value));
}
