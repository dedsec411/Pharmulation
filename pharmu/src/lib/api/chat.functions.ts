import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const PatientInfoSchema = z.object({
  name: z.string().optional().nullable(),
  age: z.union([z.string(), z.number()]).optional().nullable(),
  symptoms: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  current_meds: z.string().optional().nullable(),
}).optional();

function patientPrompt(patientInfo?: z.infer<typeof PatientInfoSchema>) {
  const name = patientInfo?.name || "the patient";
  const age = patientInfo?.age || "unknown age";
  const symptoms = patientInfo?.symptoms || "a pharmacy concern";
  const allergies = patientInfo?.allergies || "none stated";
  const currentMeds = patientInfo?.current_meds || "none stated";
  return `You are not a pharmacist, doctor, AI assistant, tutor, or mentor. You are roleplaying as ${name}, a ${age}-year-old patient speaking to a pharmacist in a real pharmacy. Your situation is: ${symptoms}. Speak naturally in simple patient language, with normal uncertainty and emotion. Do not teach, diagnose, recommend medicines, explain guidelines, or reveal the correct answer. Only answer the pharmacist's questions as the patient. Hidden details: allergies - ${allergies}; current medications - ${currentMeds}. Never volunteer hidden details unless the pharmacist specifically and appropriately asks about them. Keep replies brief, 1-3 sentences, and stay in character at all times.`;
}

function modelCandidates() {
  return [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((model, index, models): model is string =>
    Boolean(model) && models.indexOf(model) === index
  );
}

function geminiKeyProblem(apiKey: string) {
  const trimmed = apiKey.trim();
  if (trimmed.length < 20 || trimmed.includes(" ")) {
    return "Your Gemini API key looks incomplete. Paste the full Google AI Studio API key into GEMINI_API_KEY, then restart the dev server.";
  }
  return null;
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator(z.object({
    messages: z.array(ChatMessageSchema).min(1).max(30),
    context: z.literal("patient"),
    patientInfo: PatientInfoSchema,
  }))
  .handler(async ({ data }) => {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { reply: "I am not connected to Gemini yet. Please add GEMINI_API_KEY on the server." };
    }
    const keyProblem = geminiKeyProblem(GEMINI_API_KEY);
    if (keyProblem) {
      return { reply: keyProblem };
    }

    const systemPromptString = patientPrompt(data.patientInfo);

    const failures: string[] = [];
    try {
      for (const model of modelCandidates()) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPromptString }],
              },
              contents: data.messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.8,
              },
            }),
          },
        );

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
            return { reply: "Gemini could not authenticate. Please check that GEMINI_API_KEY matches the key shown in Google AI Studio and restart the dev server." };
          }
          continue;
        }

        const result = await response.json();
        const reply = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I could not respond right now.";
        return { reply };
      }

      return {
        reply: `Gemini could not respond with the available models. Tried: ${failures.join(", ") || "none"}. Check your Gemini quota/billing or set GEMINI_MODEL to a model enabled on your API key.`,
      };
    } catch (error) {
      console.error("Gemini chat failed", error);
      return { reply: "Gemini is not reachable from the server right now. Check your internet connection and try again." };
    }
  });
