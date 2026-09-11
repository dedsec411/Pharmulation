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
  /**
   * 0-1 in how far the document was read at all.
   *
   * Not a self-assessment any more: the reader behind this returns no
   * confidence score, so the value says whether a document came back rather
   * than how sure anything is about it. Whether a reading is usable is settled
   * below, by whether the medicines resolve against the catalogue.
   */
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
    /**
     * Other ways in to the same medicine, most likely first.
     *
     * Originally other readings of an ambiguous scrawl. The dedicated reader
     * commits to one name instead, so what arrives here now is usually its
     * generic for the thing it read - a second string to try against the
     * catalogue when the written one carries a brand or a strength. Either way
     * a match found through this list is a match on something other than what
     * the page says, which is why resolution marks it as assumed.
     */
    candidates?: string[] | null;
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
  /**
   * Brand names this medicine is sold under.
   *
   * Not decoration. Prescribers write the brand - a script says "Tab. Risek
   * 20mg", never "omeprazole" - so without these the resolver is reading a
   * different language from the one the page is written in.
   */
  brands?: string[] | null;
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
  /** Null when the document carried no age we could believe. */
  patientAge: number | null;
  diagnosis: string;
  mode: "rx" | "hospital";
  difficulty: "easy" | "medium" | "hard";
  /** Drugs that were matched to the catalogue and are in the case. */
  resolved: Array<{
    readAs: string; matchedTo: string; category: string;
    /** True when this identity is the model's alternative or a nearest match. */
    assumed: boolean;
  }>;
  /** Read off the page but not stocked, so deliberately left out. */
  dropped: string[];
  decisionPoints: string[];
  confidence: number;
  /** The read was legible enough to build on, but worth checking first. */
  uncertain: boolean;
  /** Names matched by nearest-spelling rather than outright. */
  assumed: string[];
};

/**
 * A case is JSON on the wire, and the server function's return type has to be
 * provably serializable - `unknown` values are not, so the shape says so.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type LensCase = { [key: string]: Json } & { id: string; mode: string };

/**
 * Two thresholds, not one.
 *
 * There was a single bar at 0.55 and it was the wrong instrument. A model
 * reading genuine doctor's handwriting reports low confidence *because the
 * handwriting is bad* - which is exactly the case this feature exists for -
 * so a legible-enough read of a real script was being thrown away with
 * "too unclear to read reliably".
 *
 * The real test of whether a read is usable is not how neat the page was: it
 * is whether the medicines on it resolved to something on the shelf. So the
 * hard floor drops to genuinely-unreadable, and the old bar becomes a warning
 * band - the case is built, and the preview says which readings to check.
 */
export const MIN_CONFIDENCE = 0.35;
export const UNCERTAIN_CONFIDENCE = 0.55;

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
 * Four passes, narrowing: the catalogue's own normalised key (which already
 * strips strengths and dose forms), then generic name, then brand, then a
 * containment check for the case where the page says "Amoxicillin trihydrate"
 * and the shelf says "Amoxicillin". Never a fuzzy score - a near-miss here
 * dispenses the wrong medicine, and no match at all is the safer failure.
 *
 * The brand pass is exact only. Brands are short, invented and deliberately
 * distinctive, so they collide in ways generic names do not, and one letter
 * of slack between two of them is a different medicine.
 */
/**
 * The dose form a prescriber writes in front of the name.
 *
 * A script never says "Metronidazole". It says "Tab. Flagyl 400mg", and the
 * catalogue's own key only strips the spelled-out forms, so the abbreviations
 * survive and no comparison can ever match.
 */
const WRITTEN_FORM = /^(?:t|tab|tabs|tablet|cap|caps|capsule|syp|syr|syrup|susp|inj|injection|oint|ointment|cream|gel|drop|drops|sol)\b\.?\s*/i;

/** What was written, reduced to the part that names a medicine. */
function writtenKey(written: string): string {
  let text = String(written ?? "").trim();
  // Twice, because "T. Tab Flagyl" is not the strangest thing on a script.
  for (let pass = 0; pass < 2; pass++) text = text.replace(WRITTEN_FORM, "").trim();
  return normalizeDrugKey(text);
}

