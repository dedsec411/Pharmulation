import { describe, expect, it } from "vitest";
import {
  MIN_ATTEMPTS, MODE_SKILL_WEIGHTS, SKILLS, bandFor, buildWeaknessMap, describeGap,
  hasEnoughHistory, modesForSkill, skillForError, weakestAreas,
  type ScoreRow,
} from "./weakness";

const DRUGS = {
  doxycycline: "Antibiotic",
  natamycin: "Antibiotic",
  sertraline: "Psychiatric",
  amitriptyline: "Psychiatric",
  amlodipine: "Cardiovascular",
};

const err = (errorType: string, correctChoice?: string) => ({
  errorType, correctChoice, wrongChoice: "something", mode: "rx",
});

const rows = (n: number, mode: string, errors: object[] = [], classes: string[] = []): ScoreRow[] =>
  Array.from({ length: n }, () => ({ mode, errors_detail: errors, class_attempts: classes }));

describe("skillForError", () => {
  // These are the errorType strings the live database actually contains.
  it("maps the error types the game really writes", () => {
    expect(skillForError("Incomplete counselling")).toBe("counselling");
    expect(skillForError("Wrong dose or direction")).toBe("dosing");
    expect(skillForError("Wrong drug selected")).toBe("selection");
    expect(skillForError("Wrong label")).toBe("labeling");
    expect(skillForError("Wrong OTC quantity")).toBe("dosing");
    expect(skillForError("Wrong OTC recommendation")).toBe("selection");
    expect(skillForError("Irrelevant follow-up question")).toBe("counselling");
    // Current wording for the label step; the legacy string above is dosing.
    expect(skillForError("Wrong label instructions")).toBe("labeling");
  });

  it("routes safety errors to the skills they belong to", () => {
    expect(skillForError("Missed drug interaction")).toBe("interactions");
    expect(skillForError("Allergy ignored")).toBe("contraindications");
    expect(skillForError("No renal dose adjustment")).toBe("renal");
  });

  // Industry and warehousing errors are about process control, which none of
  // the seven clinical skills describes. Better to count them separately than
  // to file them under a skill they are not evidence of.
  it("returns nothing for a process error rather than guessing", () => {
    expect(skillForError("Wrong storage zone")).toBeNull();
    expect(skillForError("Wrong granulation process choice")).toBeNull();
    expect(skillForError("Environmental check ignored")).toBeNull();
  });
});

describe("buildWeaknessMap", () => {
  it("counts an attempt for every skill the mode exercises", () => {
    const map = buildWeaknessMap(rows(4, "otc"), DRUGS);
    expect(map.bySkill.selection.attempts).toBe(4);
    expect(map.bySkill.contraindications.attempts).toBe(4);
    // OTC does not test renal adjustment, so it must not be credited with any.
    expect(map.bySkill.renal.attempts).toBe(0);
  });

  // A consultation is marked against five WWHAM items, so it offers five
  // chances at counselling and can log five misses. Counting it as one attempt
  // produced more errors than attempts and reported counselling at 0%.
  it("counts an OTC case as five counselling attempts, not one", () => {
    const map = buildWeaknessMap(rows(4, "otc"), DRUGS);
    expect(map.bySkill.counselling.attempts).toBe(20);
  });

  it("does not credit a warehousing case with clinical attempts", () => {
    const map = buildWeaknessMap(rows(5, "warehousing"), DRUGS);
    for (const s of SKILLS) expect(map.bySkill[s.key].attempts, s.key).toBe(0);
  });

  it("computes accuracy as attempts minus errors", () => {
    const map = buildWeaknessMap(
      [...rows(8, "otc"), ...rows(2, "otc", [err("Incomplete counselling")])],
      DRUGS,
    );
    // 10 OTC cases at five WWHAM items each, 2 counselling misses.
    expect(map.bySkill.counselling.attempts).toBe(50);
    expect(map.bySkill.counselling.errors).toBe(2);
    expect(map.bySkill.counselling.accuracy).toBeCloseTo(0.96, 5);
  });

  it("keeps process errors out of the skill figures but still counts them", () => {
    const map = buildWeaknessMap(rows(3, "industry", [err("Wrong storage zone")]), DRUGS);
    expect(map.unmappedErrors).toBe(3);
    for (const s of SKILLS) expect(map.bySkill[s.key].errors).toBe(0);
  });

  it("files an error under the class of the correct answer", () => {
    const map = buildWeaknessMap(
      rows(5, "rx", [err("Wrong drug selected", "Doxycycline")], ["Antibiotic"]),
      DRUGS,
    );
    const cell = map.cells.find((c) => c.drugClass === "Antibiotic" && c.skill === "selection");
    expect(cell?.errors).toBe(5);
    expect(map.classes).toContain("Antibiotic");
  });

  // Counting an error as proof the class was attempted makes every cell
  // errors/errors - a guaranteed 0% that only says the failures are all that
  // was recorded. Such a cell must stay grey.
  it("does not invent an attempt from an error", () => {
    const map = buildWeaknessMap(
      rows(6, "rx", [err("Wrong drug selected", "Doxycycline")]),
      DRUGS,
    );
    const cell = map.cells.find((c) => c.drugClass === "Antibiotic" && c.skill === "selection");
    expect(cell?.errors).toBe(6);
    expect(cell?.attempts).toBe(0);
    expect(cell?.accuracy).toBeNull();
  });

  it("finds the drug inside a prose answer", () => {
    const map = buildWeaknessMap(
      rows(4, "rx", [err("Wrong drug selected", "give doxycycline 100mg twice daily")]),
      DRUGS,
    );
    expect(map.classes).toContain("Antibiotic");
  });

  it("stays silent on a cell with too little behind it", () => {
    const map = buildWeaknessMap(
      rows(1, "rx", [err("Wrong drug selected", "Doxycycline")], ["Antibiotic"]),
      DRUGS,
    );
    const cell = map.cells.find((c) => c.drugClass === "Antibiotic" && c.skill === "selection");
    expect(cell?.attempts).toBeLessThan(MIN_ATTEMPTS);
    expect(cell?.accuracy).toBeNull();
    expect(bandFor(cell?.accuracy ?? null)).toBe("unknown");
  });

  it("never reports an accuracy outside 0 to 1", () => {
    // More errors than the mode could have offered attempts for.
    const map = buildWeaknessMap(
      rows(3, "otc", [err("Incomplete counselling"), err("Incomplete counselling"),
                      err("Incomplete counselling"), err("Incomplete counselling")]),
      DRUGS,
    );
    const acc = map.bySkill.counselling.accuracy as number;
    expect(acc).toBeGreaterThanOrEqual(0);
    expect(acc).toBeLessThanOrEqual(1);
  });

  it("survives rows with junk where the error list should be", () => {
    const junk = [
      { mode: "rx", errors_detail: null },
      { mode: "rx", errors_detail: "not a list" },
      { mode: "rx" },
      { mode: "nonsense-mode", errors_detail: [] },
    ] as ScoreRow[];
    expect(() => buildWeaknessMap(junk, DRUGS)).not.toThrow();
    expect(buildWeaknessMap(junk, DRUGS).totalCases).toBe(4);
  });

  it("returns an empty but usable map for a learner with no history", () => {
    const map = buildWeaknessMap([], DRUGS);
    expect(map.cells).toEqual([]);
    expect(map.classes).toEqual([]);
    expect(hasEnoughHistory(map)).toBe(false);
  });
});

