import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGemini, geminiKeyProblem, visionModelCandidates } from "./gemini.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildLensCase, type CatalogueDrug, type LensCase, type LensExtraction, type LensSummary,
} from "@/lib/lens/build-case";

/**
 * Prescription Lens: read a clinical document, build a case from it.
 *
 * The image is a base64 string in a request body and a set of parts in one
 * Gemini call. It is never written to disk, never put in a bucket, never
 * logged, and nothing derived from it outlives this function except the case
 * object returned - which by then has a fictional patient on it. There is
 * deliberately no id to fetch it by later, because there is nothing to fetch.
 *
 * The model is asked to read, not to author. Everything about what makes a
 * case playable - which medicines exist, which label values the label step
 * offers - is decided in build-case.ts against the live catalogue. See the
 * note at the top of that file for why.
 */

/** Sized for a phone photo. Base64 is ~4/3 of the bytes it encodes. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3);

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type LensResult =
  | { ok: true; case: LensCase; summary: LensSummary }
  | { ok: false; error: string; hint?: string };

function extractionPrompt(): string {
  return `You are reading a photograph of a medical document for a pharmacy training simulator. Report what is on the page. Do not design a teaching exercise, do not invent findings, and do not correct what you see - if the prescription is wrong, report it as written, because noticing that is the trainee's job.

Assume this is handwritten by a clinician and is hard to read. That is normal and it is the job. Decode it the way a pharmacy dispenser does, not the way an OCR engine does:
- Drug names are a closed set of real medicines. Prefer a real medicine whose shape fits the strokes over a literal letter-by-letter transcription. "Amoxycillin", "Amoxil" and a scrawled "Amox 500" are all the same medicine.
- Use everything around the word. The strength, the dose form, the frequency and the stated condition all narrow what a name can be. A "500mg TDS x 7/7" for a chest infection is an antibiotic, not an antihistamine.
- Expect prescribing shorthand and read it as written: OD, BD, TDS, QDS, nocte, mane, PRN, stat, po, SL, PR, 1-0-1, 1+1+1, x 7/7 (seven days), x 2/52 (two weeks), i/ii tabs, mitte 21.
- A trailing flourish, a looped ending or a missing dot is handwriting, not a different drug.

If after all that a word could be two different medicines, say so through candidates rather than picking one silently.

First decide what you are looking at. If it is not a medical document - a receipt, a landscape, a screenshot of something else - say so and stop.

Then read off:
- documentType: what kind of document it is, in a few words ("handwritten prescription", "discharge summary", "medication label", "inpatient chart").
- patient: name exactly as written, age as a number, sex, and any allergies stated. Use null for anything not on the page. Never guess an age, and never take one from something that is not labelled as one - a time of day, a date, a weight, a room or file number, or a quantity beside the name is not an age. If no age is written, say null.
- diagnosis: the condition being treated, if stated or clearly implied by the medicines.
- drugs: every medicine you can make out. For each: name as your best reading, candidates (up to 3 other real medicine names the same handwriting could be, most likely first, empty if you are certain - a candidate is treated as an unconfirmed reading and shown to the trainee as one, so offer them only where the writing genuinely could be either), dose, route, frequency as written (keep "TDS", "1-1-1", "bd" as they appear - do not translate them), duration, and any patient instruction.
- decisionPoints: two to four things a pharmacist should check before dispensing THIS document - an interaction between two of these medicines, a dose that looks wrong for the age, an allergy conflict with what is prescribed, a missing duration. Each a single sentence naming the specific medicines involved. If the document is unremarkable, say what routine checks it still needs.
- suggestedMode: "hospital" if it is an inpatient chart, discharge summary or anything with IV medicines and ward context; otherwise "rx".
- confidence: 0 to 1 - how sure you are that you have identified the MEDICINES, not how neat the page is. Untidy handwriting you can still decode is a confident read: score it high. Score low only when you genuinely cannot tell which medicines are written, or the photo is too blurred or cropped to work from.

Report only what you can make out. An empty drugs array is a valid answer for a document you truly cannot read.

Respond with JSON only, matching exactly:
{"isMedical":boolean,"documentType":string,"confidence":number,"patient":{"name":string|null,"age":number|null,"sex":string|null,"allergies":string[]},"diagnosis":string|null,"drugs":[{"name":string,"candidates":string[],"dose":string|null,"route":string|null,"frequency":string|null,"duration":string|null,"instruction":string|null}],"decisionPoints":string[],"suggestedMode":string}`;
}

/**
 * Nudge for the second pass, when the first read produced nothing playable.
 * A different model gets a different look at the same strokes, and being told
 * what failed stops it repeating the same abandonment.
 */