export function resolveDrug(written: string, catalogue: CatalogueDrug[]): CatalogueDrug | null {
  const key = writtenKey(written);
  if (!key) return null;

  const exact = catalogue.find((d) => normalizeDrugKey(d.name) === key);
  if (exact) return exact;

  const byGeneric = catalogue.find(
    (d) => d.generic_name && normalizeDrugKey(d.generic_name) === key);
  if (byGeneric) return byGeneric;

  const byBrand = catalogue.find(
    (d) => (d.brands ?? []).some((brand) => normalizeDrugKey(brand) === key));
  if (byBrand) return byBrand;

  // Longest catalogue name contained in what was written, so "Amoxicillin
  // trihydrate" prefers "Amoxicillin" over a shorter incidental substring.
  const contained = catalogue
    .filter((d) => {
      const n = normalizeDrugKey(d.name);
      if (n.length <= 4) return false;
      // What was written is an abbreviation of the catalogue name: "Amox".
      if (n.includes(key)) return true;
      // The catalogue name appears inside what was written - but only count it
      // where a word actually begins. Plain substring matching reads
      // "Desloratadine" as "Loratadine" and hands over a different medicine;
      // the boundary keeps "T. Aspirin 75mg" working while refusing that.
      const at = key.indexOf(n);
      return at >= 0 && (at === 0 || !/[a-z]/.test(key[at - 1]));
    })
    .sort((a, b) => normalizeDrugKey(b.name).length - normalizeDrugKey(a.name).length);
  return contained[0] ?? null;
}

/** Edit distance, bailing out as soon as it exceeds what we would accept. */
function editDistance(a: string, b: string, ceiling: number): number {
  if (Math.abs(a.length - b.length) > ceiling) return ceiling + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > ceiling) return ceiling + 1;
    prev = row;
  }
  return prev[b.length];
}

/**
 * Last resort: the nearest catalogue name, when it is near enough to be a
 * spelling of the same word rather than a different medicine.
 *
 * Deliberately mean. A wrong match here dispenses the wrong drug, so it has
 * to share the opening letters, stay within one or two characters, and be the
 * only entry that close - "Ramipril" must never quietly become "Ranitidine",
 * and an ambiguous near-miss is refused rather than guessed.
 */
function nearestDrug(key: string, catalogue: CatalogueDrug[]): CatalogueDrug | null {
  if (key.length < 5) return null;
  const ceiling = key.length >= 9 ? 2 : 1;
  let best: CatalogueDrug | null = null;
  let bestDistance = ceiling + 1;
  let tied = false;

  for (const drug of catalogue) {
    const name = normalizeDrugKey(drug.name);
    if (name.length < 5 || name.slice(0, 2) !== key.slice(0, 2)) continue;
    const distance = editDistance(key, name, ceiling);
    if (distance > ceiling) continue;
    if (distance < bestDistance) { bestDistance = distance; best = drug; tied = false; }
    else if (distance === bestDistance && drug.id !== best?.id) tied = true;
  }
  return tied ? null : best;
}

/**
 * Every reading the model offered for one medicine, tried in order.
 *
 * The first spelling is the model's best guess, not necessarily the one on the
 * shelf: "Amoxycillin" and "Augmentin 625" are both real ways of writing
 * something the catalogue holds under another name.
 */
