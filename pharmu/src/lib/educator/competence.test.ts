import { describe, expect, it } from "vitest";
import {
  buildCompetenceRecord, outstandingErrors, summariseTrend, type ScoreRow,
} from "./competence";

const at = (day: number) => `2026-09-${String(day).padStart(2, "0")}T10:00:00Z`;
const row = (day: number, accuracy: number, mode = "rx", errs: string[] = []): ScoreRow => ({
  mode, difficulty: "medium", accuracy, completed_at: at(day),
  errors_detail: errs.map((errorType) => ({ errorType })),
});

describe("buildCompetenceRecord", () => {
  it("says nothing rather than guessing when there is no history", () => {
    const r = buildCompetenceRecord([]);
    expect(r.casesCompleted).toBe(0);
    expect(r.accuracy).toBeNull();
    expect(r.trend).toBeNull();
    expect(summariseTrend(r)).toBe("No cases completed in this period.");
  });

  it("counts the cases and averages the accuracy", () => {
    const r = buildCompetenceRecord([row(1, 0.6), row(2, 0.8)]);
    expect(r.casesCompleted).toBe(2);
    expect(r.accuracy).toBe(70);
  });

  it("reports the period it covers", () => {
    const r = buildCompetenceRecord([row(5, 0.7), row(1, 0.7), row(9, 0.7)]);
    expect(r.from).toBe(at(1));
    expect(r.to).toBe(at(9));
  });

  // Every "earlier" and "still happening" figure depends on the order, so the
  // record sorts rather than trusting the query that fetched it.
  it("does not depend on the order rows arrive in", () => {
    const rows = [row(1, 0.5, "rx", ["A"]), row(2, 0.7), row(3, 0.9), row(4, 0.9)];
    expect(buildCompetenceRecord(rows)).toEqual(buildCompetenceRecord([...rows].reverse()));
  });

  it("ignores a case that was never completed", () => {
    expect(buildCompetenceRecord([{ mode: "rx", accuracy: 0.9 }]).casesCompleted).toBe(0);
  });

  it("breaks the work down by mode, busiest first", () => {
    const r = buildCompetenceRecord([
      row(1, 0.8, "rx"), row(2, 0.6, "rx"), row(3, 1, "warehousing"),
    ]);
    expect(r.byMode[0]).toEqual({ mode: "rx", cases: 2, accuracy: 70 });
    expect(r.byMode[1]).toEqual({ mode: "warehousing", cases: 1, accuracy: 100 });
  });
});

describe("the error tally", () => {
  it("counts each kind of error and when it last happened", () => {
    const r = buildCompetenceRecord([
      row(1, 0.5, "rx", ["Wrong storage zone", "FEFO violated"]),
      row(2, 0.6, "rx", ["FEFO violated"]),
    ]);
    const fefo = r.errors.find((e) => e.errorType === "FEFO violated")!;
    expect(fefo.count).toBe(2);
    expect(fefo.lastSeen).toBe(at(2));
    expect(r.totalErrors).toBe(3);
  });

  it("puts the commonest error first, so a review starts there", () => {
    const r = buildCompetenceRecord([
      row(1, 0.5, "rx", ["B"]), row(2, 0.5, "rx", ["A"]), row(3, 0.5, "rx", ["A"]), row(4, 0.5, "rx", ["A"]),
    ]);
    expect(r.errors[0].errorType).toBe("A");
  });

  it("ignores an error with no type rather than tallying a blank", () => {
    const r = buildCompetenceRecord([
      { mode: "rx", accuracy: 0.5, completed_at: at(1), errors_detail: [{ errorType: "  " }, {}] },
    ]);
    expect(r.errors).toEqual([]);
  });

  it("survives errors_detail being absent or the wrong shape", () => {
    const rows: ScoreRow[] = [
      { mode: "rx", accuracy: 0.5, completed_at: at(1) },
      { mode: "rx", accuracy: 0.5, completed_at: at(2), errors_detail: "not an array" },
    ];
    expect(() => buildCompetenceRecord(rows)).not.toThrow();
    expect(buildCompetenceRecord(rows).errors).toEqual([]);
  });

  /**
   * "Resolved" is a narrow claim on purpose: it has not recurred in the later
   * half of the period on record. Whether the person has learned it is the
   * reviewer's judgement, which is what the document is for.
   */
  it("marks an error resolved only when it stopped, and only with enough history", () => {
    const stopped = buildCompetenceRecord([
      row(1, 0.5, "rx", ["Old habit"]), row(2, 0.6), row(3, 0.9), row(4, 0.9),
    ]);
    expect(stopped.errors[0].resolved).toBe(true);
    expect(outstandingErrors(stopped)).toEqual([]);

    const ongoing = buildCompetenceRecord([
      row(1, 0.5, "rx", ["Still happening"]), row(2, 0.6), row(3, 0.9), row(4, 0.5, "rx", ["Still happening"]),
    ]);
    expect(ongoing.errors[0].resolved).toBe(false);
    expect(outstandingErrors(ongoing)).toHaveLength(1);
  });

  it("will not call anything resolved off two or three cases", () => {
    const r = buildCompetenceRecord([row(1, 0.5, "rx", ["A"]), row(2, 0.9), row(3, 0.9)]);
    expect(r.errors[0].resolved).toBe(false);
  });
});

describe("summariseTrend", () => {
  it("reports a real improvement", () => {
    const r = buildCompetenceRecord([row(1, 0.5), row(2, 0.5), row(3, 0.9), row(4, 0.9)]);
    expect(summariseTrend(r)).toContain("rose from 50% to 90%");
  });

  it("reports a decline just as plainly", () => {
    const r = buildCompetenceRecord([row(1, 0.9), row(2, 0.9), row(3, 0.5), row(4, 0.5)]);
    expect(summariseTrend(r)).toContain("fell from 90% to 50%");
  });

  it("calls a small change steady rather than a direction", () => {
    const r = buildCompetenceRecord([row(1, 0.8), row(2, 0.8), row(3, 0.81), row(4, 0.81)]);
    expect(summariseTrend(r)).toContain("steady");
  });

  // Three cases is not a trend, and saying otherwise in a document somebody
  // signs would be the worst kind of overclaim.
  it("refuses to report a direction from too little history", () => {
    expect(summariseTrend(buildCompetenceRecord([row(1, 0.4), row(2, 0.99)])))
      .toContain("Too few to report a trend");
  });
});
