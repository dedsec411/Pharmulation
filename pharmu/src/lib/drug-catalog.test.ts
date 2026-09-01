import { describe, expect, it } from "vitest";
import {
  MAX_BRANDS_PER_DRUG, RX_DRUG_CATEGORIES,
  getBrandsForDrug, normalizeDrugCategory, setRealBrands,
} from "./drug-catalog";

describe("RX_DRUG_CATEGORIES", () => {
  it("lists each shelf once", () => {
    expect(new Set(RX_DRUG_CATEGORIES).size).toBe(RX_DRUG_CATEGORIES.length);
  });

  // The shelf builds its categories from this list, so a category the drugs
  // table uses but this list omits leaves those medicines unreachable. Five
  // were missing, hiding fifty drugs including every antidepressant.
  it("covers every category the drugs table actually uses", () => {
    const inDatabase = [
      "Cardiovascular", "Immunology", "Psychiatric", "Analgesic", "GI",
      "Antidiabetic", "Supplement", "Antibiotic", "Oncology", "Emergency",
      "Diabetes", "Respiratory", "Topical", "Antihistamine", "Anesthetic",
      "Ophthalmic", "Nasal",
    ];
    for (const category of inDatabase) {
      // Diabetes folds into Antidiabetic before it reaches the shelf.
      expect(RX_DRUG_CATEGORIES, category).toContain(normalizeDrugCategory(category));
    }
  });
});

describe("getBrandsForDrug", () => {
  it("offers no more than three brands", () => {
    setRealBrands({
      paracetamol: [
        { brand: "Panadol", company: "Haleon" },
        { brand: "Calpol", company: "Haleon" },
        { brand: "Tylenol", company: "Kenvue" },
        { brand: "Extra", company: "Should not appear" },
      ],
    });
    const brands = getBrandsForDrug({ name: "Paracetamol" });
    expect(brands).toHaveLength(MAX_BRANDS_PER_DRUG);
    expect(brands.map((b) => b.brand)).not.toContain("Extra");
  });

  it("carries the company alongside the brand", () => {
    setRealBrands({ paracetamol: [{ brand: "Panadol", company: "Haleon" }] });
    expect(getBrandsForDrug({ name: "Paracetamol" })[0]).toEqual({ brand: "Panadol", company: "Haleon" });
  });

  it("still caps the generated fallback for a drug with no real brands", () => {
    setRealBrands({});
    const brands = getBrandsForDrug({ name: "Nonexistent Compound" });
    expect(brands.length).toBeLessThanOrEqual(MAX_BRANDS_PER_DRUG);
    expect(brands.every((b) => typeof b.brand === "string")).toBe(true);
  });
});
