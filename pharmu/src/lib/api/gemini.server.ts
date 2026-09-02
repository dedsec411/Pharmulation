/**
 * The shared Gemini transport.
 *
 * Lifted out of chat.functions.ts when the examiner needed it too. Everything
 * here was earned against the live API - the candidate ordering, the per-model
 * timeout, the auth short-circuit - and none of it is worth discovering twice.
 *
 * Server-only. The key is read from process.env inside the callers, never
 * bundled, and no VITE_ variant of it exists.
 */

/**
 * Ordered by measured latency and reliability against this project's key.
 *
 * gemini-2.0-flash leads because the examiner feature specifies it. The rest
 * stay behind it as fallbacks rather than being replaced: this chain was tuned
 * against real failures and a model that is fine today can answer 503
 * tomorrow, which is exactly what happened to `gemini-flash-latest` - it is
 * deliberately absent because it answers 503 after ~10s, or burns 30s and
 * returns no text, stalling the whole chain.
 */
export function modelCandidates() {
  return [
    process.env.GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
  ].filter((model, index, models): model is string =>
    Boolean(model) && models.indexOf(model) === index
  );
}

export function geminiKeyProblem(apiKey: string) {
  const trimmed = apiKey.trim();
  if (trimmed.length < 20 || trimmed.includes(" ")) {
    return "Your Gemini API key looks incomplete. Paste the full Google AI Studio API key into GEMINI_API_KEY, then restart the dev server.";
  }
  return null;
}

export type GeminiCallOptions = {
  systemPrompt: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  temperature: number;
  maxOutputTokens: number;
  json?: boolean;
};

/** Per-model ceiling, so one unresponsive upstream cannot hold a request open. */
const GEMINI_TIMEOUT_MS = 20_000;

/**
 * Try each candidate model in turn. Returns the first successful text, or an
 * error describing why none worked. Auth failures short-circuit, since
 * retrying other models with a bad key is pointless.
 */
export async function callGemini(apiKey: string, options: GeminiCallOptions): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const failures: string[] = [];

  for (const model of modelCandidates()) {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({
            system_instruction: { parts: [{ text: options.systemPrompt }] },
            contents: options.contents,
            generationConfig: {
              maxOutputTokens: options.maxOutputTokens,
              temperature: options.temperature,
              ...(options.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
        },
      );
    } catch (error) {
      // Timeout or network failure: try the next model rather than hanging.
      failures.push(`${model}: ${error instanceof Error ? error.name : "network error"}`);
      console.error("Gemini request failed", model, error);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      failures.push(`${model}: ${response.status}`);
      console.error("Gemini API error", model, response.status, errorText);
      const lowerError = errorText.toLowerCase();
      const authError =
        response.status === 401 ||
        response.status === 403 ||
        lowerError.includes("api_key_invalid") ||
        lowerError.includes("api key not valid");
      if (authError) {
        return {
          ok: false,
          error: "Gemini could not authenticate. Check that GEMINI_API_KEY matches the key in Google AI Studio and restart the server.",
        };
      }
      continue;
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string" && text.trim()) {
      return { ok: true, text };
    }
    failures.push(`${model}: empty response`);
  }

  return {
    ok: false,
    error: `Gemini could not respond. Tried: ${failures.join(", ") || "none"}.`,
  };
}
