/**
 * The clinical case file, as a deck of slides.
 *
 * It used to be four cramped tabs in a sidebar - vitals, meds, labs, order -
 * holding a handful of bare values. A hospital case is read as a handover: who
 * the patient is, what they came in with, what their observations and bloods
 * show, what they are already taking, and what is being asked of you. Each of
 * those is a slide, in that order, because that is the order the reasoning
 * happens in.
 *
 * Lab values carry their reference range and a high/low flag. That is the part
 * that turns a number into a decision: eGFR 55 means nothing until you can see
 * it sits under 90, and spotting it is the whole skill the case is testing.
 */

import { intBetween, makeRng, pick } from "./seeded-random";

export type LabFlag = "low" | "high" | "normal" | "unknown";

export type LabReading = {
  name: string;
  value: string;
  unit?: string;
  range?: string;
  flag: LabFlag;
};

export type Slide = {
  key: string;
  title: string;
  /** Line under the title, giving the slide its context. */
  caption: string;
  rows?: { label: string; value: string; emphasis?: "alert" | "normal" }[];
  bullets?: string[];
  labs?: LabReading[];
  body?: string;
};

export type CaseFile = {
  mrn: string;
  ward: string;
  bed: string;
  admitted: string;
  slides: Slide[];
};

/* ------------------------------------------------------------------ *
 * Laboratory reference ranges
 * ------------------------------------------------------------------ */

type Reference = { unit: string; low: number; high: number; aliases: string[] };

// Adult reference ranges. Where a range is sex-specific the wider bound is
// used, since the case data does not reliably record sex.
const REFERENCES: Record<string, Reference> = {
  "Haemoglobin":     { unit: "g/dL",       low: 12.0, high: 17.0, aliases: ["hb", "haemoglobin", "hemoglobin"] },
  "White cells":     { unit: "x10^9/L",    low: 4.0,  high: 11.0, aliases: ["wbc", "white cells", "wcc", "leukocytes"] },
  "Platelets":       { unit: "x10^9/L",    low: 150,  high: 400,  aliases: ["plt", "platelets"] },
  "Sodium":          { unit: "mmol/L",     low: 135,  high: 145,  aliases: ["na", "sodium"] },
  "Potassium":       { unit: "mmol/L",     low: 3.5,  high: 5.0,  aliases: ["k", "potassium"] },
  "Urea":            { unit: "mmol/L",     low: 2.5,  high: 7.8,  aliases: ["urea", "bun"] },
  "Creatinine":      { unit: "umol/L",     low: 60,   high: 110,  aliases: ["cr", "creatinine", "s. creatinine", "serum creatinine"] },
  "eGFR":            { unit: "mL/min",     low: 90,   high: 200,  aliases: ["egfr", "gfr"] },
  "CRP":             { unit: "mg/L",       low: 0,    high: 5,    aliases: ["crp", "c-reactive protein"] },
  "Lactate":         { unit: "mmol/L",     low: 0.5,  high: 2.2,  aliases: ["lactate"] },
  "INR":             { unit: "",           low: 0.8,  high: 1.2,  aliases: ["inr"] },
  "Bilirubin":       { unit: "umol/L",     low: 0,    high: 21,   aliases: ["bili", "bilirubin"] },
  "ALT":             { unit: "U/L",        low: 10,   high: 40,   aliases: ["alt", "sgpt"] },
  "Albumin":         { unit: "g/L",        low: 35,   high: 50,   aliases: ["alb", "albumin"] },
  "Glucose":         { unit: "mmol/L",     low: 4.0,  high: 7.8,  aliases: ["glucose", "bm", "rbs"] },
  "Troponin":        { unit: "ng/L",       low: 0,    high: 14,   aliases: ["troponin", "trop"] },
};

function referenceFor(name: string): [string, Reference] | null {
  const key = name.toLowerCase().replace(/[^a-z0-9. ]/g, "").trim();
  for (const [label, ref] of Object.entries(REFERENCES)) {
    if (ref.aliases.includes(key)) return [label, ref];
  }
  return null;
}

