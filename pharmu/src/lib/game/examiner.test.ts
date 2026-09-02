import { describe, expect, it } from "vitest";
import {
  EXAMINERS, QUESTIONS_PER_SESSION, SCORE_AXES, axisAverages, bandFor,
  clampAxis, clinicalReasoningIndex, emptyScore, examinerByKey,
  hasExaminableContext, type AnswerScore, type ExaminerCaseContext,
} from "./examiner";

const score = (over: Partial<AnswerScore> = {}): AnswerScore => ({ ...emptyScore(), ...over });
const full = (n: number): AnswerScore =>
  ({ accuracy: n, reasoning: n, safety: n, communication: n });

const context = (over: Partial<ExaminerCaseContext> = {}): ExaminerCaseContext => ({
  caseRef: "generated:t1:sana",
  caseTitle: "Sana Yousaf - bacterial infection",
  mode: "rx",
  score: 120,
  timeTakenSec: 90,
  errors: [],
  drugs: [{ name: "Doxycycline", correct: true }],
  ...over,
});

describe("examiner personalities", () => {
  it("offers the three the brief specifies", () => {
    expect(EXAMINERS.map((e) => e.key)).toEqual(["hassan", "hakim", "zara"]);
  });

  it("gives each one a distinct persona, so the viva actually differs", () => {
    const personas = EXAMINERS.map((e) => e.persona);
    expect(new Set(personas).size).toBe(EXAMINERS.length);
    for (const e of EXAMINERS) {
      expect(e.persona.length, e.key).toBeGreaterThan(120);
      expect(e.name.startsWith("Dr. "), e.key).toBe(true);
    }
  });

  it("falls back to a real examiner rather than throwing on an unknown key", () => {
    expect(examinerByKey("nobody").key).toBe("hakim");
    expect(examinerByKey("").name).toContain("Dr.");
  });
});

describe("clampAxis", () => {
  it("holds an axis inside 0-10", () => {
    expect(clampAxis(7)).toBe(7);
    expect(clampAxis(-4)).toBe(0);
    expect(clampAxis(99)).toBe(10);
  });

  // The marks come from a model, so the shape is never assumed.
  it("treats junk as zero rather than poisoning the index", () => {
    expect(clampAxis("nine")).toBe(0);
    expect(clampAxis(undefined)).toBe(0);
    expect(clampAxis(null)).toBe(0);
    expect(clampAxis(NaN)).toBe(0);
    expect(clampAxis(7.6)).toBe(8);
  });
});

describe("clinicalReasoningIndex", () => {
  it("is 100 only when every axis is full on every answer", () => {
    expect(clinicalReasoningIndex([{ scores: full(10) }, { scores: full(10) }])).toBe(100);
  });

  it("is 0 for a session answered with nothing", () => {
    expect(clinicalReasoningIndex([{ scores: full(0) }, { scores: full(0) }])).toBe(0);
  });

  it("averages across axes and answers", () => {
    expect(clinicalReasoningIndex([{ scores: full(5) }])).toBe(50);
    expect(clinicalReasoningIndex([{ scores: full(10) }, { scores: full(0) }])).toBe(50);
  });

  it("weights the four axes equally", () => {
    // Swapping which axis is strong must not move the index; the axes are the
    // definition of the number, so silently favouring one would make it lie.
    const safetyStrong = clinicalReasoningIndex([{ scores: score({ safety: 8 }) }]);
    const commsStrong = clinicalReasoningIndex([{ scores: score({ communication: 8 }) }]);
    expect(safetyStrong).toBe(commsStrong);
  });

  it("reports on what was examined rather than punishing a short session", () => {
    // One perfect answer is 100, not 33 - an abandoned viva should not be
    // scored as though the unanswered questions were answered badly.
    expect(clinicalReasoningIndex([{ scores: full(10) }])).toBe(100);
  });

  it("returns zero rather than NaN with no answers at all", () => {
    expect(clinicalReasoningIndex([])).toBe(0);
  });

  it("never leaves the 0-100 range even on nonsense marks", () => {
    const wild = clinicalReasoningIndex([{ scores: full(999) }, { scores: full(-50) }]);
    expect(wild).toBeGreaterThanOrEqual(0);
    expect(wild).toBeLessThanOrEqual(100);
  });
});

describe("axisAverages", () => {
  it("averages each axis independently", () => {
    const avg = axisAverages([
      { scores: score({ accuracy: 10, safety: 4 }) },
      { scores: score({ accuracy: 6, safety: 6 }) },
    ]);
    expect(avg.accuracy).toBe(8);
    expect(avg.safety).toBe(5);
    expect(avg.reasoning).toBe(0);
  });

  it("covers every axis the results screen draws a bar for", () => {
    const avg = axisAverages([{ scores: full(5) }]);
    for (const axis of SCORE_AXES) expect(avg[axis.key], axis.key).toBe(5);
  });

  it("is empty rather than NaN with no answers", () => {
    expect(axisAverages([])).toEqual(emptyScore());
  });
});

describe("bandFor", () => {
  it("names every score", () => {
    for (const n of [0, 25, 49, 50, 69, 70, 84, 85, 100]) {
      const band = bandFor(n);
      expect(band.label.trim(), String(n)).not.toBe("");
      expect(band.note.trim(), String(n)).not.toBe("");
    }
  });

  it("never rates a lower score higher than a higher one", () => {
    const order = ["developing", "competent", "strong", "exemplary"];
    let previous = -1;
    for (let n = 0; n <= 100; n++) {
      const rank = order.indexOf(bandFor(n).key);
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });
});

describe("hasExaminableContext", () => {
  // A viva whose questions could apply to any case is worse than no viva, so
  // the button is not offered when there is nothing specific to ask about.
  it("accepts a case with medicines or with mistakes", () => {
    expect(hasExaminableContext(context())).toBe(true);
    expect(hasExaminableContext(context({
      drugs: [],
      errors: [{ errorType: "Wrong drug", wrongChoice: "Aspirin", whyWrong: "Allergy" }],
    }))).toBe(true);
  });

  it("declines a case with nothing specific in it", () => {
    expect(hasExaminableContext(context({ drugs: [], errors: [] }))).toBe(false);
    expect(hasExaminableContext(context({ caseTitle: "   " }))).toBe(false);
  });
});

describe("session shape", () => {
  it("asks three questions, as the brief specifies", () => {
    expect(QUESTIONS_PER_SESSION).toBe(3);
  });

  it("marks on the four named axes", () => {
    expect(SCORE_AXES.map((a) => a.key))
      .toEqual(["accuracy", "reasoning", "safety", "communication"]);
  });
});
