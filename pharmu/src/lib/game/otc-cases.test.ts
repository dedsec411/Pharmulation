import { describe, expect, it } from "vitest";
import { OTC_CASES, getOtcCaseById, pickOtcCase } from "./otc-cases";
import { prepareDrugCatalog, RX_DRUG_CATEGORIES } from "@/lib/drug-catalog";

/**
 * These guard the clinical content rather than the code. An authoring slip -
 * a correct answer missing from its own options list, a referral case that
 * offers no referral - would only surface as a case that cannot be completed.
 */
describe("OTC case bank", () => {
  it("has unique ids", () => {
    const ids = OTC_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers enough cases that a session does not repeat", () => {
    expect(OTC_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it("includes referral cases, where the safe answer is not to sell", () => {
    const referrals = OTC_CASES.filter((c) => c.outcome === "refer");
    expect(referrals.length).toBeGreaterThanOrEqual(3);
    // A referral case is only meaningful if it actually presents red flags.
    for (const c of referrals) {
      expect(c.redFlags.length, `${c.id} is a referral with no red flags`).toBeGreaterThan(0);
    }
  });

  it.each(OTC_CASES.map((c) => [c.id, c] as const))("%s is completable", (_id, c) => {
    const r = c.recommendation;

    // Every correct answer must be selectable.
    expect(r.correct.length).toBeGreaterThan(0);
    for (const answer of r.correct) {
      expect(r.options, `correct answer "${answer}" missing from options`).toContain(answer);
    }
    expect(r.doseOptions).toContain(r.dose);
    expect(r.counsellingOptions).toContain(r.counselling);

    // Distractors must exist, or the question answers itself.
    expect(r.options.length).toBeGreaterThanOrEqual(3);
    expect(r.doseOptions.length).toBeGreaterThanOrEqual(3);
    expect(r.counsellingOptions.length).toBeGreaterThanOrEqual(3);

    // No duplicate options, which would make two buttons equally right.
    expect(new Set(r.options).size).toBe(r.options.length);
    expect(new Set(r.doseOptions).size).toBe(r.doseOptions.length);
    expect(new Set(r.counsellingOptions).size).toBe(r.counsellingOptions.length);
  });

  it.each(OTC_CASES.map((c) => [c.id, c] as const))("%s has a full hidden history", (_id, c) => {
    // The grader marks WWHAM coverage, so every item must be answerable.
    for (const key of ["who", "what", "howLong", "action", "medication", "allergies", "conditions"] as const) {
      expect(String(c.hidden[key] ?? "").trim(), `${key} is empty`).not.toBe("");
    }
    expect(c.patient.opening.trim()).not.toBe("");
    expect(c.patient.age).toBeGreaterThan(0);
    expect(c.mentorTip.trim()).not.toBe("");
    expect(c.explanation.trim()).not.toBe("");
  });

  it("never leaks the answer in the patient's opening line", () => {
    for (const c of OTC_CASES) {
      const opening = c.patient.opening.toLowerCase();
      for (const answer of c.recommendation.correct) {
        // A patient naming the product would hand over the recommendation.
        const product = answer.toLowerCase().split(/[\s(]/)[0];
        if (product.length > 4 && !answer.toLowerCase().startsWith("refer")) {
          expect(opening, `${c.id} opening names the answer`).not.toContain(product);
        }
      }
    }
  });
});

describe("case selection", () => {
  it("finds a case by id, and nothing for an unknown one", () => {
    expect(getOtcCaseById(OTC_CASES[0].id)?.id).toBe(OTC_CASES[0].id);
    expect(getOtcCaseById("does-not-exist")).toBeNull();
  });

  it("prefers cases the player has not seen", () => {
    const seen = OTC_CASES.slice(0, OTC_CASES.length - 1).map((c) => c.id);
    expect(pickOtcCase(seen).id).toBe(OTC_CASES[OTC_CASES.length - 1].id);
  });

  it("still returns a case once everything has been seen", () => {
    const all = OTC_CASES.map((c) => c.id);
    expect(pickOtcCase(all)).toBeTruthy();
  });
});

describe("dispensing", () => {
  // The consultation ends by picking the medicine off the shelf, so every
  // treatable case must name a medicine that is actually stocked. Without this
  // guard, a case whose answer is worded differently from the catalogue entry
  // ("Oral rehydration salts" vs the stocked "ORS") is simply unwinnable.
  const shelf = new Set(
    (prepareDrugCatalog([]) as Array<{ name: string; category?: string | null }>)
      .filter((d) => RX_DRUG_CATEGORIES.includes(String(d.category)))
      .map((d) => d.name.toLowerCase()),
  );

  it.each(OTC_CASES.filter((c) => c.outcome === "treat").map((c) => [c.id, c] as const))(
    "%s can be dispensed from the shelf",
    (_id, c) => {
      const names = c.recommendation.dispenseNames ?? [];
      expect(names.length, "treatable case needs dispenseNames").toBeGreaterThan(0);
      for (const name of names) {
        expect(shelf.has(name.toLowerCase()), `"${name}" is not on any shelf`).toBe(true);
      }
    },
  );

  it("referral cases offer nothing to dispense", () => {
    for (const c of OTC_CASES.filter((x) => x.outcome === "refer")) {
      expect(c.recommendation.dispenseNames ?? []).toHaveLength(0);
    }
  });
});

describe("clinical completeness", () => {
  // Every medicine an OTC case can dispense must carry real clinical detail.
  // Four of these previously existed only as generated catalogue entries and
  // so shared the same invented side effects, which is worse than useless in
  // a training product.
  const REQUIRED_IN_DB = [
    "Paracetamol", "Loratadine", "Cetirizine", "Fexofenadine", "ORS",
    "Senna", "Bisacodyl", "Clotrimazole cream",
    "Aluminium Hydroxide", "Magnesium Hydroxide", "Calcium Carbonate",
  ];

  it("covers every medicine the case bank can dispense", () => {
    const referenced = new Set(
      OTC_CASES.flatMap((c) => c.recommendation.dispenseNames ?? []),
    );
    for (const name of referenced) {
      expect(REQUIRED_IN_DB, `${name} is dispensable but not on the verified list`)
        .toContain(name);
    }
  });
});
