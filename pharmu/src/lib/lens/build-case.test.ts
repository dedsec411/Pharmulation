import { describe, expect, it } from "vitest";
import {
  buildLensCase, resolveDrug, resolveReading, MIN_CONFIDENCE, UNCERTAIN_CONFIDENCE,
  type CatalogueDrug, type LensExtraction,
} from "./build-case";
import { LABEL_FREQUENCIES, LABEL_TIMINGS, durationDays, ONGOING } from "@/lib/game/dosing";

const CATALOGUE: CatalogueDrug[] = [
  { id: "1", name: "Amoxicillin", generic_name: "Amoxicillin", category: "Antibiotic", drug_class: "Penicillin", dosage: "500mg PO TDS x 7d" },
  { id: "2", name: "Paracetamol", generic_name: "Paracetamol", category: "Analgesic", drug_class: "Anilides", dosage: "1g PO QDS" },
  { id: "3", name: "Ibuprofen", generic_name: "Ibuprofen", category: "Analgesic", drug_class: "NSAID", dosage: "400mg PO TDS" },
  { id: "4", name: "Naproxen", generic_name: "Naproxen", category: "Analgesic", drug_class: "NSAID", dosage: "250mg PO BD" },
  { id: "5", name: "Ramipril", generic_name: "Ramipril", category: "Cardiovascular", drug_class: "ACE inhibitor", dosage: "5mg PO OD" },
];

function extraction(over: Partial<LensExtraction> = {}): LensExtraction {
  return {
    isMedical: true,
    documentType: "handwritten prescription",
    confidence: 0.9,
    patient: { name: "Jane Doe", age: 41, sex: "female", allergies: [] },
    diagnosis: "Chest infection",
    drugs: [{ name: "Amoxicillin", dose: "500mg", frequency: "TDS", duration: "7 days" }],
    decisionPoints: ["Check penicillin allergy before dispensing."],
    suggestedMode: "rx",
    ...over,
  };
}

describe("resolveDrug", () => {
  it("matches a plain name", () => {
    expect(resolveDrug("Amoxicillin", CATALOGUE)?.name).toBe("Amoxicillin");
  });

  // The catalogue's own key strips strengths and dose forms, so a written
  // strength must not prevent a match.
  it("matches through a strength and a dose form", () => {
    expect(resolveDrug("Amoxicillin 500mg capsule", CATALOGUE)?.name).toBe("Amoxicillin");
  });

  it("matches a salt or hydrate form to the base medicine", () => {
    expect(resolveDrug("Amoxicillin trihydrate", CATALOGUE)?.name).toBe("Amoxicillin");
  });

  // Substring matching alone reads "Desloratadine" as "Loratadine" and hands
  // over a different medicine. The catalogue name has to start a word.
  it("does not read a longer medicine as the shorter one inside it", () => {
    const shelf: CatalogueDrug[] = [{ id: "9", name: "Loratadine", category: "Antihistamine" }];
    expect(resolveDrug("Desloratadine", shelf)).toBeNull();
    expect(resolveDrug("Levocetirizine", [
      { id: "8", name: "Cetirizine", category: "Antihistamine" },
    ])).toBeNull();
  });

  it("still matches a catalogue name that starts a word in what was written", () => {
    expect(resolveDrug("T. Aspirin 75mg", [
      { id: "7", name: "Aspirin", category: "Analgesic" },
    ])?.name).toBe("Aspirin");
  });

  // A near-miss dispenses the wrong medicine. No match is the safer failure.
  it("returns null rather than guessing at an unknown medicine", () => {
    expect(resolveDrug("Zzyzxamab", CATALOGUE)).toBeNull();
    expect(resolveDrug("", CATALOGUE)).toBeNull();
  });
});

