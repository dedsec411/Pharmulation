/**
 * A record of what somebody has actually practised, and what they got wrong.
 *
 * Every educator who looks at a training tool is quietly asking how it fits
 * their assessment, and a score out of a hundred does not answer that. What a
 * preceptor can use is the thing underneath: which errors this person made,
 * how often, whether they stopped making them, and what is still outstanding.
 * All of that is already stored per case in `errors_detail`; nothing here adds
 * data, it only reads it back in a shape somebody can sign.
 *
 * It is deliberately called an evidence record and not a certificate of
 * competence. This says what a learner did in a simulator. Whether that makes
 * them competent is a judgement a person makes, which is why the document ends
 * in a signature block rather than a verdict.
 */

export type ScoreRow = {
  mode?: string | null;
  difficulty?: string | null;
  accuracy?: number | null;
  score?: number | null;
  errors_made?: number | null;
  completed_at?: string | null;
  errors_detail?: unknown;
};

export type ErrorTally = {
  errorType: string;
  count: number;
  /** When it last happened, so a reviewer can see whether it is still live. */
  lastSeen: string | null;
  /** Whether every occurrence is in the earlier half of the period. */
  resolved: boolean;
};

export type CompetenceRecord = {
  casesCompleted: number;
  /** Whole percent, or null when nothing has been completed. */
  accuracy: number | null;
  from: string | null;
  to: string | null;
  byMode: Array<{ mode: string; cases: number; accuracy: number | null }>;
  errors: ErrorTally[];
  totalErrors: number;
  /** Accuracy over the first and second halves of the period, for a trend. */
  trend: { earlier: number | null; later: number | null } | null;
};

function readErrors(value: unknown): Array<{ errorType?: string }> {
  return Array.isArray(value) ? (value as Array<{ errorType?: string }>) : [];
}

const pct = (values: number[]): number | null =>
  values.length ? Math.round((values.reduce((t, v) => t + v, 0) / values.length) * 100) : null;

/**
 * Build the record.
 *
 * Rows are sorted oldest first here rather than trusting the caller, because
 * every figure below that says "earlier" or "still happening" depends on the
 * order and a query that changed its sort would quietly invert them.
 */
export function buildCompetenceRecord(rows: readonly ScoreRow[]): CompetenceRecord {
  const done = [...rows]
    .filter((r) => r.completed_at)
    .sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at)));

  if (!done.length) {
    return {
      casesCompleted: 0, accuracy: null, from: null, to: null,
      byMode: [], errors: [], totalErrors: 0, trend: null,
    };
  }

  const accuracies = done.map((r) => Number(r.accuracy)).filter(Number.isFinite);
  const midpoint = Math.floor(done.length / 2);

  const modes = new Map<string, ScoreRow[]>();
  for (const row of done) {
    const mode = String(row.mode ?? "unknown");
    if (!modes.has(mode)) modes.set(mode, []);
    modes.get(mode)!.push(row);
  }

  const tallies = new Map<string, { count: number; lastSeen: string; lastIndex: number }>();
  done.forEach((row, index) => {
    for (const error of readErrors(row.errors_detail)) {
      const type = String(error.errorType ?? "").trim();
      if (!type) continue;
      const existing = tallies.get(type);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = String(row.completed_at);
        existing.lastIndex = index;
      } else {
        tallies.set(type, { count: 1, lastSeen: String(row.completed_at), lastIndex: index });
      }
    }
  });

  const errors: ErrorTally[] = [...tallies.entries()]
    .map(([errorType, t]) => ({
      errorType,
      count: t.count,
      lastSeen: t.lastSeen,
      // "Resolved" only says it has not recurred in the later half of the
      // period on record. It is not a claim that the person has learned it,
      // which is the reviewer's call and why this is evidence, not a verdict.
      resolved: done.length >= 4 && t.lastIndex < midpoint,
    }))
    .sort((a, b) => b.count - a.count || a.errorType.localeCompare(b.errorType));

  return {
    casesCompleted: done.length,
    accuracy: pct(accuracies),
    from: String(done[0].completed_at),
    to: String(done[done.length - 1].completed_at),
    byMode: [...modes.entries()]
      .map(([mode, rows2]) => ({
        mode,
        cases: rows2.length,
        accuracy: pct(rows2.map((r) => Number(r.accuracy)).filter(Number.isFinite)),
      }))
      .sort((a, b) => b.cases - a.cases || a.mode.localeCompare(b.mode)),
    errors,
    totalErrors: errors.reduce((total, e) => total + e.count, 0),
    trend: done.length >= 4
      ? {
          earlier: pct(done.slice(0, midpoint).map((r) => Number(r.accuracy)).filter(Number.isFinite)),
          later: pct(done.slice(midpoint).map((r) => Number(r.accuracy)).filter(Number.isFinite)),
        }
      : null,
  };
}

/**
 * One line summarising the period, for the top of the document.
 *
 * Says only what the numbers support. With too little history to compare, it
 * says so rather than reporting a direction from three cases.
 */
export function summariseTrend(record: CompetenceRecord): string {
  if (!record.casesCompleted) return "No cases completed in this period.";
  if (!record.trend || record.trend.earlier === null || record.trend.later === null) {
    return `${record.casesCompleted} cases completed. Too few to report a trend.`;
  }
  const change = record.trend.later - record.trend.earlier;
  if (Math.abs(change) < 3) {
    return `${record.casesCompleted} cases completed. Accuracy steady at about ${record.trend.later}%.`;
  }
  return change > 0
    ? `${record.casesCompleted} cases completed. Accuracy rose from ${record.trend.earlier}% to ${record.trend.later}% across the period.`
    : `${record.casesCompleted} cases completed. Accuracy fell from ${record.trend.earlier}% to ${record.trend.later}% across the period.`;
}

/** Errors still occurring in the later half - what a review conversation is for. */
export function outstandingErrors(record: CompetenceRecord): ErrorTally[] {
  return record.errors.filter((e) => !e.resolved);
}
