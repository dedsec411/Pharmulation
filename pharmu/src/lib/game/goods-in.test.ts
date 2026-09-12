import { describe, expect, it } from "vitest";
import {
  ACCEPT_OPTION, CONDITION_ROWS, MAX_CARTONS, MIN_SHELF_LIFE_MONTHS, SOUND_CONDITION,
  buildGoodsIn, conditionMatches, correctDecision, findingLabel, gs1CheckDigit,
  isDecisionCorrect, labelFields, monthsBetween, readStrength,
  type ShipmentLike,
} from "./goods-in";

const NOW = new Date("2026-09-12T00:00:00Z");

/** A delivery with plenty of shelf life, so nothing is short-dated by accident. */
const LONG_DATED: ShipmentLike[] = [
  { id: "S1", drug: "Insulin Glargine", batch: "INS-241", expiry: "2028-04-30", requirement: "Store at 2-8°C" },
  { id: "S2", drug: "Amoxicillin 500mg caps", batch: "AMX-882", expiry: "2028-09-30", requirement: "Store below 25°C" },
  { id: "S3", drug: "Morphine 10mg/mL", batch: "MOR-907", expiry: "2028-06-30", requirement: "Controlled substance", controlled: true },
];

describe("monthsBetween", () => {
  it("counts whole months and does not round a part month up", () => {
    expect(monthsBetween(NOW, new Date("2027-09-12T00:00:00Z"))).toBe(12);
    expect(monthsBetween(NOW, new Date("2027-09-11T00:00:00Z"))).toBe(11);
  });

  it("goes negative once the date has gone", () => {
    expect(monthsBetween(NOW, new Date("2026-07-01T00:00:00Z"))).toBeLessThan(0);
  });
});

describe("readStrength", () => {
  it("takes the strength the catalogue already states", () => {
    expect(readStrength("Amoxicillin 500mg caps")).toBe("500mg");
    expect(readStrength("Morphine 10mg/mL")).toBe("10mg/mL");
    expect(readStrength("Trastuzumab 440mg")).toBe("440mg");
  });

  it("invents nothing for a product with no printed strength", () => {
    expect(readStrength("Insulin Glargine")).toBeNull();
  });
});

describe("gs1CheckDigit", () => {
  it("agrees with a published GTIN-14", () => {
    expect(gs1CheckDigit("1061414100041")).toBe(5);
  });

  it("puts a valid check digit on every barcode it prints", () => {
    for (const carton of buildGoodsIn("case-a", LONG_DATED, NOW)) {
      expect(carton.gtin).toHaveLength(14);
      expect(Number(carton.gtin[13])).toBe(gs1CheckDigit(carton.gtin.slice(0, 13)));
    }
  });
});

describe("buildGoodsIn", () => {
  it("hands the same delivery back on a replay", () => {
    expect(buildGoodsIn("case-a", LONG_DATED, NOW))
      .toEqual(buildGoodsIn("case-a", LONG_DATED, NOW));
  });

  it("gives a different case a different delivery", () => {
    const a = buildGoodsIn("case-a", LONG_DATED, NOW);
    const b = buildGoodsIn("case-b", LONG_DATED, NOW);
    expect(a.map((c) => c.dc.number)).not.toEqual(b.map((c) => c.dc.number));
  });

  it("caps the phase so it does not eat the clock", () => {
    const many = [...LONG_DATED, ...LONG_DATED].map((s, i) => ({ ...s, id: `X${i}` }));
    expect(buildGoodsIn("case-a", many, NOW)).toHaveLength(MAX_CARTONS);
  });

  it("copes with a case that has no shipments", () => {
    expect(buildGoodsIn("case-a", [], NOW)).toEqual([]);
  });

  it("never takes the medicine, batch or expiry from anywhere but the case", () => {
    const cartons = buildGoodsIn("case-a", LONG_DATED, NOW);
    expect(cartons.map((c) => c.product)).toEqual(LONG_DATED.map((s) => s.drug));
    expect(cartons.map((c) => c.batch)).toEqual(LONG_DATED.map((s) => s.batch));
    expect(cartons.map((c) => c.expiry)).toEqual(LONG_DATED.map((s) => s.expiry));
  });

  it("always leaves something worth stopping", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const cartons = buildGoodsIn(seed, LONG_DATED, NOW);
      expect(cartons.some((c) => c.findings.length)).toBe(true);
    }
  });

  it("leaves something sound too, so accepting is still a decision", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const cartons = buildGoodsIn(seed, LONG_DATED, NOW);
      expect(cartons.some((c) => !c.findings.length)).toBe(true);
    }
  });

  // The bug this guards: authoring faults first and checking dates afterwards
  // would mark a carton "in order" that is actually two months from expiry.
  it("never calls a carton sound while it fails the shelf-life term", () => {
    const mixed: ShipmentLike[] = [
      { id: "S1", drug: "Nitroglycerin SL", batch: "NTG-115", expiry: "2026-12-31", requirement: "Protect from light" },
      ...LONG_DATED.slice(0, 2),
    ];
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      for (const carton of buildGoodsIn(seed, mixed, NOW)) {
        if (!carton.findings.length) {
          expect(carton.monthsToExpiry).toBeGreaterThanOrEqual(MIN_SHELF_LIFE_MONTHS);
        }
      }
    }
  });

  it("finds the short-dated batch the case already carries", () => {
    const cartons = buildGoodsIn("case-a", [
      { id: "S1", drug: "Nitroglycerin SL", batch: "NTG-115", expiry: "2026-12-31", requirement: "Protect from light" },
    ], NOW);
    expect(cartons[0].findings).toContain("short-shelf-life");
  });

  it("does not choke on a batch with no printed expiry", () => {
    const cartons = buildGoodsIn("case-a", [{ id: "S1", drug: "Something", batch: "B1" }], NOW);
    expect(cartons[0].expiryLabel).toBe("Not printed");
    expect(cartons[0].findings).not.toContain("short-shelf-life");
  });

  it("makes every planted fault actually visible on the screen", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      for (const carton of buildGoodsIn(seed, LONG_DATED, NOW)) {
        if (carton.findings.includes("batch-mismatch")) {
          expect(carton.dc.batch).not.toBe(carton.batch);
        }
        if (carton.findings.includes("qty-mismatch")) {
          expect(carton.dc.qty).not.toBe(carton.qty);
        }
        if (carton.findings.includes("damaged")) {
          expect(conditionMatches(carton, SOUND_CONDITION)).toBe(false);
          expect(carton.conditionNote).toBeTruthy();
        }
      }
    }
  });

  it("leaves a sound carton's paperwork agreeing with itself", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      for (const carton of buildGoodsIn(seed, LONG_DATED, NOW)) {
        if (carton.findings.length) continue;
        expect(carton.dc.batch).toBe(carton.batch);
        expect(carton.dc.qty).toBe(carton.qty);
        expect(carton.po.qty).toBe(carton.qty);
        expect(carton.condition).toEqual(SOUND_CONDITION);
      }
    }
  });
});

