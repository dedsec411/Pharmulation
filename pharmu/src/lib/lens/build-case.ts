import {
  LABEL_INSTRUCTIONS, MAX_COURSE_DAYS, ONGOING,
  durationDays, formatDuration, frequencyFromText, timingFromText,
} from "@/lib/game/dosing";
import { normalizeDrugKey } from "@/lib/drug-catalog";

/**
 * Turning what was on the paper into something that can actually be played.
 *
 * The obvious design is to ask Gemini for a finished case object. It does not
 * survive contact with the game: in Rx the learner has to find every required
 * drug on the dispensing shelf, and that shelf is the real `drugs` table
 * matched by exact name. A model that reads "Amoxil 500mg" and writes that
 * into drugs_required produces a case where Confirm collection can never be
 * satisfied - the medicine is not on any shelf, so the case is a dead end with
 * no way out but to abandon it.
 *
 * So the split is: the model reads, this file builds. Every drug is resolved
 * against the live catalogue before it reaches a case, every label value comes
 * from the enums the label step offers, and anything that cannot be resolved
 * is dropped with a reason rather than written into a case that will strand
 * someone. A case that leaves here is playable or it does not leave.
 */

/** What the model is asked to report. Facts, not a case. */
export type LensExtraction = {
  isMedical: boolean;
  documentType: string;
  /** The model's own 0-1 confidence in the reading. */
  confidence: number;
  patient: {
    name?: string | null;
    age?: number | null;
    sex?: string | null;
    allergies?: string[];
  };
  diagnosis?: string | null;
  drugs: Array<{
    name: string;
    dose?: string | null;
    route?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instruction?: string | null;
  }>;
  decisionPoints?: string[];
  suggestedMode?: string | null;
};

export type CatalogueDrug = {
  id: string;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  drug_class?: string | null;
  dosage?: string | null;
};

export type LensBuildResult =
  | { ok: true; case: LensCase; summary: LensSummary }
  | { ok: false; reason: LensFailure; detail: string };

export type LensFailure =
  | "not-medical"
  | "low-confidence"
  | "no-drugs"
  | "no-known-drugs";

export type LensSummary = {
  documentType: string;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  mode: "rx" | "hospital";
  difficulty: "easy" | "medium" | "hard";
  /** Drugs that were matched to the catalogue and are in the case. */
  resolved: Array<{ readAs: string; matchedTo: string; category: string }>;
  /** Read off the page but not stocked, so deliberately left out. */
  dropped: string[];
  decisionPoints: string[];
  confidence: number;
};

/**
 * A case is JSON on the wire, and the server function's return type has to be
 * provably serializable - `unknown` values are not, so the shape says so.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type LensCase = { [key: string]: Json } & { id: string; mode: string };

/**
 * Below this the reading is a guess, and a guess printed on something shaped
 * like a prescription teaches the wrong thing with complete confidence.
 */
export const MIN_CONFIDENCE = 0.55;

/**
 * Names used in place of whatever was on the document.
 *
 * The real one never reaches a case object, a screen or the database - it is
 * replaced here, at the first point the extraction is touched, rather than
 * being carried around and stripped later where a missed path would leak it.
 */
const FICTIONAL_NAMES = [
  "Adaeze Nwosu", "Tomas Lindqvist", "Priya Raman", "Marcus Bell",
  "Leila Haddad", "Ivan Petrov", "Sofia Marchetti", "Kwame Boateng",
  "Hannah Whitfield", "Yusuf Demir", "Mei Chen", "Rosa Alvarez",
];

/** Stable per case, so the same scan does not rename the patient on re-render. */
function fictionalName(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FICTIONAL_NAMES[hash % FICTIONAL_NAMES.length];
}

/**
 * The catalogue entry a written drug name refers to, or null.
 *
 * Three passes, narrowing: the catalogue's own normalised key (which already
 * strips strengths and dose forms), then generic name, then a containment
 * check for the case where the page says "Amoxicillin trihydrate" and the
 * shelf says "Amoxicillin". Never a fuzzy score - a near-miss here dispenses
 * the wrong medicine, and no match at all is the safer failure.
 */
