import { describe, expect, it } from "vitest";
import {
  ACCEPT_OPTION, CONDITION_ROWS, MAX_CARTONS, SOUND_CONDITION,
  buildGoodsIn, conditionMatches, correctDecision, decisionFeedback, decisionOptionsFor,
  describeCondition,
  findingLabel, gs1CheckDigit,
  isDecisionCorrect, labelFields, monthsBetween, readStrength, stockCountNote,
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
          expect(carton.monthsToExpiry).toBeGreaterThanOrEqual(carton.po.minShelfLifeMonths);
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

describe("decisionFeedback", () => {
  const cartons = buildGoodsIn("case-a", LONG_DATED, NOW);
  const sound = cartons.find((c) => !c.findings.length)!;
  const faulty = cartons.find((c) => c.findings.length)!;

  it("names the three ways a call goes wrong", () => {
    expect(decisionFeedback(sound, findingLabel("damaged")).errorType).toBe("Sound consignment refused");
    expect(decisionFeedback(faulty, ACCEPT_OPTION).errorType).toBe("Faulty consignment accepted");
    const wrong = (["batch-mismatch", "qty-mismatch", "damaged", "short-shelf-life"] as const)
      .find((c) => !faulty.findings.includes(c))!;
    expect(decisionFeedback(faulty, findingLabel(wrong)).errorType).toBe("Wrong discrepancy raised");
  });

  it("always says what was actually wrong with a faulty carton", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      for (const carton of buildGoodsIn(seed, LONG_DATED, NOW)) {
        if (!carton.findings.length) continue;
        const feedback = decisionFeedback(carton, ACCEPT_OPTION);
        expect(feedback.whyWrong.length).toBeGreaterThan(40);
        expect(feedback.whatToKnow.length).toBeGreaterThan(40);
      }
    }
  });
});

describe("describeCondition", () => {
  it("reads as a sound carton when nothing is flagged", () => {
    expect(describeCondition(SOUND_CONDITION)).toContain("no damage");
  });

  it("lists only what was flagged", () => {
    expect(describeCondition({ ...SOUND_CONDITION, seal: false })).toBe("seal broken");
  });
});

/**
 * The spreads the eight warehousing cases actually deliver, in months from
 * today. Five of them had no batch reaching twelve months, which is what a
 * fixed threshold turned into "refuse everything".
 */
const REAL_SPREADS: Record<string, number[]> = {
  "morning receiving": [7, 12, 3],
  "cold-chain heavy day": [6, 3, 1],
  "controlled receipt": [10, 7, 3],
  "excursion detected": [5, 8, 2],
  "routine ambient": [18, 15, 21],
  "insulin shipment": [7, 9, 8],
  "vitamins": [11, 13, 16],
  "multi-product FEFO": [6, 11],
};

function atMonths(months: number[]): ShipmentLike[] {
  return months.map((m, i) => {
    const expiry = new Date(NOW);
    expiry.setMonth(expiry.getMonth() + m);
    return {
      id: `S${i + 1}`, drug: `Medicine ${i + 1} 10mg`, batch: `MED-${i + 1}0${m}`,
      expiry: expiry.toISOString().slice(0, 10), requirement: "Store below 25°C",
    };
  });
}

describe("against the deliveries the real cases carry", () => {
  for (const [name, spread] of Object.entries(REAL_SPREADS)) {
    it(`leaves ${name} with something to accept and something to stop`, () => {
      for (const seed of ["a", "b", "c", "d"]) {
        const cartons = buildGoodsIn(`${seed}-${name}`, atMonths(spread), NOW);
        expect(cartons.some((c) => !c.findings.length)).toBe(true);
        expect(cartons.some((c) => c.findings.length)).toBe(true);
      }
    });
  }

  it("writes the term it judged by onto the order the learner can read", () => {
    for (const spread of Object.values(REAL_SPREADS)) {
      const cartons = buildGoodsIn("case-a", atMonths(spread), NOW);
      const term = cartons[0].po.minShelfLifeMonths;
      expect([6, 9, 12, 18]).toContain(term);
      expect(Math.max(...spread)).toBeGreaterThanOrEqual(term);
      for (const carton of cartons) {
        expect(carton.po.minShelfLifeMonths).toBe(term);
        expect(carton.findings.includes("short-shelf-life")).toBe(carton.monthsToExpiry < term);
      }
    }
  });

  // A delivery where nothing has any life left should read as one to turn away,
  // not be rescued into looking acceptable by dropping the term far enough.
  it("does not soften the term below what a buyer would ever write", () => {
    const cartons = buildGoodsIn("case-a", atMonths([2, 1, 3]), NOW);
    expect(cartons[0].po.minShelfLifeMonths).toBe(6);
    expect(cartons.every((c) => c.findings.includes("short-shelf-life"))).toBe(true);
  });
});

