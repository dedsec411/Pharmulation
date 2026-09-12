import { describe, expect, it } from "vitest";
import {
  LABEL_FREQUENCIES, LABEL_TIMINGS, MAX_COURSE_DAYS, ONGOING,
  durationDays, formatDuration, normalizeDuration, normalizeTiming,
  regimenForDrug, regimenSig, frequencyFromText, timingFromText,
} from "./dosing";

// The dosage strings exactly as they are stored in the drugs table.
const REAL = {
  doxycycline: { dosage: "Adult: 100mg PO BD. Take with full glass of water, remain upright.", drug_class: "Tetracycline", category: "Antibiotic" },
  amoxicillin: { dosage: "Adult: 500mg PO TDS x 7d. Peds: 25-50mg/kg/day divided TDS.", drug_class: "Penicillin Antibiotic", category: "Antibiotic" },
  azithromycin: { dosage: "Adult: 500mg PO OD x 3d or 500mg D1, 250mg D2-5. Peds: 10mg/kg/day.", drug_class: "Macrolide Antibiotic", category: "Antibiotic" },
  clarithromycin: { dosage: "Adult: 250-500mg PO BD x 7-14d.", drug_class: "Macrolide", category: "Antibiotic" },
  amlodipine: { dosage: "Adult: 5-10mg PO OD.", drug_class: "Calcium Channel Blocker", category: "Cardiovascular" },
  metformin: { dosage: "Adult: 500mg PO OD-BD with food, titrate to 2g/day.", drug_class: "Biguanide", category: "Antidiabetic" },
  omeprazole: { dosage: "Adult: 20-40mg PO OD before breakfast.", drug_class: "PPI", category: "GI" },
  cetirizine: { dosage: "Adult: 10mg PO OD. Peds 2-6y: 2.5-5mg OD.", drug_class: "2nd-gen Antihistamine", category: "Antihistamine" },
  ibuprofen: { dosage: "Adult: 200-400mg PO q4-6h, max 1.2g OTC. Peds: 5-10mg/kg q6-8h.", drug_class: "NSAID", category: "Analgesic" },
  salbutamol: { dosage: "Inhaler: 100-200mcg PRN. Neb: 2.5-5mg q4-6h.", drug_class: "SABA", category: "Respiratory" },
};

describe("regimenForDrug", () => {
  it("reads doxycycline as 100 mg twice daily, not the invented 300 mg once daily", () => {
    const r = regimenForDrug(REAL.doxycycline)!;
    expect(r.strength).toBe("100 mg");
    expect(r.frequency).toBe("twice daily");
    expect(r.duration).toBe("7 days");
  });

  it("takes the course length from the text when it is stated", () => {
    expect(regimenForDrug(REAL.amoxicillin)!.duration).toBe("7 days");
    expect(regimenForDrug(REAL.azithromycin)!.duration).toBe("3 days");
  });

  it("takes the lower bound of a strength range as the starting dose", () => {
    expect(regimenForDrug(REAL.clarithromycin)!.strength).toBe("250 mg");
    expect(regimenForDrug(REAL.amlodipine)!.strength).toBe("5 mg");
    expect(regimenForDrug(REAL.omeprazole)!.strength).toBe("20 mg");
  });

  it("takes the lower bound of a frequency range too, so OD-BD starts once daily", () => {
    expect(regimenForDrug(REAL.metformin)!.frequency).toBe("once daily");
  });

  it("ignores the paediatric and nebuliser regimens that follow the adult one", () => {
    // Without the cut, cetirizine would read 2.5 mg and salbutamol 2.5 mg.
    expect(regimenForDrug(REAL.cetirizine)!.strength).toBe("10 mg");
    expect(regimenForDrug(REAL.salbutamol)!.strength).toBe("100 mcg");
  });

  it("reads PRN as an as-needed regimen", () => {
    const r = regimenForDrug(REAL.salbutamol)!;
    expect(r.frequency).toBe("as needed");
    expect(r.timing).toBe("as needed");
  });

  it("picks up administration timing", () => {
    expect(regimenForDrug(REAL.metformin)!.timing).toBe("with food");
    expect(regimenForDrug(REAL.omeprazole)!.timing).toBe("morning");
  });

  it("gives an antibiotic a finite course and a long-term medicine none", () => {
    expect(regimenForDrug(REAL.doxycycline)!.duration).toBe("7 days");
    expect(regimenForDrug(REAL.amlodipine)!.duration).toBe("ongoing");
    expect(regimenForDrug(REAL.metformin)!.duration).toBe("ongoing");
  });

  // The label step asks the learner to reproduce the regimen from fixed option
  // lists, so anything outside them cannot be selected and the step is stuck.
  it("only ever emits values the label form actually offers", () => {
    for (const drug of Object.values(REAL)) {
      const r = regimenForDrug(drug)!;
      expect(LABEL_FREQUENCIES).toContain(r.frequency);
      expect(LABEL_TIMINGS).toContain(r.timing);
      const days = durationDays(r.duration);
      if (days !== null) {
        expect(days).toBeGreaterThanOrEqual(1);
        expect(days).toBeLessThanOrEqual(MAX_COURSE_DAYS);
      }
    }
  });

  it("returns null rather than a half-parsed dose", () => {
    expect(regimenForDrug({ dosage: null })).toBeNull();
    expect(regimenForDrug({ dosage: "   " })).toBeNull();
    expect(regimenForDrug({ dosage: "Use as directed" })).toBeNull();
  });
});