/** Leading number in a value like "13.8 x10^9/L" or 4.1. */
function numericPart(value: unknown): number | null {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/**
 * A lab value with its range and whether it sits outside it.
 *
 * eGFR is the exception that has to be special-cased: it has no meaningful
 * upper bound in practice, so a high value is simply normal and only a low one
 * is a finding.
 */
export function interpretLab(name: string, raw: unknown): LabReading {
  const found = referenceFor(name);
  const numeric = numericPart(raw);
  const rawText = String(raw ?? "").trim();

  if (!found || numeric === null) {
    return { name, value: rawText || "-", flag: "unknown" };
  }

  const [label, ref] = found;
  const isEgfr = label === "eGFR";
  const flag: LabFlag =
    numeric < ref.low ? "low"
    : !isEgfr && numeric > ref.high ? "high"
    : "normal";

  // Keep the unit the source supplied if it carried one, so a value already
  // written as "68 mg/L" is not relabelled.
  const hasUnit = /[a-zA-Z/^]/.test(rawText.replace(/^-?\d+(\.\d+)?\s*/, ""));

  return {
    name: label,
    value: hasUnit ? rawText : `${numeric}${ref.unit ? ` ${ref.unit}` : ""}`,
    unit: ref.unit,
    range: isEgfr ? `>${ref.low} ${ref.unit}` : `${ref.low}-${ref.high}${ref.unit ? ` ${ref.unit}` : ""}`,
    flag,
  };
}

/* ------------------------------------------------------------------ *
 * Admission detail
 * ------------------------------------------------------------------ */

const PAST_HISTORY = [
  ["Hypertension, 8 years", "Type 2 diabetes, diet controlled"],
  ["Ischaemic heart disease", "Hypertension, 12 years"],
  ["COPD, ex-smoker", "Osteoarthritis"],
  ["Chronic kidney disease stage 3", "Hypertension"],
  ["No significant past medical history documented"],
] as const;

const SOCIAL = [
  "Lives alone, independent with all activities of daily living.",
  "Lives with spouse. Retired. Independent mobility.",
  "Lives in residential care. Mobilises with a frame.",
  "Lives with family, works full time. Independent.",
] as const;

const WARDS = ["Medical Admissions Unit", "Ward 7 - General Medicine", "Ward 12 - Surgical", "High Dependency Unit"] as const;

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

/** The shape of patient_info_json that this file actually reads. */
export type PatientInfo = {
  name?: string | null;
  age?: number | string | null;
  diagnosis?: string | null;
  condition?: string | null;
  allergies?: string | null;
  vitals?: Record<string, string | number> | null;
};

export type CaseFileInput = {
  /** Stable id, so the same case always yields the same file. */
  seed: string;
  title: string;
  patient: PatientInfo;
  /** Already-resolved chart data from the hospital route. */
  currentMeds: string[];
  labs: Record<string, string | number>;
  physicianOrder: string;
};

export function buildCaseFile({
  seed, title, patient, currentMeds, labs, physicianOrder,
}: CaseFileInput): CaseFile {
  const rng = makeRng(seed || "case");
  const name = String(patient?.name ?? "Unnamed patient");
  const age = patient?.age ?? "-";
  const diagnosis = String(patient?.diagnosis ?? patient?.condition ?? "Assessment pending");
  const allergies = String(patient?.allergies ?? "").trim();
  const hasAllergy = allergies !== "" && allergies.toLowerCase() !== "none";

  // Case data records a bed number as often as a name, so both are shown and
  // neither is assumed.
  const bedFromName = /bed\s*\d+/i.test(name);
  const ward = bedFromName && /icu/i.test(name) ? "Intensive Care Unit" : pick(rng, WARDS);
  const bed = bedFromName ? name : `Bed ${intBetween(rng, 1, 24)}`;
  const admitted = `Day ${intBetween(rng, 1, 4)} of admission`;
  const mrn = `MRN-${intBetween(rng, 100000, 999999)}`;

  const vitals: Record<string, string | number> = patient?.vitals ?? {};
  const vitalRows = [
    { label: "Blood pressure", value: String(vitals.bp ?? vitals.BP ?? "124/78") + " mmHg" },
    { label: "Heart rate", value: `${vitals.hr ?? vitals.HR ?? vitals.heartRate ?? vitals.pulse ?? 82} bpm` },
    { label: "SpO2", value: String(vitals.spo2 ?? vitals.SpO2 ?? vitals.o2 ?? "97%").replace(/%?$/, "%") },
    { label: "Temperature", value: String(vitals.temp ?? vitals.Temp ?? vitals.temperature ?? "36.8") + " C" },
    { label: "Respiratory rate", value: `${vitals.rr ?? vitals.RR ?? 16} /min` },
  ];

  const labReadings = Object.entries(labs ?? {}).map(([k, v]) => interpretLab(k, v));
  const abnormal = labReadings.filter((l) => l.flag === "low" || l.flag === "high");

  const slides: Slide[] = [
    {
      key: "admission",
      title: "Admission",
      caption: "Who the patient is and why they are here.",
      rows: [
        { label: "Patient", value: name },
        { label: "Age", value: String(age) },
        { label: "Ward", value: ward },
        { label: "Bed", value: bed },
        { label: "Record no.", value: mrn },
        { label: "Admitted", value: admitted },
      ],
      body: diagnosis,
    },
    {
      key: "history",
      title: "History",
      caption: "Background that changes what is safe to give.",
      rows: [
        {
          label: "Allergies",
          value: hasAllergy ? `${allergies} - documented` : "No known drug allergies",
          emphasis: hasAllergy ? "alert" : "normal",
        },
      ],
      bullets: [...pick(rng, PAST_HISTORY), pick(rng, SOCIAL)],
    },
    {
      key: "observations",
      title: "Observations",
      caption: "Latest set from the bedside chart.",
      rows: vitalRows,
    },
    {
      key: "labs",
      title: "Laboratory",
      caption: abnormal.length
        ? `${abnormal.length} value${abnormal.length === 1 ? "" : "s"} outside the reference range.`
        : "All reported values within range.",
      labs: labReadings,
    },
    {
      key: "medications",
      title: "Medication reconciliation",
      caption: "What the patient is already on. Check before adding to it.",
      bullets: currentMeds.length ? currentMeds : ["No regular medicines documented"],
    },
    {
      key: "order",
      title: "Physician order",
      caption: "The request you are being asked to action.",
      body: physicianOrder,
    },
  ];

  return { mrn, ward, bed, admitted, slides };
}
