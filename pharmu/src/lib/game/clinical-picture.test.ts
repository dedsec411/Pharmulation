import { describe, expect, it } from "vitest";
import { buildClinicalPicture, type ClinicalPicture } from "./clinical-picture";

const build = (over: Partial<Parameters<typeof buildClinicalPicture>[0]> = {}) =>
  buildClinicalPicture({ seed: "case-1", title: "Sana Yousaf - bacterial infection", age: 30, gender: "female", allergies: "penicillin", ...over });

const systolic = (p: ClinicalPicture) => Number(p.vitals.bp.split("/")[0]);
const diastolic = (p: ClinicalPicture) => Number(p.vitals.bp.split("/")[1]);

describe("buildClinicalPicture", () => {
  it("gives the same patient for the same case every time", () => {
    // A re-render must not change the patient's observations underneath the
    // learner while they are reasoning about them.
    expect(build()).toEqual(build());
  });

  it("gives different patients for different cases", () => {
    const a = build({ seed: "case-a" });
    const b = build({ seed: "case-b" });
    expect([a.vitals.bp, a.contact, a.mrNo]).not.toEqual([b.vitals.bp, b.contact, b.mrNo]);
  });

  it("fills every field on the form", () => {
    const p = build();
    for (const [key, value] of Object.entries(p)) {
      if (key === "smoker" || key === "vitals") continue;
      expect(String(value).trim(), `${key} is blank`).not.toBe("");
    }
    for (const [key, value] of Object.entries(p.vitals)) {
      expect(String(value).trim(), `vitals.${key} is blank`).not.toBe("");
    }
  });

  it("keeps weight, height and BMI consistent with each other", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const p = build({ seed });
      const expected = Number(p.bmi) * (Number(p.heightCm) / 100) ** 2;
      expect(Number(p.weightKg)).toBeCloseTo(expected, 0);
    }
  });
});

describe("condition-appropriate vitals", () => {
  it("gives an infection a fever and the tachycardia that goes with it", () => {
    for (const seed of ["i1", "i2", "i3", "i4"]) {
      const p = build({ seed, title: "Imran Shah - bacterial infection" });
      expect(Number(p.vitals.temp)).toBeGreaterThan(100);
      expect(Number(p.vitals.pulse)).toBeGreaterThan(90);
    }
  });

  it("gives a blood pressure review a raised blood pressure", () => {
    for (const seed of ["h1", "h2", "h3", "h4"]) {
      const p = build({ seed, title: "Robert Ellis - blood pressure review", age: 62 });
      expect(systolic(p)).toBeGreaterThanOrEqual(140);
      expect(diastolic(p)).toBeGreaterThanOrEqual(88);
    }
  });

  it("gives a diabetes case a raised random blood sugar", () => {
    for (const seed of ["d1", "d2", "d3", "d4"]) {
      const p = build({ seed, title: "Fatima Noor - type 2 diabetes" });
      expect(Number(p.vitals.rbs)).toBeGreaterThan(170);
    }
  });

  it("leaves an uncomplicated case physiologically well", () => {
    for (const seed of ["r1", "r2", "r3", "r4"]) {
      const p = build({ seed, title: "Daniel Osei - allergic rhinitis", age: 30 });
      expect(Number(p.vitals.temp)).toBeLessThan(99.5);
      expect(systolic(p)).toBeLessThan(140);
      expect(Number(p.vitals.spo2)).toBeGreaterThanOrEqual(97);
    }
  });

  it("does not print a reduced consciousness level on a pharmacy case", () => {
    for (const seed of ["g1", "g2", "g3"]) {
      expect(build({ seed }).vitals.gcs).toBe("15");
    }
  });

  it("keeps every observation inside a survivable range", () => {
    const titles = ["bacterial infection", "asthma review", "blood pressure review", "type 2 diabetes", "pain relief", "reflux and dyspepsia", "allergic rhinitis"];
    for (const title of titles) {
      for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
        const p = build({ seed, title, age: 55 });
        expect(systolic(p)).toBeGreaterThan(90);
        expect(systolic(p)).toBeLessThan(200);
        expect(diastolic(p)).toBeLessThan(systolic(p));
        expect(Number(p.vitals.pulse)).toBeGreaterThan(50);
        expect(Number(p.vitals.pulse)).toBeLessThan(130);
        expect(Number(p.vitals.spo2)).toBeGreaterThanOrEqual(90);
        expect(Number(p.vitals.spo2)).toBeLessThanOrEqual(100);
        expect(Number(p.vitals.temp)).toBeGreaterThan(96);
        expect(Number(p.vitals.temp)).toBeLessThan(105);
      }
    }
  });
});

describe("narrative", () => {
  it("does not repeat the complaint as the diagnosis", () => {
    // The slip used to print the case title in both boxes, so the presenting
    // complaint and the provisional diagnosis read identically.
    const p = build();
    expect(p.diagnosis).not.toBe(p.complaint);
    expect(p.complaint.length).toBeGreaterThan(p.diagnosis.length);
  });

  it("records a documented allergy in the examination", () => {
    expect(build({ allergies: "penicillin" }).examination).toContain("penicillin");
  });

  it("says so explicitly when there is no known allergy", () => {
    expect(build({ allergies: "none" }).examination).toContain("NKDA");
  });

  it("never leaks a template placeholder into the narrative", () => {
    const p = build({ title: "{{patient}} - bacterial infection" });
    for (const text of [p.complaint, p.examination, p.diagnosis, p.advice, p.referTo]) {
      expect(text).not.toMatch(/[{}]/);
    }
  });
});

describe("internal coherence", () => {
  // Complaint, examination, diagnosis and investigations were drawn from four
  // parallel lists, so a chest infection could be examined as a throat, called
  // tonsillitis and investigated with a urine dipstick - each plausible alone,
  // nonsense together.
  const SYSTEMS = [
    { name: "chest",  complaint: /cough|sputum|haemoptysis/i, diagnosis: /respiratory|chest/i,     tests: /chest x-ray|crp/i },
    { name: "throat", complaint: /sore throat|swallow/i,      diagnosis: /tonsill/i,               tests: /throat swab/i },
  ];

  it("keeps the whole form describing one presentation", () => {
    for (let i = 0; i < 60; i++) {
      const p = build({ seed: `coherence-${i}`, title: "bacterial infection" });
      const system = SYSTEMS.find((s) => s.complaint.test(p.complaint));
      expect(system, `no system matched complaint: ${p.complaint}`).toBeTruthy();
      expect(p.diagnosis, `complaint is ${system!.name}`).toMatch(system!.diagnosis);
      expect(p.testAdvised, `complaint is ${system!.name}`).toMatch(system!.tests);
    }
  });
});
