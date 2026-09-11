import { describe, expect, it } from "vitest";
import {
  chooseCatalogue, commercialsFor, storageFor, isControlled, needsColdChain,
  STARTING, startingPosition, openingStock, type CatalogueDrug,
} from "./bootstrap";
import { unitMargin, marginPercent, abcClassify, RUPEE } from "./economics";

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

describe("opening a facility", () => {
  const lines = chooseCatalogue(CATALOGUE, "s", 10);

  // Working capital is the constraint a small pharmacy actually lives under.
  // On hard there is no overdraft at all, so one over-ordered week can end it.
  it("gets tighter as difficulty rises", () => {
    const easy = startingPosition(lines, "easy");
    const medium = startingPosition(lines, "medium");
    const hard = startingPosition(lines, "hard");

    expect(easy.cash).toBeGreaterThan(medium.cash);
    expect(medium.cash).toBeGreaterThan(hard.cash);
    expect(hard.overdraft).toBe(0);
    expect(hard.weeklyOverheads).toBeGreaterThan(easy.weeklyOverheads);
  });

  // The single number that decides whether the mode has any tension in it. A
  // pharmacy whose rent is a rounding error on its margin can never go under,
  // and a budget that cannot bite teaches nothing about budgets.
  it("sets the rent against what the shop actually earns", () => {
    const position = startingPosition(lines, "medium");
    const grossMargin = position.weeklyRevenue - position.weeklyCost;

    expect(position.weeklyOverheads).toBeGreaterThan(grossMargin * 0.7);
    expect(position.weeklyOverheads).toBeLessThan(grossMargin);
  });

  // A pharmacy that cannot afford to restock what it sold in a week is not a
  // going concern, and one holding four weeks of buying in cash has no
  // decisions left to make.
  it("holds about a week of buying in the bank", () => {
    const position = startingPosition(lines, "medium");
    expect(position.cash).toBeGreaterThan(position.weeklyCost * 0.8);
    expect(position.cash).toBeLessThan(position.weeklyCost * 1.5);
  });

  // A rent of Rs 43,217.61 tells a learner the number came out of a
  // spreadsheet rather than off a lease.
  it("quotes whole rupees", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const position = startingPosition(lines, level);
      expect(position.cash % RUPEE).toBe(0);
      expect(position.weeklyOverheads % RUPEE).toBe(0);
      expect(position.overdraft % RUPEE).toBe(0);
    }
  });

  // A ten-line pharmacy and a forty-line one have to be under the same
  // pressure, or difficulty would just mean "how big a catalogue you got".
  it("keeps the pressure the same however much the shop sells", () => {
    const small = startingPosition(chooseCatalogue(CATALOGUE, "s", 4), "medium");
    const large = startingPosition(lines, "medium");
    const squeeze = (p: typeof small) => p.weeklyOverheads / (p.weeklyRevenue - p.weeklyCost);

    expect(squeeze(small)).toBeCloseTo(squeeze(large), 1);
    expect(large.weeklyOverheads).toBeGreaterThan(small.weeklyOverheads);
  });

  // The learner inherits a working pharmacy, not a loading bay. The type
  // already forbids quarantine here, so this checks the runtime value lands in
  // a real zone rather than restating what the compiler guarantees.
  it("opens the shelf already put away", () => {
    const zones = ["ambient", "cold-chain", "cd-safe", "flammables"];
    const stock = openingStock(lines, "s", 2);
    expect(stock.length).toBeGreaterThan(0);
    expect(stock.every((b) => zones.includes(b.location))).toBe(true);
  });

  it("puts every medicine where it belongs", () => {
    const stock = openingStock(lines, "s", 2);
    for (const batch of stock) {
      const line = lines.find((l) => l.drugId === batch.drugId)!;
      expect(batch.location).toBe(line.storage);
    }
  });

  // A facility that opens clean teaches nothing about expiry until week
  // thirty. Some stock has to be dying while there is still cash to react.
  it("opens with some stock already near the end of its life", () => {
    const stock = openingStock(lines, "s", 2);
    expect(stock.some((b) => b.expiresPeriod <= 8)).toBe(true);
  });

  // The facility opens with a sale licence and no narcotics permit. Handing it
  // stock it is not licensed to hold would fail the first inspection for a
  // decision the learner never made.
  it("opens with nothing controlled on the shelf", () => {
    const stock = openingStock(lines, "s", 2);
    const controlled = lines.filter((l) => l.controlled).map((l) => l.drugId);
    expect(controlled.length).toBeGreaterThan(0);
    expect(stock.some((b) => controlled.includes(b.drugId))).toBe(false);
  });

  it("never opens with a dead or empty batch", () => {
    const stock = openingStock(lines, "s", 2);
    expect(stock.every((b) => b.qty >= 1 && b.expiresPeriod >= 3)).toBe(true);
  });

  it("stocks more when the cover is deeper", () => {
    const thin = openingStock(lines, "s", 1);
    const deep = openingStock(lines, "s", 4);
    const total = (b: { qty: number }[]) => b.reduce((n, x) => n + x.qty, 0);
    expect(total(deep)).toBeGreaterThan(total(thin));
  });

  // A recall names a batch number and nothing else, so two batches sharing one
  // would withdraw stock that was never recalled.
  it("gives every batch a number of its own", () => {
    const stock = openingStock(lines, "s", 2);
    expect(new Set(stock.map((b) => b.batchNo)).size).toBe(stock.length);
  });

  it("rebuilds identically from the same seed", () => {
    expect(openingStock(lines, "s", 2)).toEqual(openingStock(lines, "s", 2));
  });
});
