/**
 * The PrescriptoAI transport.
 *
 * A dedicated prescription reader rather than a general vision model, which is
 * why the Lens uses it: it is trained on real scripts and handles a
 * clinician's handwriting far better than asking a chat model to squint at
 * one. One endpoint, one call, no model chain to fall through.
 *
 * Server-only. The key is read from process.env by the caller, never bundled,
 * and no VITE_ variant of it exists.
 *
 * Three things here were found against the live API rather than read in its
 * documentation, and all three would have shipped broken otherwise:
 *
 *   - The published endpoint is the apex domain, which answers 307 to the www
 *     host. Both fetch and curl drop an Authorization header across hosts, so
 *     following that redirect loses the key and the call fails as unauthorised
 *     for no visible reason. The www host is used directly.
 *   - The documented multipart field is `image`. The live API accepts only
 *     `prescription`, and answers anything else with "No file uploaded".
 *   - The documented response is a flat object with `medicines`, `doctor` and
 *     a `confidence` score. The live response is an envelope - success, type,
 *     metadata and a `data` object shaped quite differently - and carries no
 *     confidence score at all.
 */

/** The www host, deliberately. See the note above about the redirect. */
const ENDPOINT = "https://www.prescriptoai.com/api/v1/prescription/extract";

/** The multipart field the live API accepts. Not `image`. */
const FIELD = "prescription";

export type PrescriptoCall =
  | { ok: true; body: unknown }
  | { ok: false; error: string; status?: number };

/**
 * Catch a key that cannot work before spending a request on it.
 *
 * A pasted key often arrives wrapped in quotes or with a newline on the end,
 * and the failure that causes is a plain 401 that looks exactly like a wrong
 * key - so it is worth naming the difference.
 */
export function prescriptoKeyProblem(apiKey: string): string | null {
  if (!apiKey) return "Prescription Lens is not configured on this server.";
  if (apiKey !== apiKey.trim()) {
    return "The PrescriptoAI key has whitespace around it.";
  }
  if (/^["']|["']$/.test(apiKey)) {
    return "The PrescriptoAI key is wrapped in quotes.";
  }
  if (!apiKey.startsWith("sk_")) {
    return "The PrescriptoAI key does not look like one. It should begin with sk_.";
  }
  return null;
}

export type ReadOptions = {
  bytes: Uint8Array;
  mimeType: string;
  /** Only ever echoed back in the provider's metadata. Nothing is stored. */
  filename?: string;
  timeoutMs: number;
};

/**
 * Send one image and return whatever the provider made of it.
 *
 * The image is held in memory for the length of this call and nothing else: it
 * is not written to disk, not put in a bucket, and not logged. Errors are
 * logged by status and the provider's own message, never with the payload.
 */
export async function readPrescription(
  apiKey: string, options: ReadOptions,
): Promise<PrescriptoCall> {
  const form = new FormData();
  form.append(
    FIELD,
    new Blob([options.bytes as unknown as BlobPart], { type: options.mimeType }),
    options.filename ?? "prescription",
  );

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), options.timeoutMs);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: abort.signal,
      // The apex host redirects to www and the header would be dropped on the
      // way. Following a redirect here means the call has already gone wrong.
      redirect: "error",
    });

    const raw = await response.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message = (body as { message?: string } | null)?.message;
      console.error("[prescriptoai] read failed", response.status, message ?? raw.slice(0, 200));
      return { ok: false, status: response.status, error: message ?? `Request failed (${response.status}).` };
    }

    if (!body || (body as { success?: boolean }).success === false) {
      const message = (body as { message?: string } | null)?.message;
      console.error("[prescriptoai] read rejected", message ?? raw.slice(0, 200));
      return { ok: false, status: response.status, error: message ?? "The reader could not process that image." };
    }

    return { ok: true, body };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("[prescriptoai] read threw", aborted ? "timed out" : error);
    return {
      ok: false,
      error: aborted ? "The reader took too long to answer." : "Could not reach the reader.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** What the provider's own errors mean, in words a person can act on. */
export function readerFailureMessage(status?: number): { error: string; hint: string } {
  if (status === 401 || status === 403) {
    return {
      error: "Prescription Lens is not configured correctly.",
      hint: "The server's PrescriptoAI key was rejected.",
    };
  }
  if (status === 429) {
    return {
      error: "Prescription Lens has hit its limit for now.",
      hint: "The reader's monthly call allowance is used up. Try again later.",
    };
  }
  if (status === 413) {
    return {
      error: "That photo is too large to send.",
      hint: "Take it again at a lower resolution, or crop to the prescription itself.",
    };
  }
  return {
    error: "Could not read that image. Please try again.",
    hint: "If this keeps happening, check the server's PrescriptoAI key and allowance.",
  };
}
