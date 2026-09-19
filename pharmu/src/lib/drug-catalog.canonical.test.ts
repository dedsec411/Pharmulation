import { describe, expect, it } from "vitest";
import { canonicalDrugKey, normalizeDrugKey, prepareDrugCatalog } from "./drug-catalog";

/**
 * One molecule must appear once, and two molecules must never become one.
 *
 * The catalogue is assembled from a table that carries both spellings of five
 * medicines, and the dispensing check compares the name a learner picked with
 * the name the prescription asked for. Collapse too little and the learner is
 * marked wrong for handing over the right drug; collapse too much and two
 * genuinely different medicines become indistinguishable, which is worse.
 */

const drug = (name: string, generic = name, category = "Analgesic") => ({
  name, generic_name: generic, category, drug_class: "Test", indications: [], dosage: "",
});

describe("canonicalDrugKey", () => {
  it("folds a US name into the spelling the prescriptions use", () => {
    expect(canonicalDrugKey("Acetaminophen")).toBe("paracetamol");
    expect(canonicalDrugKey("Albuterol")).toBe("salbutamol");
    expect(canonicalDrugKey("Glyburide")).toBe("glibenclamide");
  });

  it("folds a salt or spelling variant into the plain name", () => {
    expect(canonicalDrugKey("Atropine Sulfate")).toBe("atropine");
    expect(canonicalDrugKey("Lidocaine HCl")).toBe("lidocaine");
    expect(canonicalDrugKey("Lignocaine")).toBe("lidocaine");
    expect(canonicalDrugKey("Amoxycillin")).toBe("amoxicillin");
  });

  it("still ignores strength and dosage form, as the plain key does", () => {
    expect(canonicalDrugKey("Paracetamol 500mg tablet")).toBe("paracetamol");
    expect(canonicalDrugKey("Acetaminophen 500 mg")).toBe("paracetamol");
  });

  it("leaves a medicine with no synonym exactly as the plain key had it", () => {
    for (const name of ["Metformin", "Omeprazole", "Cetirizine", "Ibuprofen"]) {
      expect(canonicalDrugKey(name)).toBe(normalizeDrugKey(name));
    }
  });

  /**
   * The failure that would matter most: two different medicines merged.
   * These are the pairs the look-alike drill is built from and near-misses
   * that share a stem; none of them is one molecule.
   */
  it("never merges two different medicines", () => {
    const mustDiffer: Array<[string, string]> = [
      ["Hydralazine", "Hydroxyzine"],
      ["Clobazam", "Clonazepam"],
      ["Amlodipine", "Amiodarone"],
      ["Metformin", "Metronidazole"],
      ["Prednisone", "Prednisolone"],
      ["Cefotaxime", "Cefuroxime"],
      ["Atropine", "Atenolol"],
      ["Lidocaine", "Lincomycin"],
      ["Salbutamol", "Salmeterol"],
      ["Paracetamol", "Pantoprazole"],
    ];
    for (const [a, b] of mustDiffer) {
      expect(canonicalDrugKey(a)).not.toBe(canonicalDrugKey(b));
    }
  });
});

describe("prepareDrugCatalog", () => {
  it("offers one entry per molecule when the table holds both spellings", () => {
    const list = prepareDrugCatalog([
      drug("Acetaminophen"),
      drug("Paracetamol"),
      drug("Salbutamol", "Albuterol", "Respiratory"),
      drug("Albuterol", "Albuterol", "Respiratory"),
    ]);
    expect(list.filter((d) => canonicalDrugKey(d.name) === "paracetamol")).toHaveLength(1);
    expect(list.filter((d) => canonicalDrugKey(d.name) === "salbutamol")).toHaveLength(1);
  });

  it("keeps the spelling the prescriptions are written in, whichever row comes first", () => {
    const usFirst = prepareDrugCatalog([drug("Acetaminophen"), drug("Paracetamol")]);
    const ukFirst = prepareDrugCatalog([drug("Paracetamol"), drug("Acetaminophen")]);
    expect(usFirst.find((d) => canonicalDrugKey(d.name) === "paracetamol")?.name).toBe("Paracetamol");
    expect(ukFirst.find((d) => canonicalDrugKey(d.name) === "paracetamol")?.name).toBe("Paracetamol");
  });

  it("drops an exact duplicate row without dropping a different medicine", () => {
    const list = prepareDrugCatalog([
      drug("Ampicillin", "Ampicillin", "Antibiotic"),
      drug("Ampicillin", "Ampicillin", "Antibiotic"),
      drug("Amoxicillin", "Amoxicillin", "Antibiotic"),
    ]);
    expect(list.filter((d) => d.name === "Ampicillin")).toHaveLength(1);
    expect(list.filter((d) => d.name === "Amoxicillin")).toHaveLength(1);
  });

  it("seeds the bronchodilator shelf without listing one medicine twice", () => {
    const list = prepareDrugCatalog([]);
    const bronchodilators = list.filter((d) => canonicalDrugKey(d.name) === "salbutamol");
    expect(bronchodilators).toHaveLength(1);
  });
});

/**
 * The fold must never cost a case its medicine.
 *
 * These are the names every written case actually asks for, read from the
 * `drugs_required` column of all 65 cases on 2026-09-19. Each one is dispensed
 * by picking it off the shelf, so if the fold ever dropped one - or kept it
 * under a spelling the case does not use - that case would become unplayable.
 */
const REQUIRED_BY_CASES = [
  "Paracetamol", "Omeprazole", "Amoxicillin", "Lisinopril", "Methotrexate",
  "Cetirizine", "Metformin", "Atorvastatin", "Clarithromycin", "Azithromycin",
  "Amlodipine", "Losartan", "Aspirin", "Salbutamol",
];

describe("the medicines the cases require", () => {
  it("all survive the catalogue fold, even when the table also holds the US spelling", () => {
    const table = [
      ...REQUIRED_BY_CASES.map((n) => drug(n)),
      // the twins that share a molecule with one of the above
      drug("Acetaminophen"),
      drug("Albuterol", "Albuterol", "Respiratory"),
      // and an exact duplicate row, as the live table has seven of
      drug("Amoxicillin"),
    ];
    const list = prepareDrugCatalog(table);
    for (const name of REQUIRED_BY_CASES) {
      const matches = list.filter((d) => canonicalDrugKey(d.name) === canonicalDrugKey(name));
      expect(matches, `${name} must still be on a shelf`).toHaveLength(1);
      expect(matches[0].name).toBe(name);
    }
  });
});