const SECOND_LOOK = "The first attempt could not identify the medicines on this document. Look again, harder. Work letter group by letter group, and lean on the strength, the dose form and the condition to decide which real medicine each word is. Offer candidates wherever a word is ambiguous. Only report an empty drugs list if the page is genuinely unreadable.";

/** Defensive parse: the model returns JSON, but never trust the shape. */
function parseExtraction(text: string): LensExtraction | null {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;

    const patient = (raw.patient ?? {}) as Record<string, unknown>;
    const drugs = Array.isArray(raw.drugs) ? raw.drugs : [];
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    return {
      isMedical: Boolean(raw.isMedical),
      documentType: str(raw.documentType) ?? "clinical document",
      confidence: Number(raw.confidence) || 0,
      patient: {
        name: str(patient.name),
        age: Number.isFinite(Number(patient.age)) ? Number(patient.age) : null,
        sex: str(patient.sex),
        allergies: Array.isArray(patient.allergies) ? patient.allergies.map(String).filter(Boolean) : [],
      },
      diagnosis: str(raw.diagnosis),
      drugs: drugs
        .map((d) => {
          const item = (d ?? {}) as Record<string, unknown>;
          const name = str(item.name);
          return name ? {
            name,
            candidates: Array.isArray(item.candidates)
              ? item.candidates.map(String).map((c) => c.trim()).filter(Boolean).slice(0, 3)
              : [],
            dose: str(item.dose), route: str(item.route), frequency: str(item.frequency),
            duration: str(item.duration), instruction: str(item.instruction),
          } : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null),
      decisionPoints: Array.isArray(raw.decisionPoints)
        ? raw.decisionPoints.map(String).filter(Boolean) : [],
      suggestedMode: str(raw.suggestedMode),
    };
  } catch (error) {
    console.error("Could not parse lens extraction", error, text.slice(0, 300));
    return null;
  }
}

/** Wording a person can act on, per failure. Never the raw model output. */
const FAILURE_MESSAGE: Record<string, { error: string; hint: string }> = {
  "not-medical": {
    error: "That does not look like a medical document.",
    hint: "Point the camera at a prescription, a medication label, a discharge summary or a patient chart.",
  },
  "low-confidence": {
    error: "The writing was too unclear to read reliably.",
    hint: "A case built from a half-read prescription would teach the wrong thing. Try again with more light, the page flat, and the whole document in frame.",
  },
  "no-drugs": {
    error: "No medicines could be read on that document.",
    hint: "Make sure the medicine list is in shot and in focus.",
  },
  "no-known-drugs": {
    error: "None of those medicines are in the training catalogue yet.",
    // Replaced below by one naming the actual medicines. A person who can see
    // "Airtal, Movax" knows immediately that the page was read correctly and
    // the shelf is what is short - which is a different problem from a bad
    // photograph, and they should not have to guess which one they hit.
    hint: "The simulator can only build a case around medicines it stocks on the dispensing shelf.",
  },
};

/** Failures a better read might fix. "not-medical" is not one of them. */
const RETRY_WORTH_IT = new Set(["low-confidence", "no-drugs", "no-known-drugs"]);