describe("the GRN decision", () => {
  const cartons = buildGoodsIn("case-a", LONG_DATED, NOW);
  const sound = cartons.find((c) => !c.findings.length)!;
  const faulty = cartons.find((c) => c.findings.length)!;

  it("accepts a sound carton and nothing else", () => {
    expect(isDecisionCorrect(sound, ACCEPT_OPTION)).toBe(true);
    expect(isDecisionCorrect(sound, findingLabel("damaged"))).toBe(false);
    expect(correctDecision(sound)).toBe(ACCEPT_OPTION);
  });

  it("will not let a faulty carton through on an accept", () => {
    expect(isDecisionCorrect(faulty, ACCEPT_OPTION)).toBe(false);
  });

  it("wants the fault named, not just a refusal", () => {
    const wrongReason = (["batch-mismatch", "qty-mismatch", "damaged", "short-shelf-life"] as const)
      .find((code) => !faulty.findings.includes(code))!;
    expect(isDecisionCorrect(faulty, findingLabel(wrongReason))).toBe(false);
    expect(isDecisionCorrect(faulty, findingLabel(faulty.findings[0]))).toBe(true);
  });

  // A carton can be short-dated *and* torn. Refusing it for either is right.
  it("takes any real fault on a carton that has more than one", () => {
    const both = buildGoodsIn("case-a", [
      { id: "S1", drug: "Nitroglycerin SL", batch: "NTG-115", expiry: "2026-12-31", requirement: "Protect from light" },
    ], NOW)[0];
    for (const code of both.findings) {
      expect(isDecisionCorrect(both, findingLabel(code))).toBe(true);
    }
  });
});

describe("the condition record", () => {
  const cartons = buildGoodsIn("case-a", LONG_DATED, NOW);

  it("passes only when all four rows match what is in front of you", () => {
    const carton = cartons[0];
    expect(conditionMatches(carton, carton.condition)).toBe(true);
    for (const row of CONDITION_ROWS) {
      const flipped = { ...carton.condition, [row.key]: !carton.condition[row.key] };
      expect(conditionMatches(carton, flipped)).toBe(false);
    }
  });
});

describe("labelFields", () => {
  it("numbers without a gap when a product has no printed strength", () => {
    const [insulin] = buildGoodsIn("case-a", LONG_DATED, NOW);
    const fields = labelFields(insulin);
    expect(fields.map((f) => f.n)).toEqual(fields.map((_, i) => i + 1));
    expect(fields.some((f) => f.label === "Strength")).toBe(false);
  });

  it("keeps the strength line when the catalogue states one", () => {
    const fields = labelFields(buildGoodsIn("case-a", LONG_DATED, NOW)[1]);
    expect(fields.find((f) => f.label === "Strength")?.value).toBe("500mg");
  });

  it("gives every field something to check it against", () => {
    for (const field of labelFields(buildGoodsIn("case-a", LONG_DATED, NOW)[0])) {
      expect(field.verify.length).toBeGreaterThan(10);
    }
  });
});