describe("the mix of checks a learner meets", () => {
  it("never fails two cartons of one delivery the same authored way", () => {
    for (const spread of Object.values(REAL_SPREADS)) {
      for (const seed of ["a", "b", "c", "d", "e", "f"]) {
        const authored = buildGoodsIn(seed, atMonths(spread), NOW)
          .flatMap((c) => c.findings)
          .filter((f) => f !== "short-shelf-life");
        expect(new Set(authored).size).toBe(authored.length);
      }
    }
  });

  // Dates crowding out everything else is what the shelf-life term was
  // rebalanced to stop: a damaged carton never appeared at all, so the
  // condition check had nothing to catch in any of the eight cases.
  it("puts every kind of check in front of somebody working through the cases", () => {
    const seen = new Set<string>();
    for (const spread of Object.values(REAL_SPREADS)) {
      for (const seed of ["a", "b", "c"]) {
        for (const carton of buildGoodsIn(seed, atMonths(spread), NOW)) {
          carton.findings.forEach((f) => seen.add(f));
        }
      }
    }
    expect([...seen].sort()).toEqual(["batch-mismatch", "damaged", "qty-mismatch", "short-shelf-life"]);
  });

  it("leaves dates deciding some cartons but never most of them", () => {
    let dated = 0, total = 0;
    for (const spread of Object.values(REAL_SPREADS)) {
      for (const carton of buildGoodsIn("case-a", atMonths(spread), NOW)) {
        total += 1;
        if (carton.findings.includes("short-shelf-life")) dated += 1;
      }
    }
    expect(dated).toBeGreaterThan(0);
    expect(dated).toBeLessThan(total / 2);
  });
});

describe("what the stock count already said", () => {
  const flagged = [
    { item: "Amoxicillin 500mg", expected: 1200, actual: 1188, investigate: true },
    { item: "Paracetamol 500mg", expected: 3000, actual: 3000, investigate: false },
  ];

  it("recognises the count naming a product slightly differently", () => {
    // The count says "Amoxicillin 500mg"; the manifest says "…500mg caps".
    const cartons = buildGoodsIn("case-a", LONG_DATED, NOW, flagged);
    const amox = cartons.find((c) => c.product.startsWith("Amoxicillin"))!;
    expect(amox.flaggedAtStockCount).toBe(true);
    expect(stockCountNote(amox)).toContain("Amoxicillin");
  });

  it("says nothing about a product the count did not dispute", () => {
    const cartons = buildGoodsIn("case-a", LONG_DATED, NOW, flagged);
    const insulin = cartons.find((c) => c.product.startsWith("Insulin"))!;
    expect(insulin.flaggedAtStockCount).toBe(false);
    expect(stockCountNote(insulin)).toBeNull();
  });

  it("does not pair two different medicines", () => {
    const cartons = buildGoodsIn("case-a", LONG_DATED, NOW, [
      { item: "Morphine 5mg/mL", investigate: true },
    ]);
    expect(cartons.some((c) => c.flaggedAtStockCount)).toBe(false);
  });

  // The prompt is to count, not a hint at the answer: a flagged line gets
  // recounted in a real store and often comes out fine.
  it("does not give away which way the count will come out", () => {
    const cartons = buildGoodsIn("case-a", LONG_DATED, NOW, flagged);
    for (const carton of cartons) {
      const note = stockCountNote(carton);
      if (note) expect(note).not.toMatch(/short|mismatch|does not match the challan/i);
    }
  });

  it("works for a case with no stock count at all", () => {
    expect(buildGoodsIn("case-a", LONG_DATED, NOW).every((c) => !c.flaggedAtStockCount)).toBe(true);
  });
});

describe("where the calls sit on the form", () => {
  it("offers all five, once each, however they are ordered", () => {
    const carton = buildGoodsIn("case-a", LONG_DATED, NOW)[0];
    const shown = decisionOptionsFor(carton).map((o) => o.value);
    expect(new Set(shown).size).toBe(5);
    expect(shown).toContain(ACCEPT_OPTION);
  });

  it("shows the same form when a carton is reopened", () => {
    const carton = buildGoodsIn("case-a", LONG_DATED, NOW)[0];
    expect(decisionOptionsFor(carton)).toEqual(decisionOptionsFor(carton));
  });

  // The bug: accept was written first and stayed first, so a sound
  // consignment could be cleared by pressing the top button without reading
  // the three-way match at all.
  it("does not put accept at the top of every carton", () => {
    const positions = new Set<number>();
    for (const spread of Object.values(REAL_SPREADS)) {
      for (const seed of ["a", "b", "c", "d", "e"]) {
        for (const carton of buildGoodsIn(seed, atMonths(spread), NOW)) {
          positions.add(decisionOptionsFor(carton).findIndex((o) => o.value === ACCEPT_OPTION));
        }
      }
    }
    expect(positions.size).toBeGreaterThan(2);
    expect(positions.has(0)).toBe(true);
  });
});