export function resolveDrug(written: string, catalogue: CatalogueDrug[]): CatalogueDrug | null {
  const key = normalizeDrugKey(written);
  if (!key) return null;

  const exact = catalogue.find((d) => normalizeDrugKey(d.name) === key);
  if (exact) return exact;

  const byGeneric = catalogue.find(
    (d) => d.generic_name && normalizeDrugKey(d.generic_name) === key);
  if (byGeneric) return byGeneric;

  // Longest catalogue name contained in what was written, so "Amoxicillin
  // trihydrate" prefers "Amoxicillin" over a shorter incidental substring.
  const contained = catalogue
    .filter((d) => {
      const n = normalizeDrugKey(d.name);
      return n.length > 4 && (key.includes(n) || n.includes(key));
    })
    .sort((a, b) => normalizeDrugKey(b.name).length - normalizeDrugKey(a.name).length);
  return contained[0] ?? null;
}

/** Distractors from the same category, so the choice is a real one. */
function pickDistractors(
  chosen: CatalogueDrug[], catalogue: CatalogueDrug[], count: number,
): CatalogueDrug[] {
  const taken = new Set(chosen.map((d) => d.id));
  const categories = new Set(chosen.map((d) => d.category).filter(Boolean));
  const sameCategory = catalogue.filter(
    (d) => !taken.has(d.id) && d.category && categories.has(d.category));
  return sameCategory.slice(0, count);
}

/** A duration the slider can land on, or ongoing. */
function labelDuration(written: string | null | undefined, isCourse: boolean): string {
  const days = durationDays(String(written ?? ""));
  if (days !== null) return formatDuration(Math.min(Math.max(days, 1), MAX_COURSE_DAYS));
  return isCourse ? "7 days" : ONGOING;
}

function isCourseDrug(drug: CatalogueDrug): boolean {
  const text = `${drug.drug_class ?? ""} ${drug.category ?? ""}`.toLowerCase();
  return /antibiotic|antifungal|antiviral/.test(text);
}

