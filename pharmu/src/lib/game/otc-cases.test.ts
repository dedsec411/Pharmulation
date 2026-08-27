import { describe, expect, it } from "vitest";
import { OTC_CASES, getOtcCaseById, pickOtcCase } from "./otc-cases";

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
