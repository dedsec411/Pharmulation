import { e as createServerRpc, c as createServerFn } from "./vendor-tanstack-Csp-bHi_.mjs";
import "../_libs/react.mjs";
import "../_libs/seroval.mjs";
import { o as objectType, s as stringType, e as enumType, u as unionType, n as numberType, l as literalType, a as arrayType } from "../_libs/zod.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const ChatMessageSchema = objectType({
  role: enumType(["user", "assistant"]),
  content: stringType().min(1).max(2e3)
});
const PatientInfoSchema = objectType({
  name: stringType().optional().nullable(),
  age: unionType([stringType(), numberType()]).optional().nullable(),
  symptoms: stringType().optional().nullable(),
  allergies: stringType().optional().nullable(),
  current_meds: stringType().optional().nullable()
}).optional();
function patientPrompt(patientInfo) {
  const name = patientInfo?.name || "the patient";
  const age = patientInfo?.age || "unknown age";
  const symptoms = patientInfo?.symptoms || "a pharmacy concern";
  const allergies = patientInfo?.allergies || "none stated";
  const currentMeds = patientInfo?.current_meds || "none stated";
  return `You are not a pharmacist, doctor, AI assistant, tutor, or mentor. You are roleplaying as ${name}, a ${age}-year-old patient speaking to a pharmacist in a real pharmacy. Your situation is: ${symptoms}. Speak naturally in simple patient language, with normal uncertainty and emotion. Do not teach, diagnose, recommend medicines, explain guidelines, or reveal the correct answer. Only answer the pharmacist's questions as the patient. Hidden details: allergies - ${allergies}; current medications - ${currentMeds}. Never volunteer hidden details unless the pharmacist specifically and appropriately asks about them. Keep replies brief, 1-3 sentences, and stay in character at all times.`;
}
function modelCandidates() {
  return [process.env.GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"].filter((model, index, models) => Boolean(model) && models.indexOf(model) === index);
}
function geminiKeyProblem(apiKey) {
  const trimmed = apiKey.trim();
  if (trimmed.length < 20 || trimmed.includes(" ")) {
    return "Your Gemini API key looks incomplete. Paste the full Google AI Studio API key into GEMINI_API_KEY, then restart the dev server.";
  }
  return null;
}
const sendChatMessage_createServerFn_handler = createServerRpc({
  id: "6998d5bda3c8f203fdc10234018043ebcfba19eaea0dab1a9b324f1a8d498e87",
  name: "sendChatMessage",
  filename: "src/lib/api/chat.functions.ts"
}, (opts) => sendChatMessage.__executeServer(opts));
const sendChatMessage = createServerFn({
  method: "POST"
}).validator(objectType({
  messages: arrayType(ChatMessageSchema).min(1).max(30),
  context: literalType("patient"),
  patientInfo: PatientInfoSchema
})).handler(sendChatMessage_createServerFn_handler, async ({
  data
}) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      reply: "I am not connected to Gemini yet. Please add GEMINI_API_KEY on the server."
    };
  }
  const keyProblem = geminiKeyProblem(GEMINI_API_KEY);
  if (keyProblem) {
    return {
      reply: keyProblem
    };
  }
  const systemPromptString = patientPrompt(data.patientInfo);
  const failures = [];
  try {
    for (const model of modelCandidates()) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: systemPromptString
            }]
          },
          contents: data.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{
              text: m.content
            }]
          })),
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.8
          }
        })
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        failures.push(`${model}: ${response.status}`);
        console.error("Gemini API error", model, response.status, errorText);
        const lowerError = errorText.toLowerCase();
        const authError = response.status === 401 || response.status === 403 || lowerError.includes("api_key_invalid") || lowerError.includes("api key not valid");
        if (authError) {
          return {
            reply: "Gemini could not authenticate. Please check that GEMINI_API_KEY matches the key shown in Google AI Studio and restart the dev server."
          };
        }
        continue;
      }
      const result = await response.json();
      const reply = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I could not respond right now.";
      return {
        reply
      };
    }
    return {
      reply: `Gemini could not respond with the available models. Tried: ${failures.join(", ") || "none"}. Check your Gemini quota/billing or set GEMINI_MODEL to a model enabled on your API key.`
    };
  } catch (error) {
    console.error("Gemini chat failed", error);
    return {
      reply: "Gemini is not reachable from the server right now. Check your internet connection and try again."
    };
  }
});
export {
  sendChatMessage_createServerFn_handler
};
