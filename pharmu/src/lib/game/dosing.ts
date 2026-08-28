/**
 * Turn a drug's real dosage text into a prescribable regimen.
 *
 * Generated cases used to invent the dose: a random multiple of 50 drawn from
 * the template's dose_range, with no reference to the drug it was attached to.
 * That range was 100-800 for the antibiotic template, which is how a slip came
 * to read "Doxycycline 300 mg once daily" - a strength and a frequency that
 * are both wrong, printed under a real drug name on something shaped like a
 * prescription. The drugs table already holds the verified regimen for every
 * one of these medicines, so read it rather than roll dice against it.
 *
 * Everything returned for frequency, timing and duration is guaranteed to be a
 * member of the label option lists below. The label step asks the learner to
 * reproduce this regimen by picking from those lists, so a value outside them
 * would make the step unwinnable.
 */

export const LABEL_FREQUENCIES = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"] as const;
export const LABEL_TIMINGS = ["morning", "with food", "before sleep", "as needed"] as const;
export const LABEL_DURATIONS = ["3 days", "5 days", "7 days", "14 days", "4 weeks", "ongoing"] as const;

export type Regimen = {
  /** e.g. "100 mg" - empty when the source text carries no parsable strength. */
  strength: string;
  frequency: (typeof LABEL_FREQUENCIES)[number];
  timing: (typeof LABEL_TIMINGS)[number];
  duration: (typeof LABEL_DURATIONS)[number];
};

export type DosableDrug = {
  dosage?: string | null;
  drug_class?: string | null;
  category?: string | null;
};

/**
 * The adult regimen only.
 *
 * Dosage strings carry paediatric and alternate-route regimens after the adult
 * one ("Adult: 500mg PO TDS. Peds: 25-50mg/kg/day"). Parsing the whole string
 * would pick up whichever number came first across all of them, so the tail is
 * cut before anything else is read.
 */
function adultPart(dosage: string): string {
  const cut = dosage.search(/\b(peds?|paed|child|neb|nebul)\b/i);
  const head = cut >= 0 ? dosage.slice(0, cut) : dosage;
  return head.replace(/^\s*(adult|inhaler|oral|tablet)s?\s*:\s*/i, "").trim();
}

/**
 * First strength in the text. A range like "250-500mg" yields its lower bound.
 *
 * The range has to be matched explicitly: in "250-500mg" only the second number
 * carries the unit, so a pattern requiring number-then-unit skips the 250 and
 * reads the dose as 500 mg.
 */
function parseStrength(text: string): string {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?\s*)?(mcg|mg|g|ml|units?)\b/i);
  if (!match) return "";
  const unit = match[2].toLowerCase();
  return `${match[1]} ${unit === "unit" ? "units" : unit}`;
}

// Ordered: the first pattern that appears in the text wins, so "OD-BD" reads as
// once daily (the starting dose) rather than whichever token is checked first.
const FREQUENCY_PATTERNS: readonly [RegExp, Regimen["frequency"]][] = [
  [/\bPRN\b|as needed|when required/i, "as needed"],
  [/\bQDS\b|\bQID\b|\bq6h\b|four times/i, "four times daily"],
  [/\bTDS\b|\bTID\b|\bq8h\b|three times|\bq4-6h\b/i, "three times daily"],
  [/\bBD\b|\bBID\b|\bq12h\b|twice/i, "twice daily"],
  [/\bOD\b|\bOM\b|\bON\b|\bq24h\b|once daily|\bdaily\b|\bnocte\b|\bmane\b/i, "once daily"],
];

function parseFrequency(text: string): Regimen["frequency"] {
  let best: Regimen["frequency"] = "once daily";
  let bestAt = Number.POSITIVE_INFINITY;
  for (const [pattern, value] of FREQUENCY_PATTERNS) {
    const at = text.search(pattern);
    if (at >= 0 && at < bestAt) {
      bestAt = at;
      best = value;
    }
  }
  return best;
}

function parseTiming(text: string, frequency: Regimen["frequency"]): Regimen["timing"] {
  if (/with (or after )?food|after food|with meals?|with breakfast/i.test(text)) return "with food";
  if (/before breakfast|\bmane\b|\bOM\b|morning/i.test(text)) return "morning";
  if (/at night|bedtime|before sleep|\bnocte\b|\bON\b/i.test(text)) return "before sleep";
  if (frequency === "as needed") return "as needed";
  return "morning";
}

const DURATION_DAYS: readonly [number, Regimen["duration"]][] = [
  [3, "3 days"], [5, "5 days"], [7, "7 days"], [14, "14 days"], [28, "4 weeks"],
];

/** Snap a day count onto the nearest option the label form offers. */
function snapDuration(days: number): Regimen["duration"] {
  let best = DURATION_DAYS[0];
  for (const entry of DURATION_DAYS) {
    if (Math.abs(entry[0] - days) < Math.abs(best[0] - days)) best = entry;
  }
  return best[1];
}

function isCourse(drug: DosableDrug): boolean {
  const text = `${drug.drug_class ?? ""} ${drug.category ?? ""}`.toLowerCase();
  return /antibiotic|penicillin|macrolide|tetracycline|cephalosporin|quinolone|antifungal|antiviral/.test(text);
}

function parseDuration(text: string, drug: DosableDrug): Regimen["duration"] {
  // "x 7d", "x 7-14d", "for 5 days" - the lower bound of a range is the
  // conservative choice for a first supply.
  const match = text.match(/(?:x|for)\s*(\d+)\s*(?:-\s*\d+\s*)?(d\b|days?)/i);
  if (match) return snapDuration(Number(match[1]));
  if (/\bweeks?\b/i.test(text)) {
    const weeks = text.match(/(\d+)\s*weeks?/i);
    if (weeks) return snapDuration(Number(weeks[1]) * 7);
  }
  // An antibiotic is a finite course even when the text does not say so; a
  // long-term medicine is not.
  return isCourse(drug) ? "7 days" : "ongoing";
}

/**
 * The regimen for a drug, or null when its dosage text is missing or unusable.
 * Callers fall back to their previous behaviour on null rather than printing a
 * half-parsed dose.
 */
export function regimenForDrug(drug: DosableDrug): Regimen | null {
  const dosage = String(drug?.dosage ?? "").trim();
  if (!dosage) return null;

  const text = adultPart(dosage);
  const strength = parseStrength(text);
  if (!strength) return null;

  const frequency = parseFrequency(text);
  return {
    strength,
    frequency,
    timing: parseTiming(text, frequency),
    duration: parseDuration(text, drug),
  };
}

/** The regimen written the way it appears on a prescription. */
export function regimenSig(regimen: Regimen): string {
  const parts = [regimen.strength, regimen.frequency, regimen.timing];
  if (regimen.duration !== "ongoing") parts.push(`for ${regimen.duration}`);
  return parts.filter(Boolean).join(", ");
}
