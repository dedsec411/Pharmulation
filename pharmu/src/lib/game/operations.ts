/**
 * The operational half of the weakness map.
 *
 * The clinical heatmap is drug class against clinical skill, and warehousing
 * was deliberately left out of it: running out of amoxicillin is not a failure
 * of drug selection, and filing it under one would quietly drag down the
 * selection score of anyone who spent a month running a shop.
 *
 * These are the four things a week in a pharmacy can be got wrong at, scored
 * on their own track. They are not drug-class shaped - a lapsed licence is not
 * about antibiotics - so this produces a flat list per skill rather than a
 * grid, which is also an honest reflection of what the data can support.
 */

export const OPERATION_SKILLS = [
  { key: "procurement", label: "Buying and cover", short: "Buying" },
  { key: "storage", label: "Storage and cold chain", short: "Storage" },
  { key: "compliance", label: "Licensing and records", short: "Compliance" },
  { key: "stock-accuracy", label: "Stock accuracy", short: "Accuracy" },
] as const;

export type OperationSkill = (typeof OPERATION_SKILLS)[number]["key"];

/**
 * Which part of the job each recorded fault belongs to.
 *
 * Keyed on the codes the week close writes, not on its wording, so rephrasing
 * a message to a learner can never silently move it to another skill.
 */
const FAULT_SKILL: Record<string, OperationSkill> = {
  // Ordering too little, or too much of something that then died.
  "stock-out": "procurement",
  "over-ordered": "procurement",

  // Where it was kept, and what happened to it there.
  "cold-chain-broken": "storage",
  "excursion-ignored": "storage",
  "excursion-dispensed": "storage",
  "cd-not-secured": "storage",

  // Being allowed to trade, and being able to prove it.
  "no-licence": "compliance",
  "controlled-no-permit": "compliance",
  "no-temperature-log": "compliance",
  "recall-ignored": "compliance",
  "recall-dispensed": "compliance",

  // Whether the books match the shelf.
  "cd-shortfall": "stock-accuracy",
  "cd-surplus": "stock-accuracy",
  "expired-on-shelf": "stock-accuracy",
};

/** The part of the job a fault belongs to, or null if it is not one of ours. */
export function skillForFault(code: string): OperationSkill | null {
  return FAULT_SKILL[String(code ?? "")] ?? null;
}

export type OperationCell = {
  skill: OperationSkill;
  /** Weeks closed that could have gone wrong this way. */
  weeks: number;
  faults: number;
  /** Share of weeks with no fault of this kind, or null when too few weeks. */
  accuracy: number | null;
};

export type OperationsMap = {
  cells: OperationCell[];
  weeks: number;
  /** Faults recorded under a code this map does not know. */
  unmapped: number;
};

/** Below this, a percentage is noise rather than a finding. */
export const MIN_WEEKS = 3;

export type WeekRow = {
  mode?: string | null;
  errors_detail?: unknown;
};

/**
 * Build the operational map from closed weeks.
 *
 * Every closed week counts as one attempt at all four, because every week
 * involves buying (or deciding not to), storing what arrived, staying licensed
 * and keeping the records straight - there is no week in which a pharmacy opts
 * out of any of them.
 *
 * Accuracy is the share of weeks that went by without a fault of that kind
 * rather than a per-fault rate, because a single bad week can produce three
 * findings of the same kind and that should not read as three bad weeks.
 */
export function buildOperationsMap(rows: readonly WeekRow[]): OperationsMap {
  const weeks = rows.filter((row) => String(row.mode) === "warehousing");
  const faulted = new Map<OperationSkill, number>();
  const totals = new Map<OperationSkill, number>();
  let unmapped = 0;

  for (const week of weeks) {
    const seen = new Set<OperationSkill>();
    for (const entry of asList(week.errors_detail)) {
      const skill = skillForFault(String((entry as any)?.errorType ?? ""));
      if (!skill) { unmapped += 1; continue; }
      totals.set(skill, (totals.get(skill) ?? 0) + 1);
      seen.add(skill);
    }
    for (const skill of seen) faulted.set(skill, (faulted.get(skill) ?? 0) + 1);
  }

  return {
    weeks: weeks.length,
    unmapped,
    cells: OPERATION_SKILLS.map((spec) => {
      const bad = faulted.get(spec.key) ?? 0;
      return {
        skill: spec.key,
        weeks: weeks.length,
        faults: totals.get(spec.key) ?? 0,
        accuracy: weeks.length >= MIN_WEEKS
          ? Math.max(0, Math.min(1, 1 - bad / weeks.length))
          : null,
      };
    }),
  };
}

/** The weakest part of the job, once there is enough to say so. */
export function weakestOperation(map: OperationsMap): OperationCell | null {
  const rated = map.cells.filter((cell) => cell.accuracy !== null);
  if (!rated.length) return null;
  return rated.reduce((worst, cell) => (cell.accuracy! < worst.accuracy! ? cell : worst));
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