/** Only the number, which is what the clinical order form compares against. */
function numericDose(written: string | null | undefined): string {
  const match = String(written ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
}

const CLINICAL_ROUTES = ["oral", "IV", "IM", "SC"] as const;

function clinicalRoute(written: string | null | undefined): string {
  const t = String(written ?? "").toLowerCase();
  if (/\biv\b|intraven/.test(t)) return "IV";
  if (/\bim\b|intramus/.test(t)) return "IM";
  if (/\bsc\b|\bsubcut/.test(t)) return "SC";
  return CLINICAL_ROUTES[0];
}

/** More to read and more to catch means a harder case. */
function difficultyFor(drugCount: number, decisionPoints: number): "easy" | "medium" | "hard" {
  const weight = drugCount + decisionPoints;
  if (weight >= 6) return "hard";
  if (weight >= 3) return "medium";
  return "easy";
}

export function buildLensCase(
  extraction: LensExtraction,
  catalogue: CatalogueDrug[],
  seed = String(Date.now()),
): LensBuildResult {
  if (!extraction.isMedical) {
    return { ok: false, reason: "not-medical",
      detail: "That does not look like a prescription or clinical document." };
  }
  if (!(extraction.confidence >= MIN_CONFIDENCE)) {
    return { ok: false, reason: "low-confidence",
      detail: "The text was too unclear to read reliably." };
  }
  if (!extraction.drugs?.length) {
    return { ok: false, reason: "no-drugs",
      detail: "No medicines could be read from the document." };
  }

  // Resolve first: what is left after this is what the case can be about.
  const resolved: Array<{ readAs: string; drug: CatalogueDrug; src: LensExtraction["drugs"][number] }> = [];
  const dropped: string[] = [];
  for (const item of extraction.drugs) {
    const match = resolveDrug(item.name, catalogue);
    // One entry per medicine: a page listing the same drug twice is a
    // repeat, not two things to dispense.
    if (match && !resolved.some((r) => r.drug.id === match.id)) {
      resolved.push({ readAs: item.name, drug: match, src: item });
    } else if (!match) {
      dropped.push(item.name);
    }
  }

  if (!resolved.length) {
    return { ok: false, reason: "no-known-drugs",
      detail: `None of the medicines read (${extraction.drugs.map((d) => d.name).join(", ")}) are in the training catalogue.` };
  }

  const patientName = fictionalName(seed);
  const age = Number.isFinite(Number(extraction.patient?.age))
    ? Math.min(105, Math.max(1, Number(extraction.patient.age)))
    : 45;
  const allergies = (extraction.patient?.allergies ?? []).filter(Boolean);
  const diagnosis = String(extraction.diagnosis ?? "").trim() || "Clinical review";
  const decisionPoints = (extraction.decisionPoints ?? []).filter(Boolean).slice(0, 4);

  const mode: "rx" | "hospital" = extraction.suggestedMode === "hospital" ? "hospital" : "rx";
  const difficulty = difficultyFor(resolved.length, decisionPoints.length);
  const distractors = pickDistractors(resolved.map((r) => r.drug), catalogue, 4);

  const patientInfo = {
    name: patientName,
    age,
    gender: String(extraction.patient?.sex ?? "unspecified"),
    allergies: allergies.length ? allergies.join(", ") : "none",
    diagnosis,
    complaint: diagnosis,
  };

  const shared = {
    id: `lens:${seed}`,
    mode,
    difficulty,
    title: `${patientName} - ${diagnosis}`,
    patient_info_json: patientInfo,
    explanation: decisionPoints.length
      ? `Points this document turns on: ${decisionPoints.join(" ")}`
      : "Check the indication, the dose and the patient's own history before dispensing.",
    mentor_tip: decisionPoints[0]
      ?? "Read the whole document before you touch a medicine - the catch is rarely on the line you are looking at.",
    created_at: new Date().toISOString(),
    is_generated: true,
    // Marks a case as scanned rather than seeded, for the results screen's
    // offer to contribute it. Never carries anything from the image.
    lens_generated: true,
    lens_distractors: distractors.map((d) => d.name),
  };

  const summary: LensSummary = {
    documentType: extraction.documentType || "clinical document",
    patientName, patientAge: age, diagnosis, mode, difficulty,
    resolved: resolved.map((r) => ({
      readAs: r.readAs, matchedTo: r.drug.name, category: r.drug.category ?? "Uncategorised",
    })),
    dropped,
    decisionPoints,
    confidence: extraction.confidence,
  };

  if (mode === "hospital") {
    return {
      ok: true,
      summary,
      case: {
        ...shared,
        correct_answer_json: {
          drugs: resolved.map((r) => ({
            drug: r.drug.name,
            dose: numericDose(r.src.dose),
            route: clinicalRoute(r.src.route),
            frequency: frequencyFromText(r.src.frequency ?? r.drug.dosage ?? ""),
          })),
          remove: [],
        },
      },
    };
  }

  // Rx: the label answers must be values the label step actually offers, or
  // the step cannot be completed.
  const labels: Record<string, { frequency: string; timing: string; duration: string }> = {};
  for (const r of resolved) {
    const freq = frequencyFromText(r.src.frequency ?? r.drug.dosage ?? "");
    labels[r.drug.name] = {
      frequency: freq,
      timing: timingFromText(`${r.src.instruction ?? ""} ${r.src.frequency ?? ""}`, freq),
      duration: labelDuration(r.src.duration, isCourseDrug(r.drug)),
    };
  }

  return {
    ok: true,
    summary,
    case: {
      ...shared,
      drugs_required: resolved.map((r) => r.drug.name),
      electronic_prescription_json: {
        patient: patientName,
        prescriber: "Scanned document",
        items: resolved.map((r) => ({
          drug: r.drug.name,
          strength: r.src.dose ?? r.drug.dosage ?? "",
          sig: [labels[r.drug.name].frequency, labels[r.drug.name].timing,
                labels[r.drug.name].duration].filter(Boolean).join(", "),
          // Only an instruction the label step can offer back.
          instruction: (LABEL_INSTRUCTIONS as readonly string[])
            .find((o) => o.toLowerCase() === String(r.src.instruction ?? "").toLowerCase()) ?? null,
        })),
      },
      correct_answer_json: { labels },
    },
  };
}
