import { describe, expect, it } from "vitest";
import {
  chooseCatalogue, commercialsFor, storageFor, isControlled, needsColdChain,
  type CatalogueDrug,
} from "./bootstrap";
import { unitMargin, marginPercent, abcClassify } from "./economics";

const drug = (over: Partial<CatalogueDrug> & { id: string }): CatalogueDrug => ({
  name: over.id, category: "Other", ...over,
});

const CATALOGUE: CatalogueDrug[] = [
  drug({ id: "para", name: "Paracetamol", category: "Analgesic" }),
  drug({ id: "ibu", name: "Ibuprofen", category: "Analgesic" }),
  drug({ id: "amox", name: "Amoxicillin", category: "Antibiotic" }),
  drug({ id: "azi", name: "Azithromycin", category: "Antibiotic" }),
  drug({ id: "met", name: "Metformin", category: "Antidiabetic" }),
  drug({ id: "glarg", name: "Insulin Glargine", category: "Antidiabetic" }),
  drug({ id: "amlo", name: "Amlodipine", category: "Cardiovascular" }),
  drug({ id: "cet", name: "Cetirizine", category: "Antihistamine" }),
  drug({ id: "tram", name: "Tramadol", category: "Analgesic" }),
  drug({ id: "alp", name: "Alprazolam", category: "Anxiolytic" }),
];

describe("where a medicine has to live", () => {
  // A vaccine left in ambient storage is destroyed stock.
  it("puts the cold chain in the fridge", () => {
    expect(needsColdChain(drug({ id: "x", name: "Insulin Glargine" }))).toBe(true);
    expect(storageFor(drug({ id: "x", name: "Insulin Glargine" }))).toBe("cold-chain");
    expect(needsColdChain(drug({ id: "y", name: "Paracetamol" }))).toBe(false);
  });

  it("puts opioids and benzodiazepines in the safe", () => {
    expect(isControlled(drug({ id: "x", name: "Tramadol" }))).toBe(true);
    expect(isControlled(drug({ id: "y", name: "Alprazolam" }))).toBe(true);
    expect(storageFor(drug({ id: "x", name: "Morphine Sulfate" }))).toBe("cd-safe");
    expect(isControlled(drug({ id: "z", name: "Amoxicillin" }))).toBe(false);
  });

  // Controlled beats cold: a fridge in the open is not where a CD goes.
  it("prefers the safe when a medicine is both", () => {
    expect(storageFor(drug({ id: "x", name: "Midazolam injection" }))).toBe("cd-safe");
  });

  it("leaves everything else on the ordinary shelf", () => {
    expect(storageFor(drug({ id: "x", name: "Amlodipine" }))).toBe("ambient");
  });
});

describe("commercial terms", () => {
  it("is identical for the same drug and seed, and differs across seeds", () => {
    const a = commercialsFor(CATALOGUE[0], "seed-1");
    const b = commercialsFor(CATALOGUE[0], "seed-1");
    const c = commercialsFor(CATALOGUE[0], "seed-2");
    expect(a).toEqual(b);
    expect(a.mrp === c.mrp && a.baseWeekly === c.baseWeekly).toBe(false);
  });

  // DRAP sets the ceiling; buying well is one of the few levers left.
  it("always leaves a workable retail margin", () => {
    for (const d of CATALOGUE) {
      const line = commercialsFor(d, "s");
      expect(unitMargin(line)).toBeGreaterThan(0);
      const pct = marginPercent(line);
      expect(pct).toBeGreaterThanOrEqual(11);
      expect(pct).toBeLessThanOrEqual(23);
    }
  });

  it("prices a fridge line above a painkiller", () => {
    const insulin = commercialsFor(drug({ id: "i", name: "Insulin Glargine" }), "s");
    const para = commercialsFor(drug({ id: "p", name: "Paracetamol", category: "Analgesic" }), "s");
    expect(insulin.mrp).toBeGreaterThan(para.mrp);
  });

  // Over-ordering a fridge line should hurt, and short dating is why.
  it("gives cold chain months of life, not years", () => {
    const insulin = commercialsFor(drug({ id: "i", name: "Insulin Glargine" }), "s");
    const tablet = commercialsFor(drug({ id: "a", name: "Amlodipine" }), "s");
    expect(insulin.shelfLifeWeeks).toBeLessThan(tablet.shelfLifeWeeks);
    expect(insulin.shelfLifeWeeks).toBeGreaterThan(20);
  });

  it("makes everyday medicines move and specialist ones crawl", () => {
    const para = commercialsFor(drug({ id: "p", name: "Paracetamol", category: "Analgesic" }), "s");
    const insulin = commercialsFor(drug({ id: "i", name: "Insulin Glargine" }), "s");
    expect(para.baseWeekly).toBeGreaterThan(insulin.baseWeekly);
  });

  it("makes antibiotics a winter line and antihistamines a spring one", () => {
    const amox = commercialsFor(drug({ id: "a", name: "Amoxicillin", category: "Antibiotic" }), "s");
    const cet = commercialsFor(drug({ id: "c", name: "Cetirizine", category: "Antihistamine" }), "s");
    expect(amox.seasonality).toBeGreaterThan(0.3);
    expect(cet.seasonality).toBeGreaterThan(0.3);
    expect(amox.peakWeek).toBeLessThan(10);
    expect(cet.peakWeek).toBeGreaterThan(10);
  });

  it("never quotes a lead time of zero", () => {
    for (const d of CATALOGUE) {
      expect(commercialsFor(d, "s").leadTimeWeeks).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("choosing what the pharmacy carries", () => {
  it("is reproducible from the seed", () => {
    const a = chooseCatalogue(CATALOGUE, "seed-1", 6).map((l) => l.drugId);
    const b = chooseCatalogue(CATALOGUE, "seed-1", 6).map((l) => l.drugId);
    expect(a).toEqual(b);
  });

  // A list that is all painkillers has no ABC analysis worth doing.
  it("spreads across categories before doubling up on one", () => {
    const picked = chooseCatalogue(CATALOGUE, "s", 5);
    const categories = new Set(picked.map(
      (l) => CATALOGUE.find((d) => d.id === l.drugId)!.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it("never repeats a medicine", () => {
    const picked = chooseCatalogue(CATALOGUE, "s", 10);
    expect(new Set(picked.map((l) => l.drugId)).size).toBe(picked.length);
  });

  it("stops at what the catalogue can supply", () => {
    expect(chooseCatalogue(CATALOGUE, "s", 500)).toHaveLength(CATALOGUE.length);
    expect(chooseCatalogue([], "s", 40)).toEqual([]);
  });

  // The whole reason to pick for spread: the analysis has to separate things.
  it("produces a list where ABC actually splits", () => {
    const lines = chooseCatalogue(CATALOGUE, "s", 10);
    const classes = abcClassify(lines.map((l) => ({
      drugId: l.drugId, annualValue: l.mrp * l.baseWeekly * 52,
    })));
    const distinct = new Set(Object.values(classes));
    expect(distinct.size).toBeGreaterThan(1);
  });
});