describe("bandFor", () => {
  it("uses the thresholds the brief specifies", () => {
    expect(bandFor(0.2)).toBe("critical");
    expect(bandFor(0.39)).toBe("critical");
    expect(bandFor(0.4)).toBe("weak");
    expect(bandFor(0.59)).toBe("weak");
    expect(bandFor(0.6)).toBe("fair");
    expect(bandFor(0.79)).toBe("fair");
    expect(bandFor(0.8)).toBe("strong");
    expect(bandFor(1)).toBe("strong");
  });

  it("keeps insufficient data apart from a bad score", () => {
    expect(bandFor(null)).toBe("unknown");
    expect(bandFor(0)).toBe("critical");
  });
});

describe("weakestAreas", () => {
  it("ranks the worst first", () => {
    const map = buildWeaknessMap([
      ...rows(10, "otc"),
      ...rows(5, "otc", [err("Wrong OTC recommendation")]),
      ...rows(1, "otc", [err("Wrong dose or direction")]),
    ], DRUGS);
    const worst = weakestAreas(map, 2);
    expect(worst[0].skill).toBe("selection");
    expect(worst[0].accuracy).toBeLessThan(worst[1].accuracy);
  });

  // A single mistake in a class seen once is not a weakness, and recommending
  // study on that basis sends the learner somewhere at random.
  it("ignores areas with too little behind them", () => {
    const map = buildWeaknessMap(rows(1, "rx", [err("Wrong drug selected", "Doxycycline")]), DRUGS);
    expect(weakestAreas(map)).toEqual([]);
  });

  it("falls back to skill totals when no single class qualifies", () => {
    const map = buildWeaknessMap([
      ...rows(6, "otc"),
      ...rows(4, "otc", [err("Wrong OTC recommendation")]),
    ], DRUGS);
    const worst = weakestAreas(map);
    expect(worst.length).toBeGreaterThan(0);
    expect(worst[0].drugClass).toBeNull();
  });

  it("describes a gap in a sentence a learner can act on", () => {
    const gap = { drugClass: "Psychiatric", skill: "interactions" as const, accuracy: 0.23, attempts: 13, errors: 10 };
    const text = describeGap(gap);
    expect(text).toContain("Drug interactions");
    expect(text).toContain("Psychiatric");
    expect(text).toContain("23%");
  });
});

describe("modesForSkill", () => {
  it("points a gap at a mode that actually tests it", () => {
    expect(modesForSkill("renal")).toContain("hospital");
    expect(modesForSkill("counselling")).toContain("otc");
    expect(modesForSkill("labeling")).toContain("rx");
  });

  it("never sends a clinical gap to a process mode", () => {
    for (const s of SKILLS) {
      expect(modesForSkill(s.key)).not.toContain("industry");
      expect(modesForSkill(s.key)).not.toContain("warehousing");
    }
  });
});