export function resolveReading(
  readings: string[], catalogue: CatalogueDrug[],
): { drug: CatalogueDrug; assumed: boolean } | null {
  const clean = (value: string) => String(value ?? "").trim();
  // Scripts are written "Amox 500", "Ramipril 5" - a bare number with no unit,
  // which the catalogue's own key does not strip because it only removes
  // numbers that carry one. Stripping it is not a guess about identity, so a
  // bare variant inherits the confidence of the reading it came from.
  const bare = (value: string) =>
    value.replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|%)?/gi, " ").replace(/\s+/g, " ").trim();

  const primary = clean(readings[0] ?? "");
  const alternates = readings.slice(1).map(clean).filter(Boolean);

  // What the model actually read comes first and is taken at face value.
  for (const attempt of [...new Set([primary, bare(primary)])].filter(Boolean)) {
    const hit = resolveDrug(attempt, catalogue);
    if (hit) return { drug: hit, assumed: false };
  }

  // Anything after that is the model offering an alternative because it was
  // not sure. It may well be right - "Augmentin" for a scrawled co-amoxiclav
  // usually is - but it is a reading the model itself declined to commit to,
  // so it travels as an assumption and the preview says so.
  for (const alternate of alternates) {
    for (const attempt of [...new Set([alternate, bare(alternate)])].filter(Boolean)) {
      const hit = resolveDrug(attempt, catalogue);
      if (hit) return { drug: hit, assumed: true };
    }
  }

  // Last resort: nearest catalogue spelling. Always an assumption.
  for (const attempt of [primary, ...alternates]) {
    const near = nearestDrug(normalizeDrugKey(attempt), catalogue);
    if (near) return { drug: near, assumed: true };
    const stripped = nearestDrug(normalizeDrugKey(bare(attempt)), catalogue);
    if (stripped) return { drug: stripped, assumed: true };
  }
  return null;
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
  // Only a genuinely unreadable page is refused here. A merely messy one goes
  // on to resolution, which is the honest test of whether it can be played.
  if (!(extraction.confidence >= MIN_CONFIDENCE)) {
    return { ok: false, reason: "low-confidence",
      detail: "The text was too unclear to read reliably." };
  }
  if (!extraction.drugs?.length) {
    return { ok: false, reason: "no-drugs",
      detail: "No medicines could be read from the document." };
  }

  // Resolve first: what is left after this is what the case can be about.
  const resolved: Array<{
    readAs: string; drug: CatalogueDrug; assumed: boolean;
    src: LensExtraction["drugs"][number];
  }> = [];
  const dropped: string[] = [];
  const assumed: string[] = [];
  for (const item of extraction.drugs) {
    const match = resolveReading([item.name, ...(item.candidates ?? [])], catalogue);
    // One entry per medicine: a page listing the same drug twice is a
    // repeat, not two things to dispense.
    if (match && !resolved.some((r) => r.drug.id === match.drug.id)) {
      resolved.push({ readAs: item.name, drug: match.drug, assumed: match.assumed, src: item });
      if (match.assumed) assumed.push(`${item.name} - ${match.drug.name}`);
    } else if (!match) {
      dropped.push(item.name);
    }
  }

  if (!resolved.length) {
    const read = extraction.drugs.map((d) => d.name).join(", ");
    return { ok: false, reason: "no-known-drugs",
      detail: `Read from the page: ${read}. The document was legible - these are simply not on the dispensing shelf yet, so there is nothing to build a case around.` };
  }

  const patientName = fictionalName(seed);
  // A prescription carries times, dates, quantities and strengths, and a
  // model asked for an age will sometimes hand one of those back instead. A
  // real script for "Breast Ca / HTN" came back with the patient aged 1,
  // read off the 15:00 written beside the name - which is both obviously
  // wrong and the kind of wrong that undermines everything beside it.
  //
  // Anything outside a plausible adult-or-child range is treated as no age at
  // all: the case still needs a number to reason about, but the preview says
  // nothing rather than something false.
  const readAge = Number(extraction.patient?.age);
  const believableAge = Number.isFinite(readAge) && readAge >= 2 && readAge <= 105
    ? Math.round(readAge)
    : null;
  const age = believableAge ?? 45;
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
    patientName, patientAge: believableAge, diagnosis, mode, difficulty,
    resolved: resolved.map((r) => ({
      readAs: r.readAs, matchedTo: r.drug.name, category: r.drug.category ?? "Uncategorised",
      assumed: r.assumed,
    })),
    dropped,
    decisionPoints,
    confidence: extraction.confidence,
    uncertain: extraction.confidence < UNCERTAIN_CONFIDENCE || assumed.length > 0,
    assumed,
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
