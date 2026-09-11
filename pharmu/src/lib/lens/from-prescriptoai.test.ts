import { describe, expect, it } from "vitest";
import { fromPrescriptoAI, completenessChecks, type PrescriptoResponse } from "./from-prescriptoai";

/**
 * The payload below is a real response from the live API, captured against a
 * printed prescription. It is here verbatim because the provider's published
 * documentation describes a different shape entirely - a flat object with
 * `medicines`, `doctor` and `confidence` - and the mapper is written against
 * what the endpoint actually returns, not what the website says it does.
 */
const REAL: PrescriptoResponse = {
  success: true,
  type: "standard",
  data: {
    patient: { name: "Ayesha Khan", age: 34, gender: "Female" },
    doctor: { name: "Dr. Imran Shah" },
    prescription: {
      date: "2026-09-11",
      diagnosis: "Chest infection",
      medications: [
        { name: "Amoxicillin 500mg", genericName: "Amoxicillin", dosage: "500mg", frequency: "1 TDS", duration: "7 days", instructions: "", notes: "" },
        { name: "Paracetamol 500mg", genericName: "Paracetamol", dosage: "500mg", frequency: "1-1-1", duration: "5 days", instructions: "", notes: "" },
        { name: "Salbutamol 2mg/5ml", genericName: "Salbutamol", dosage: "2mg/5ml", frequency: "5ml BD", duration: "5 days", instructions: "", notes: "" },
      ],
    },
  },
};

describe("reading a real response", () => {
  it("carries every medicine across with what was written beside it", () => {
    const out = fromPrescriptoAI(REAL);
    expect(out.drugs).toHaveLength(3);
    expect(out.drugs[0]).toMatchObject({
      name: "Amoxicillin 500mg", dose: "500mg", frequency: "1 TDS", duration: "7 days",
    });
    expect(out.drugs[2].name).toBe("Salbutamol 2mg/5ml");
  });

  it("keeps the prescriber's own shorthand rather than translating it", () => {
    const out = fromPrescriptoAI(REAL);
    expect(out.drugs.map((d) => d.frequency)).toEqual(["1 TDS", "1-1-1", "5ml BD"]);
  });

  it("takes the diagnosis, age and sex off the page", () => {
    const out = fromPrescriptoAI(REAL);
    expect(out.diagnosis).toBe("Chest infection");
    expect(out.patient.age).toBe(34);
    expect(out.patient.sex).toBe("Female");
    expect(out.isMedical).toBe(true);
  });

  // The name should stop existing at the first point it can, rather than be
  // carried through the system on the promise that something later drops it.
  it("drops the patient's real name at the boundary", () => {
    const out = fromPrescriptoAI(REAL);
    expect(out.patient.name).toBeNull();
    expect(JSON.stringify(out)).not.toContain("Ayesha");
  });

  // The generic is a second way for the catalogue matcher to find the same
  // medicine, not a suggestion that the reading might be something else.
  it("offers the generic name as a way in when it differs from what was written", () => {
    const out = fromPrescriptoAI(REAL);
    expect(out.drugs[0].candidates).toEqual(["Amoxicillin"]);
  });

  it("offers nothing when the generic is what was written", () => {
    const out = fromPrescriptoAI({
      success: true, type: "standard",
      data: { prescription: { medications: [{ name: "Metformin", genericName: "metformin", dosage: "500mg", frequency: "BD", duration: "28 days" }] } },
    });
    expect(out.drugs[0].candidates).toEqual([]);
  });

  // A route invented here would be a clinical instruction nobody wrote.
  it("invents no route", () => {
    expect(fromPrescriptoAI(REAL).drugs.every((d) => d.route === null)).toBe(true);
  });
});

describe("a document it could not read", () => {
  it("reports a null payload as not a prescription", () => {
    const out = fromPrescriptoAI({ success: true, data: null, type: "standard" });
    expect(out.isMedical).toBe(false);
    expect(out.drugs).toEqual([]);
  });

  it("reports a prescription with nothing on it as read but empty", () => {
    const out = fromPrescriptoAI({ success: true, type: "standard", data: { prescription: { medications: [] } } });
    expect(out.isMedical).toBe(true);
    expect(out.confidence).toBe(1);
    expect(out.drugs).toEqual([]);
  });

  it("survives a response with nothing in it at all", () => {
    const out = fromPrescriptoAI({} as PrescriptoResponse);
    expect(out.isMedical).toBe(false);
    expect(out.drugs).toEqual([]);
    expect(out.patient.age).toBeNull();
  });

  it("ignores a medicine with no name", () => {
    const out = fromPrescriptoAI({
      success: true, type: "standard",
      data: { prescription: { medications: [{ dosage: "500mg" }, { name: "Ibuprofen" }] } },
    });
    expect(out.drugs).toHaveLength(1);
    expect(out.drugs[0].name).toBe("Ibuprofen");
  });

  it("treats an age that is not a number as no age", () => {
    const out = fromPrescriptoAI({
      success: true, type: "standard",
      data: { patient: { age: "thirty-ish" }, prescription: { medications: [] } },
    });
    expect(out.patient.age).toBeNull();
  });
});

describe("the checks a case is given", () => {
  const drug = (over: Partial<LensDrug> = {}): LensDrug => ({
    name: "Amoxicillin", candidates: [], dose: "500mg", route: null,
    frequency: "TDS", duration: "7 days", instruction: null, ...over,
  });
  type LensDrug = ReturnType<typeof fromPrescriptoAI>["drugs"][number];

  // Querying a prescription with no duration is reading what is missing, not
  // making a clinical judgement.
  it("names a medicine with no duration", () => {
    const checks = completenessChecks([drug({ duration: null })], 40);
    expect(checks.some((c) => c.includes("No duration") && c.includes("Amoxicillin"))).toBe(true);
  });

  it("names a medicine with no strength", () => {
    const checks = completenessChecks([drug({ dose: null })], 40);
    expect(checks.some((c) => c.includes("No strength"))).toBe(true);
  });

  it("names a medicine with no frequency", () => {
    const checks = completenessChecks([drug({ frequency: null })], 40);
    expect(checks.some((c) => c.includes("No frequency"))).toBe(true);
  });

  it("spots the same medicine written twice", () => {
    const checks = completenessChecks([drug(), drug()], 40);
    expect(checks.some((c) => c.includes("more than once"))).toBe(true);
  });

  it("asks for an age when none was recorded", () => {
    expect(completenessChecks([drug()], null).some((c) => c.includes("No age"))).toBe(true);
  });

  // A complete prescription still needs checking. Saying nothing at all would
  // read as "this one is fine".
  it("still gives a complete prescription something to check", () => {
    const checks = completenessChecks([drug()], 40);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toContain("history and allergies");
  });

  it("says nothing about a document with no medicines on it", () => {
    expect(completenessChecks([], null)).toEqual([]);
  });

  // More than four is a checklist, not a case.
  it("stops at four", () => {
    const checks = completenessChecks(
      [drug({ dose: null, frequency: null, duration: null, name: "A" }),
       drug({ dose: null, frequency: null, duration: null, name: "B" })], null);
    expect(checks).toHaveLength(4);
  });

  // Inventing an interaction would put a fabricated clinical finding in front
  // of a trainee, which is worse than offering none.
  it("invents no clinical finding", () => {
    const checks = completenessChecks(
      [drug({ name: "Warfarin" }), drug({ name: "Aspirin" })], 70).join(" ");
    expect(checks).not.toMatch(/interact|contraindicat|bleed/i);
  });
});
