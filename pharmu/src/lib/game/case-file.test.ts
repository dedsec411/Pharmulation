import { describe, expect, it } from "vitest";
import { buildCaseFile, interpretLab } from "./case-file";

const base = {
  seed: "case-1",
  title: "Post-op DVT prophylaxis review",
  patient: { name: "Bed 12", age: 67, diagnosis: "Day 2 post hip replacement", allergies: "none" },
  currentMeds: ["Enoxaparin 40mg SC daily", "Paracetamol 1g QID"],
  labs: { K: 4.1, Hb: 11.2, eGFR: 55 } as Record<string, string | number>,
  physicianOrder: "Add lisinopril 10mg PO daily",
};

describe("interpretLab", () => {
  it("flags a value under its reference range", () => {
    const hb = interpretLab("Hb", 11.2);
    expect(hb.name).toBe("Haemoglobin");
    expect(hb.flag).toBe("low");
    expect(hb.range).toContain("12");
  });

  it("flags a value over its reference range", () => {
    expect(interpretLab("WBC", 18.5).flag).toBe("high");
    expect(interpretLab("lactate", 3.1).flag).toBe("high");
  });

  it("leaves an in-range value unflagged", () => {
    expect(interpretLab("K", 4.1).flag).toBe("normal");
  });

  // eGFR has no meaningful upper bound, so only a low value is a finding -
  // without the special case, a healthy 110 would be reported as abnormal.
  it("treats a high eGFR as normal and a low one as a finding", () => {
    expect(interpretLab("eGFR", 55).flag).toBe("low");
    expect(interpretLab("eGFR", 110).flag).toBe("normal");
  });

  it("reads the number out of a value that carries its own unit", () => {
    const crp = interpretLab("CRP", "68 mg/L");
    expect(crp.flag).toBe("high");
    expect(crp.value).toBe("68 mg/L");
  });

  it("handles a numeric value given as a string", () => {
    expect(interpretLab("WBC", "14").flag).toBe("high");
  });

  it("says so rather than guessing when the lab is unrecognised", () => {
    const unknown = interpretLab("Widget level", 42);
    expect(unknown.flag).toBe("unknown");
    expect(unknown.range).toBeUndefined();
  });

  it("matches lab names however the case wrote them", () => {
    for (const alias of ["Cr", "creatinine", "S. Creatinine"]) {
      expect(interpretLab(alias, 142).name, alias).toBe("Creatinine");
    }
  });
});

describe("buildCaseFile", () => {
  it("reads as a handover, in order", () => {
    const keys = buildCaseFile(base).slides.map((s) => s.key);
    expect(keys).toEqual(["admission", "history", "observations", "labs", "medications", "order"]);
  });

  it("gives the same file for the same case every time", () => {
    expect(buildCaseFile(base)).toEqual(buildCaseFile(base));
  });

  it("counts the abnormal results on the labs slide", () => {
    // Hb 11.2 low and eGFR 55 low; K 4.1 is in range.
    const labs = buildCaseFile(base).slides.find((s) => s.key === "labs")!;
    expect(labs.caption).toContain("2 values");
  });

  it("says so plainly when every result is in range", () => {
    const file = buildCaseFile({ ...base, labs: { K: 4.1, Na: 139 } });
    expect(file.slides.find((s) => s.key === "labs")!.caption).toContain("within range");
  });

  // A documented allergy is the single thing most likely to make an order
  // unsafe, so it must not read like any other row.
  it("marks a documented allergy for attention", () => {
    const file = buildCaseFile({ ...base, patient: { ...base.patient, allergies: "penicillin" } });
    const row = file.slides.find((s) => s.key === "history")!.rows!.find((r) => r.label === "Allergies")!;
    expect(row.emphasis).toBe("alert");
    expect(row.value).toContain("penicillin");
  });

  it("states no known allergy rather than leaving it blank", () => {
    const row = buildCaseFile(base).slides.find((s) => s.key === "history")!.rows!.find((r) => r.label === "Allergies")!;
    expect(row.emphasis).not.toBe("alert");
    expect(row.value).toMatch(/no known/i);
  });

  it("keeps a bed number given as the patient name", () => {
    const file = buildCaseFile(base);
    expect(file.bed).toBe("Bed 12");
  });

  it("shows the medicines the patient is already on", () => {
    const meds = buildCaseFile(base).slides.find((s) => s.key === "medications")!;
    expect(meds.bullets).toEqual(expect.arrayContaining(base.currentMeds));
  });

  it("never leaves a slide with nothing on it", () => {
    for (const slide of buildCaseFile(base).slides) {
      const filled = (slide.rows?.length ?? 0) + (slide.bullets?.length ?? 0)
        + (slide.labs?.length ?? 0) + (slide.body ? 1 : 0);
      expect(filled, `${slide.key} is empty`).toBeGreaterThan(0);
    }
  });
});