describe("regimenSig", () => {
  it("writes the regimen the way a prescription reads", () => {
    expect(regimenSig(regimenForDrug(REAL.doxycycline)!))
      .toBe("100 mg, twice daily, morning, for 7 days");
  });

  it("leaves the duration off an ongoing medicine", () => {
    expect(regimenSig(regimenForDrug(REAL.amlodipine)!)).not.toContain("ongoing");
  });
});


describe("duration as a day count", () => {
  it("reads a plain day count", () => {
    expect(durationDays("7 days")).toBe(7);
    expect(durationDays("1 day")).toBe(1);
    expect(durationDays("10 days")).toBe(10);
  });

  // Stored cases were written against the old bucket list, so those spellings
  // have to keep grading against a slider that now speaks in days.
  it("understands the older bucket wording", () => {
    expect(durationDays("4 weeks")).toBe(28);
    expect(durationDays("2 weeks")).toBe(14);
    expect(durationDays("ongoing")).toBeNull();
    expect(durationDays("long-term")).toBeNull();
  });

  it("makes equivalent durations compare equal", () => {
    expect(normalizeDuration("4 weeks")).toBe(normalizeDuration("28 days"));
    expect(normalizeDuration("long-term")).toBe(normalizeDuration("ongoing"));
    expect(normalizeDuration("ongoing")).toBe(ONGOING);
  });

  it("gets the singular right on a one-day supply", () => {
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(2)).toBe("2 days");
  });

  it("keeps every stored duration reachable on the slider", () => {
    // These are the distinct values the live cases table actually holds.
    for (const stored of ["5 days", "7 days", "14 days", "4 weeks", "ongoing", "long-term"]) {
      const days = durationDays(stored);
      if (days === null) continue;
      expect(days, `${stored} is off the slider`).toBeGreaterThanOrEqual(1);
      expect(days, `${stored} is off the slider`).toBeLessThanOrEqual(MAX_COURSE_DAYS);
    }
  });
});

describe("dose-array notation", () => {
  // "1-0-1" is morning and night. It used to fall through to the default and
  // label a twice-daily medicine as once daily - marking a learner wrong for
  // reading the script correctly.
  it("counts the filled slots", () => {
    expect(frequencyFromText("1-0-1")).toBe("twice daily");
    expect(frequencyFromText("1-1-1")).toBe("three times daily");
    expect(frequencyFromText("1+1+1+1")).toBe("four times daily");
    expect(frequencyFromText("0-0-1")).toBe("once daily");
    expect(frequencyFromText("Metformin 500 mg 1-0-1 x 1/12")).toBe("twice daily");
  });

  it("reads when a single slot is filled", () => {
    expect(timingFromText("0-0-1", "once daily")).toBe("before sleep");
    expect(timingFromText("1-0-0", "once daily")).toBe("morning");
  });

  // A strength range and a date both carry digits and separators.
  it("does not mistake a strength or a duration for a regimen", () => {
    expect(frequencyFromText("250-500mg TDS")).toBe("three times daily");
    expect(frequencyFromText("Ramipril 5mg OD mane x 1/12")).toBe("once daily");
  });

  it("still reads p.c. as with food", () => {
    expect(timingFromText("OD p.c.", "once daily")).toBe("with food");
  });
});

describe("normalizeTiming", () => {
  it("compares by the instruction, not the wording", () => {
    expect(normalizeTiming("at bedtime")).toBe(normalizeTiming("before sleep"));
    expect(normalizeTiming("At Bedtime ")).toBe("before sleep");
  });

  it("keeps instructions that are genuinely different apart", () => {
    expect(normalizeTiming("before breakfast")).not.toBe(normalizeTiming("morning"));
    expect(normalizeTiming("with food")).not.toBe(normalizeTiming("with or without food"));
  });

  it("leaves anything it does not know alone", () => {
    expect(normalizeTiming("with a full glass of water")).toBe("with a full glass of water");
  });

  /**
   * The bug this exists for: seven authored answers used wordings the picker
   * could not produce, so those labels could not be marked correct however
   * carefully the prescription was read.
   */
  it("can produce every timing the case files actually use", () => {
    const authored = [
      "morning", "with food", "before sleep", "as needed",
      "with or without food", "at bedtime", "before breakfast", "any time",
    ];
    for (const timing of authored) {
      const target = normalizeTiming(timing);
      expect(LABEL_TIMINGS.some((option) => normalizeTiming(option) === target)).toBe(true);
    }
  });

  it("offers no two options that mean the same thing", () => {
    const normalised = LABEL_TIMINGS.map(normalizeTiming);
    expect(new Set(normalised).size).toBe(normalised.length);
  });
});
