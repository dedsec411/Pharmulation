import { describe, expect, it } from "vitest";
import {
  LABEL_DURATIONS, LABEL_FREQUENCIES, LABEL_TIMINGS,
  regimenForDrug, regimenSig,
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
      expect(LABEL_DURATIONS).toContain(r.duration);
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