describe("resolveReading - handwriting", () => {
  // The whole point of the feature is documents that are hard to read, so a
  // spelling that is one slip away from a real medicine has to land.
  it("accepts a near-miss spelling of a stocked medicine", () => {
    expect(resolveReading(["Amoxycillin"], CATALOGUE)?.drug.name).toBe("Amoxicillin");
    expect(resolveReading(["Amoxycillin"], CATALOGUE)?.assumed).toBe(true);
  });

  it("falls through to a later candidate when the first reading is unknown", () => {
    const hit = resolveReading(["Anoxydllin", "Amoxicillin"], CATALOGUE);
    expect(hit?.drug.name).toBe("Amoxicillin");
    // An outright match on a candidate is not an assumption.
    expect(hit?.assumed).toBe(false);
  });

  it("prefers an exact match on any reading over a near-miss on the first", () => {
    expect(resolveReading(["Ramiprill", "Naproxen"], CATALOGUE)?.assumed).toBe(false);
  });

  // The guard that keeps this feature safe: near is not the same as close
  // enough, and two medicines equally near a scrawl is not a decision to make.
  it("refuses a word that is near two different medicines", () => {
    const ambiguous: CatalogueDrug[] = [
      ...CATALOGUE,
      { id: "6", name: "Ramipril", generic_name: "Ramipril", category: "Cardiovascular" },
      { id: "7", name: "Ranipril", generic_name: "Ranipril", category: "Cardiovascular" },
    ];
    expect(resolveReading(["Ramiprol"], ambiguous)).toBeNull();
  });

  it("never crosses to a different medicine that merely looks similar", () => {
    expect(resolveReading(["Naproxenib"], [
      { id: "1", name: "Naproxen", category: "Analgesic" },
      { id: "2", name: "Naratriptan", category: "Analgesic" },
    ])?.drug.name).toBe("Naproxen");
    // Different opening letters, so not a spelling of the same word.
    expect(resolveReading(["Xaproxen"], CATALOGUE)).toBeNull();
  });

  // Scripts abbreviate. A truncation that can only be one medicine should
  // land; a scrawl that matches nothing should not be guessed at.
  it("resolves an abbreviated name, with or without a bare strength", () => {
    expect(resolveReading(["Amox"], CATALOGUE)?.drug.name).toBe("Amoxicillin");
    expect(resolveReading(["Amox 500"], CATALOGUE)?.drug.name).toBe("Amoxicillin");
    expect(resolveReading(["Ramipril 5"], CATALOGUE)?.drug.name).toBe("Ramipril");
  });

  it("will not guess at a short scrawl that matches nothing", () => {
    expect(resolveReading(["Rmpl"], CATALOGUE)).toBeNull();
    expect(resolveReading([""], CATALOGUE)).toBeNull();
  });
});