/**
 * How long the whole scan may take, and how long any one model may hold it.
 *
 * This runs as a serverless function with a hard ceiling on its duration, so
 * the budget has to be ours rather than the platform's: a model that hangs
 * must lose its turn while there is still time for the next one, instead of
 * every model timing out in sequence and the request dying with nothing to
 * show. 18s per model against images that now arrive around a quarter of a
 * megabyte, where the slowest measured read was 6.5s.
 */
const LENS_BUDGET_MS = 45_000;
const PER_MODEL_TIMEOUT_MS = 18_000;

export const readPrescriptionImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    imageBase64: z.string().min(64).max(MAX_BASE64_CHARS),
    mimeType: z.string().max(60),
  }))
  .handler(async ({ data }): Promise<LensResult> => {
    const startedAt = Date.now();
    const remainingMs = () => LENS_BUDGET_MS - (Date.now() - startedAt);
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { ok: false, error: "Prescription Lens is not configured on this server.",
        hint: "GEMINI_API_KEY is not set." };
    }
    const keyProblem = geminiKeyProblem(GEMINI_API_KEY);
    if (keyProblem) return { ok: false, error: keyProblem };

    if (!ACCEPTED_TYPES.includes(data.mimeType.toLowerCase())) {
      return { ok: false, error: "That file type cannot be read.",
        hint: "Use a JPEG, PNG or WEBP photo." };
    }

    // The catalogue is needed whichever way the read goes, and fetching it
    // while the model works saves a round trip from the slowest path.
    const cataloguePromise = Promise.all([
      supabaseAdmin.from("drugs")
        .select("id, name, generic_name, category, drug_class, dosage").limit(2000),
      // Brands are half of what makes a script resolvable: prescribers write
      // "Risek", not "omeprazole". Fetched alongside rather than after, so the
      // model call and both queries overlap.
      supabaseAdmin.from("drug_brands").select("drug_id, brand").limit(5000),
    ]);

    async function read(models: string[], hint?: string): Promise<LensExtraction | null> {
      try {
        const result = await callGemini(GEMINI_API_KEY!, {
          systemPrompt: extractionPrompt(),
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } },
              { text: hint ?? "Read this document and report what is on it." },
            ],
          }],
          // Reading is a transcription task, not a creative one: the same
          // photograph should give the same drug names every time.
          temperature: 0,
          maxOutputTokens: 2000,
          json: true,
          // Bounded by whatever is left of the whole scan's budget, so a slow
          // model cannot spend the time the next one needs.
          timeoutMs: Math.max(6_000, Math.min(PER_MODEL_TIMEOUT_MS, remainingMs())),
          models,
        });
        if (!result.ok) {
          console.error("Lens read failed", result.error);
          return null;
        }
        return parseExtraction(result.text);
      } catch (error) {
        console.error("Lens read threw", error);
        return null;
      }
    }

    const extraction = await read(visionModelCandidates());
    if (!extraction) {
      return { ok: false, error: "Could not read that image. Please try again.",
        hint: "If this keeps happening, check the server has a working GEMINI_API_KEY." };
    }

    const [drugResult, brandResult] = await cataloguePromise;
    if (drugResult.error) {
      console.error("[supabase] lens could not load the drug catalogue:", drugResult.error);
      return { ok: false, error: "Could not load the medicine catalogue. Please try again." };
    }
    // Brands are an enhancement, not a requirement: if that query fails the
    // catalogue still resolves everything written generically.
    if (brandResult.error) {
      console.error("[supabase] lens could not load brands:", brandResult.error);
    }
    const brandsByDrug = new Map<string, string[]>();
    for (const row of (brandResult.data ?? []) as Array<{ drug_id: string; brand: string }>) {
      if (!row?.drug_id || !row?.brand) continue;
      const list = brandsByDrug.get(row.drug_id);
      if (list) list.push(row.brand);
      else brandsByDrug.set(row.drug_id, [row.brand]);
    }
    const catalogue = ((drugResult.data ?? []) as CatalogueDrug[])
      .map((drug) => ({ ...drug, brands: brandsByDrug.get(drug.id) ?? [] }));

    let built = buildLensCase(extraction, catalogue);

    // A first pass that read nothing playable is not the end of it. Handwriting
    // is exactly where one model gives up and another does not, so escalate to
    // a second model once before telling someone their prescription is
    // unreadable. Only for failures a better read could fix - a photograph of a
    // sandwich is still not a prescription on the second attempt.
    // Only when there is genuinely time for another read. Starting one with
    // four seconds left just guarantees a timeout on top of a failure.
    if (!built.ok && RETRY_WORTH_IT.has(built.reason) && remainingMs() > 12_000) {
      const second = await read(visionModelCandidates("gemini-3.5-flash"), SECOND_LOOK);
      if (second) {
        const retry = buildLensCase(second, catalogue);
        if (retry.ok) built = retry;
      }
    }

    if (!built.ok) {
      const message = FAILURE_MESSAGE[built.reason]
        ?? { error: built.detail, hint: "Try another photograph." };
      // The catalogue failure is the one worth being specific about: the
      // document was read, and naming what came off it separates "we could not
      // read your photo" from "we do not stock these yet".
      const hint = built.reason === "no-known-drugs" ? built.detail : message.hint;
      return { ok: false, error: message.error, hint };
    }

    // The extraction - which held the real name - goes out of scope here. Only
    // the built case and its summary travel back, and both are anonymised.
    return { ok: true, case: built.case, summary: built.summary };
  });

