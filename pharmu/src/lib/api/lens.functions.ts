import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  readPrescription, prescriptoKeyProblem, readerFailureMessage,
} from "./prescriptoai.server";
import { fromPrescriptoAI, type PrescriptoResponse } from "@/lib/lens/from-prescriptoai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildLensCase, type CatalogueDrug, type LensCase, type LensExtraction, type LensSummary,
} from "@/lib/lens/build-case";

/**
 * Prescription Lens: read a clinical document, build a case from it.
 *
 * The reading is done by PrescriptoAI, a service trained on real prescriptions
 * rather than a general vision model asked to squint at one - which is the
 * whole reason for it, because the handwriting is the hard part and a chat
 * model was not good enough at it.
 *
 * The image arrives as base64 in a request body and leaves as one multipart
 * field in one call. It is never written to disk, never put in a bucket, never
 * logged, and nothing derived from it outlives this function except the case
 * object returned - which by then has a fictional patient on it. There is
 * deliberately no id to fetch it by later, because there is nothing to fetch.
 *
 * The reader is asked to read, not to author. Everything about what makes a
 * case playable - which medicines exist, which label values the label step
 * offers - is decided in build-case.ts against the live catalogue. See the
 * note at the top of that file for why.
 */

/** Sized for a phone photo. Base64 is ~4/3 of the bytes it encodes. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3);

/**
 * What the reader will take.
 *
 * HEIC and HEIF are refused here rather than sent and rejected. The browser
 * converts a phone photo to JPEG before it ever reaches this function, and the
 * only way a HEIC arrives is the fallback for one the browser could not decode
 * - which this reader cannot decode either. Failing at the door costs nothing;
 * failing at the provider costs a billed call and a vaguer message.
 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type LensResult =
  | { ok: true; case: LensCase; summary: LensSummary }
  | { ok: false; error: string; hint?: string };

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

/**
 * How long the whole scan may take, and how long the reader may hold it.
 *
 * This runs as a serverless function with a hard ceiling on its duration, so
 * the budget has to be ours rather than the platform's: a reader that hangs
 * must be cut off while there is still time to answer the person waiting,
 * instead of the request dying with nothing to show.
 *
 * 25s against images that arrive around a quarter of a megabyte, where the
 * measured read of a full printed page was 7.1s. The margin is wide because a
 * photograph of handwriting is harder than the page it was measured on, and
 * because there is no second attempt to save time for any more.
 */
const LENS_BUDGET_MS = 45_000;
const READER_TIMEOUT_MS = 25_000;

export const readPrescriptionImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    imageBase64: z.string().min(64).max(MAX_BASE64_CHARS),
    mimeType: z.string().max(60),
  }))
  .handler(async ({ data }): Promise<LensResult> => {
    const startedAt = Date.now();
    const remainingMs = () => LENS_BUDGET_MS - (Date.now() - startedAt);
    const apiKey = process.env.PRESCRIPTOAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Prescription Lens is not configured on this server.",
        hint: "PRESCRIPTOAI_API_KEY is not set." };
    }
    const keyProblem = prescriptoKeyProblem(apiKey);
    if (keyProblem) return { ok: false, error: keyProblem };

    if (!ACCEPTED_TYPES.includes(data.mimeType.toLowerCase())) {
      return { ok: false, error: "That file type cannot be read.",
        hint: "Use a JPEG, PNG or WEBP photo." };
    }

    // The catalogue is needed whichever way the read goes, and fetching it
    // while the reader works saves a round trip from the slowest path.
    const cataloguePromise = Promise.all([
      supabaseAdmin.from("drugs")
        .select("id, name, generic_name, category, drug_class, dosage").limit(2000),
      // Brands are half of what makes a script resolvable: prescribers write
      // "Risek", not "omeprazole". Fetched alongside rather than after, so the
      // reader call and both queries overlap.
      supabaseAdmin.from("drug_brands").select("drug_id, brand").limit(5000),
    ]);

    // Base64 back to bytes. The buffer lives for the length of the call and is
    // handed straight to the reader; nothing else ever holds it.
    const bytes = Uint8Array.from(Buffer.from(data.imageBase64, "base64"));

    const result = await readPrescription(apiKey, {
      bytes,
      mimeType: data.mimeType,
      timeoutMs: Math.max(8_000, Math.min(READER_TIMEOUT_MS, remainingMs())),
    });
    if (!result.ok) {
      const message = readerFailureMessage(result.status);
      return { ok: false, error: message.error, hint: message.hint };
    }

    const extraction = fromPrescriptoAI(result.body as PrescriptoResponse);

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

    const built = buildLensCase(extraction, catalogue);

    // There is no second pass any more, and that is deliberate rather than a
    // loss. The old one escalated to a different model because handwriting is
    // exactly where one gives up and another does not. A dedicated reader has
    // no second model behind it: asking it the same question about the same
    // bytes returns the same answer, and costs another billed call to do it.

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
