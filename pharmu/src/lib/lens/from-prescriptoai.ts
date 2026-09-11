/**
 * Turning what PrescriptoAI read into a case the simulator can build.
 *
 * The provider is a dedicated prescription reader rather than a general vision
 * model, which is the reason for using it: it is trained on real scripts and
 * handles a clinician's handwriting far better than asking a chat model to
 * squint at one. What it does not do is teach. It reports what is on the page
 * and stops there.
 *
 * So this maps its reading onto the shape build-case expects, and is careful
 * about the three fields it has no answer for:
 *
 *   candidates    - it commits to one reading per medicine and offers no
 *                   alternatives, so nothing here is ever marked as an
 *                   unconfirmed second guess. Its generic name is carried as a
 *                   candidate only when it differs from what was written,
 *                   which gives the catalogue matcher a second way in.
 *   confidence    - it returns none. Rather than invent a number and then gate
 *                   on it, the value here says only whether a document was
 *                   read at all; whether the reading is usable is decided
 *                   further down, by whether the medicines resolve against the
 *                   catalogue.
 *   decisionPoints- it finds none, because finding them is clinical reasoning
 *                   rather than reading. What is derived below are document
 *                   completeness checks - a missing dose, a missing duration,
 *                   the same medicine written twice - which are real things a
 *                   pharmacist checks and are all verifiable from the page.
 *                   No interaction or dosing judgement is invented here.
 *
 * The patient's real name is dropped at this boundary and never travels
 * further. build-case puts a fictional one on the case regardless, but the
 * name should stop existing at the first point it can rather than be carried
 * through the system on trust.
 */

import type { LensExtraction } from "./build-case";

/** The envelope the live API returns. Every field is treated as optional. */
export type PrescriptoResponse = {
  success?: boolean;
  type?: string;
  data?: {
    patient?: { name?: string; age?: unknown; gender?: string };
    doctor?: { name?: string };
    prescription?: {
      date?: string;
      diagnosis?: string;
      notes?: string;
      medications?: Array<{
        name?: string;
        genericName?: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        notes?: string;
      }>;
    };
  } | null;
};

const text = (value: unknown): string | null => {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : null;
};

/** How many checks a case is given. More than this is a checklist, not a case. */
const MAX_DECISION_POINTS = 4;

export function fromPrescriptoAI(response: PrescriptoResponse): LensExtraction {
  const data = response?.data ?? null;
  const script = data?.prescription ?? {};
  const medications = Array.isArray(script.medications) ? script.medications : [];

  const drugs = medications
    .map((item) => {
      const name = text(item?.name);
      if (!name) return null;
      const generic = text(item?.genericName);
      return {
        name,
        // Not a second guess - a second way for the matcher to find the same
        // medicine when the written name carries a brand or a strength.
        candidates: generic && generic.toLowerCase() !== name.toLowerCase() ? [generic] : [],
        dose: text(item?.dosage),
        // Never reported by this provider. A route invented here would be a
        // clinical instruction nobody wrote.
        route: null,
        frequency: text(item?.frequency),
        duration: text(item?.duration),
        instruction: text(item?.instructions) ?? text(item?.notes),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const age = Number(data?.patient?.age);

  return {
    // A document it could parse at all is a prescription; it reads nothing
    // else. A null payload is its way of saying this was not one.
    isMedical: Boolean(data),
    documentType: text(response?.type) === "standard"
      ? "prescription"
      : text(response?.type) ?? "prescription",
    // Structural, not a model's self-assessment. See the note at the top.
    confidence: data ? 1 : 0,
    patient: {
      // Deliberately dropped. See the note at the top.
      name: null,
      age: Number.isFinite(age) ? age : null,
      sex: text(data?.patient?.gender),
      // Not reported by this provider, and an allergy list is not something to
      // guess at - an empty one reads as "none stated", which is the truth.
      allergies: [],
    },
    diagnosis: text(script.diagnosis),
    drugs,
    decisionPoints: completenessChecks(drugs, Number.isFinite(age) ? age : null),
    // Everything it reads is an outpatient script. A ward chart would need a
    // judgement this provider does not make.
    suggestedMode: "rx",
  };
}

/**
 * Checks that follow from the page itself.
 *
 * Deliberately only things that can be seen rather than reasoned about: a
 * pharmacist querying a prescription with no duration on it is not making a
 * clinical judgement, they are reading what is missing. Interactions, dose
 * appropriateness and allergy conflicts are all absent on purpose - inventing
 * one would put a fabricated clinical finding in front of a trainee, which is
 * worse than offering none.
 */
export function completenessChecks(
  drugs: LensExtraction["drugs"],
  age: number | null,
): string[] {
  const checks: string[] = [];

  const seen = new Map<string, number>();
  for (const drug of drugs) {
    const key = (drug.candidates?.[0] ?? drug.name).toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) {
    if (count > 1) {
      checks.push(`${key} appears more than once on this prescription. Check whether that is deliberate before dispensing both.`);
    }
  }

  for (const drug of drugs) {
    if (!drug.dose) {
      checks.push(`No strength is written for ${drug.name}. Confirm it with the prescriber rather than assuming the usual one.`);
    }
  }
  for (const drug of drugs) {
    if (!drug.frequency) {
      checks.push(`No frequency is written for ${drug.name}. The patient cannot be told how often to take it.`);
    }
  }
  for (const drug of drugs) {
    if (!drug.duration) {
      checks.push(`No duration is written for ${drug.name}. Decide what quantity that means before you count it out.`);
    }
  }

  if (age === null && drugs.length) {
    checks.push("No age is recorded on this prescription. Check it before accepting any of these doses.");
  }

  if (!checks.length && drugs.length) {
    checks.push(`Nothing is missing from the face of this prescription. Check the ${drugs.length === 1 ? "medicine" : `${drugs.length} medicines`} against the patient's history and allergies before dispensing.`);
  }

  return checks.slice(0, MAX_DECISION_POINTS);
}