/* ------------------------------------------------------------------ *
 * Contributing a scanned case back to the pool
 * ------------------------------------------------------------------ */

/**
 * The fields a contributed case is allowed to keep.
 *
 * An allow-list rather than a strip-list: a case object gains fields over time,
 * and a list of things to remove silently stops covering the ones added after
 * it was written. Anything not named here does not reach the table.
 */
const PatientSchema = z.object({
  name: z.string().max(80),
  age: z.number().min(0).max(120),
  gender: z.string().max(30).optional().default("unspecified"),
  allergies: z.string().max(200).optional().default("none"),
  diagnosis: z.string().max(200).optional().default(""),
  complaint: z.string().max(200).optional().default(""),
});

export const contributeLensCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    mode: z.enum(["rx", "hospital"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    title: z.string().max(200),
    explanation: z.string().max(2000).optional().default(""),
    mentorTip: z.string().max(600).optional().default(""),
    patient: PatientSchema,
    drugsRequired: z.array(z.string().max(120)).max(12).optional().default([]),
    correctAnswer: z.record(z.string(), z.any()),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    try {
      // The name is replaced a second time, here, rather than trusted from the
      // client. The browser was handed a fictional one already, but this is
      // the write that outlives the session and it should not depend on the
      // caller having left that field alone.
      const anonymised = {
        name: `Patient ${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        // Banded, so an age cannot combine with a diagnosis to identify anyone.
        age: Math.min(95, Math.max(5, Math.round(data.patient.age / 5) * 5)),
        gender: data.patient.gender,
        allergies: data.patient.allergies,
        diagnosis: data.patient.diagnosis,
        complaint: data.patient.complaint,
      };

      const { error } = await supabaseAdmin.from("cases").insert({
        mode: data.mode,
        difficulty: data.difficulty,
        title: data.title,
        explanation: data.explanation,
        mentor_tip: data.mentorTip,
        patient_info_json: anonymised,
        drugs_required: data.drugsRequired,
        correct_answer_json: data.correctAnswer,
        // No electronic_prescription_json: it carried the scanned document's
        // own wording, which is the closest thing left to the original page.
        source: "community",
        contributed_by: context.userId,
      } as never);

      if (error) {
        console.error("[supabase] could not contribute case:", error);
        return { ok: false, message: "Could not add that case to the pool." };
      }
      return { ok: true };
    } catch (error) {
      console.error("Contribute case failed", error);
      return { ok: false, message: "Could not add that case to the pool." };
    }
  });