describe("buildLensCase", () => {
  it("refuses a document that is not medical", () => {
    const r = buildLensCase(extraction({ isMedical: false }), CATALOGUE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not-medical");
  });

  it("refuses a reading it is not confident in", () => {
    const r = buildLensCase(extraction({ confidence: MIN_CONFIDENCE - 0.01 }), CATALOGUE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("low-confidence");
  });

  // The bug this replaced: a real doctor's script reads back at ~0.45, and the
  // old single bar at 0.55 threw away a case that was perfectly playable.
  it("builds a case from a messy but legible read, and flags it", () => {
    const r = buildLensCase(extraction({ confidence: UNCERTAIN_CONFIDENCE - 0.1 }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary.uncertain).toBe(true);
      expect(r.summary.resolved[0].matchedTo).toBe("Amoxicillin");
    }
  });

  it("marks a case built on an assumed spelling as needing a check", () => {
    const r = buildLensCase(
      extraction({ drugs: [{ name: "Amoxycillin", dose: "500mg", frequency: "TDS" }] }),
      CATALOGUE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary.uncertain).toBe(true);
      expect(r.summary.assumed[0]).toContain("Amoxicillin");
    }
  });

  it("leaves a clean read unflagged", () => {
    const r = buildLensCase(extraction(), CATALOGUE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.summary.uncertain).toBe(false);
      expect(r.summary.assumed).toEqual([]);
    }
  });

  it("uses a candidate reading when the primary one is not stocked", () => {
    const r = buildLensCase(extraction({
      drugs: [{ name: "Augmentin", candidates: ["Amoxicillin"], dose: "625mg", frequency: "BD" }],
    }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary.resolved[0].matchedTo).toBe("Amoxicillin");
  });

  // The whole reason this file exists: a case naming a medicine that is not on
  // the shelf can never be completed, so it must never be built.
  it("refuses when nothing read is in the catalogue", () => {
    const r = buildLensCase(extraction({ drugs: [{ name: "Zzyzxamab" }] }), CATALOGUE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no-known-drugs");
  });

  it("drops an unstocked medicine but still builds from the ones it knows", () => {
    const r = buildLensCase(
      extraction({ drugs: [{ name: "Amoxicillin" }, { name: "Zzyzxamab" }] }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.case.drugs_required).toEqual(["Amoxicillin"]);
    expect(r.summary.dropped).toEqual(["Zzyzxamab"]);
  });

  it("never carries the patient's real name into the case or the summary", () => {
    const r = buildLensCase(extraction(), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const serialised = JSON.stringify(r);
    expect(serialised).not.toContain("Jane Doe");
    expect(r.summary.patientName).not.toBe("Jane Doe");
    expect(r.summary.patientName.length).toBeGreaterThan(0);
  });

  it("gives the same scan the same fictional patient twice running", () => {
    const a = buildLensCase(extraction(), CATALOGUE, "seed-1");
    const b = buildLensCase(extraction(), CATALOGUE, "seed-1");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.summary.patientName).toBe(b.summary.patientName);
  });

  // Every label value has to be one the label step actually offers, or the
  // step cannot be completed and the case is unwinnable.
  it("only ever writes label answers the label step can offer", () => {
    const r = buildLensCase(extraction({
      drugs: [{ name: "Amoxicillin", frequency: "1-1-1", duration: "5 days", instruction: "after food" }],
    }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const labels = (r.case.correct_answer_json as any).labels;
    for (const label of Object.values<any>(labels)) {
      expect(LABEL_FREQUENCIES).toContain(label.frequency);
      expect(LABEL_TIMINGS).toContain(label.timing);
      // Either a day count the slider reaches, or explicitly ongoing.
      const days = durationDays(label.duration);
      expect(label.duration === ONGOING || (days !== null && days >= 1 && days <= 30)).toBe(true);
    }
  });

  it("labels every required drug, so no step is left without an answer", () => {
    const r = buildLensCase(extraction({
      drugs: [{ name: "Amoxicillin" }, { name: "Paracetamol" }],
    }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const required = r.case.drugs_required as string[];
    const labels = (r.case.correct_answer_json as any).labels;
    for (const name of required) expect(labels[name]).toBeTruthy();
  });

  it("builds a clinical case with a route and frequency the order form accepts", () => {
    const r = buildLensCase(extraction({
      suggestedMode: "hospital",
      drugs: [{ name: "Amoxicillin", dose: "500 mg", route: "intravenous", frequency: "TDS" }],
    }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const order = (r.case.correct_answer_json as any).drugs[0];
    expect(order.drug).toBe("Amoxicillin");
    expect(["oral", "IV", "IM", "SC"]).toContain(order.route);
    expect(LABEL_FREQUENCIES).toContain(order.frequency);
    // The order form compares the typed dose by substring, so it must be bare.
    expect(order.dose).toBe("500");
  });

  it("offers distractors from the same category rather than at random", () => {
    const r = buildLensCase(extraction({ drugs: [{ name: "Ibuprofen" }] }), CATALOGUE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const distractors = r.case.lens_distractors as string[];
    expect(distractors.length).toBeGreaterThan(0);
    expect(distractors).not.toContain("Ibuprofen");
  });

  it("scales difficulty with how much there is to read and catch", () => {
    const easy = buildLensCase(extraction({ drugs: [{ name: "Amoxicillin" }], decisionPoints: [] }), CATALOGUE);
    const hard = buildLensCase(extraction({
      drugs: [{ name: "Amoxicillin" }, { name: "Paracetamol" }, { name: "Ramipril" }],
      decisionPoints: ["a", "b", "c"],
    }), CATALOGUE);
    expect(easy.ok && hard.ok).toBe(true);
    if (!easy.ok || !hard.ok) return;
    expect(easy.summary.difficulty).toBe("easy");
    expect(hard.summary.difficulty).toBe("hard");
  });
});
