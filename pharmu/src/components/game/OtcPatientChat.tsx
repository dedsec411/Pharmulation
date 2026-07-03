import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Send } from "lucide-react";
import { sendChatMessage } from "@/lib/api/chat.functions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PatientInfo = {
  name?: string | null;
  age?: string | number | null;
  symptoms?: string | null;
  allergies?: string | null;
  current_meds?: string | null;
  medical_conditions?: string | null;
  scenario_dialogue?: string | null;
};

type ScriptedResponse = {
  key: string;
  patient: string;
};

const MAX_EXCHANGES = 15;

export function OtcPatientChat({
  ans,
  caseData,
  onComplete,
}: {
  ans: any;
  caseData: any;
  onComplete: () => void;
}) {
  const patientInfo = useMemo(() => buildPatientInfo(caseData, ans), [caseData, ans]);
  const scriptedResponses = useMemo(() => buildScriptedResponses(ans), [ans]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const exchangeCount = messages.filter((message) => message.role === "user").length;
  const limitReached = exchangeCount >= MAX_EXCHANGES;

  useEffect(() => {
    setMessages([{ role: "assistant", content: getOpeningLine(ans) }]);
    setInput("");
    setWaiting(false);
  }, [caseData?.id, ans]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || waiting || limitReached) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setWaiting(true);

    try {
      const result = await sendChatMessage({
        data: {
          messages: messagesForApi(nextMessages),
          context: "patient",
          patientInfo,
        },
      });
      const reply = shouldUseLocalFallback(result.reply)
        ? localPatientReply(content, patientInfo, scriptedResponses)
        : result.reply;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: localPatientReply(content, patientInfo, scriptedResponses) },
      ]);
    } finally {
      setWaiting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/25 bg-background/35 shadow-[0_0_34px_-24px_oklch(0.74_0.14_180/0.9)]">
      <div className="flex items-center justify-between gap-3 border-b border-primary/15 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/15">
            <MessageCircle className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Patient conversation</p>
            <p className="text-[11px] text-muted-foreground">Ask your own OTC assessment questions.</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          AI patient
        </span>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <motion.div
            key={`${message.role}-${index}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[84%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_oklch(0.74_0.14_180/0.95)]"
                  : "border border-border/40 bg-card/70 text-foreground"
              }`}
            >
              {message.content}
            </div>
          </motion.div>
        ))}

        {waiting && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-border/40 bg-card/70 px-4 py-3">
              <span className="size-2 animate-pulse rounded-full bg-primary" />
              <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
              <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-border/35 bg-background/60 p-3">
        {limitReached && (
          <p className="mb-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Conversation limit reached. Continue to recommendation when ready.
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={waiting || limitReached}
            placeholder="Ask the patient..."
            className="min-w-0 flex-1 rounded-full border border-border/45 bg-card/70 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={waiting || limitReached || !input.trim()}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110 disabled:opacity-45"
            aria-label="Send patient question"
          >
            <Send className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-[0_0_32px_-16px_oklch(0.74_0.14_180/0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90"
        >
          Continue to recommendation <ArrowRight className="size-4" />
        </button>
      </form>
    </div>
  );
}

function buildPatientInfo(caseData: any, ans: any): PatientInfo {
  const patient = caseData?.patient_info_json ?? {};
  return {
    name: patient.name ?? caseData?.title ?? "OTC patient",
    age: patient.age ?? "",
    symptoms: stringifyInfo(patient.symptoms ?? ans?.complaint ?? caseData?.title ?? "an OTC concern"),
    allergies: stringifyInfo(patient.allergies ?? patient.allergy ?? "none"),
    current_meds: stringifyInfo(patient.current_meds ?? patient.currentMeds ?? patient.medications ?? "none"),
    medical_conditions: stringifyInfo(patient.medical_conditions ?? patient.conditions ?? "none"),
    scenario_dialogue: buildScenarioDialogue(ans),
  };
}

function buildScenarioDialogue(ans: any) {
  const questions = Array.isArray(ans?.questions) ? ans.questions : [];
  const turns = questions.map((question: any) => {
    const correctIndex = Number(question?.correct ?? 0);
    const pharmacist = question?.choices?.[correctIndex] ?? question?.q ?? "Ask an appropriate OTC question.";
    const patient = question?.patient_response ?? question?.response ?? question?.answer ?? "Okay.";
    return `Pharmacist: ${pharmacist}\nPatient: ${patient}`;
  });
  const outcome = ans?.correct_drugs?.length
    ? `Outcome: recommend ${ans.correct_drugs.join(" or ")}.`
    : ans?.correct_drug
      ? `Outcome: recommend ${ans.correct_drug}.`
      : "";
  return [...turns, outcome].filter(Boolean).join("\n");
}

function buildScriptedResponses(ans: any): ScriptedResponse[] {
  const questions = Array.isArray(ans?.questions) ? ans.questions : [];
  return questions.map((question: any) => {
    const correctIndex = Number(question?.correct ?? 0);
    const pharmacist = String(question?.choices?.[correctIndex] ?? question?.q ?? "");
    return {
      key: classifyQuestion(pharmacist),
      patient: String(question?.patient_response ?? question?.response ?? question?.answer ?? "Okay."),
    };
  }).filter((item) => item.key && item.patient);
}

function localPatientReply(question: string, patientInfo: PatientInfo, scriptedResponses: ScriptedResponse[]) {
  const key = classifyQuestion(question);
  const scripted = scriptedResponses.find((response) => response.key === key);
  if (scripted) return scripted.patient;

  if (key === "symptoms" && patientInfo.symptoms) return patientInfo.symptoms;
  if (key === "history") {
    return `Allergies: ${patientInfo.allergies || "none"}. Current medicines: ${patientInfo.current_meds || "none"}. Medical conditions: ${patientInfo.medical_conditions || "none"}.`;
  }
  return "I'm not sure. Could you ask me that another way?";
}

function classifyQuestion(value: string) {
  const text = normalize(value);
  if (/\b(who|for|yourself|someone)\b/.test(text)) return "who";
  if (/\b(symptom|symptoms|having|feel|feeling|problem|pain|located|where)\b/.test(text)) return "symptoms";
  if (/\b(how long|started|start|duration|since|when)\b/.test(text)) return "duration";
  if (/\b(taken|tried|already|relieve|medicine yet|anything for)\b/.test(text)) return "prior_treatment";
  if (/\b(allerg|ulcer|liver|medical|condition|conditions|other medicines|current medicines|taking any)\b/.test(text)) return "history";
  return "";
}

function getOpeningLine(ans: any) {
  if (typeof ans?.opening_patient_line === "string" && ans.opening_patient_line.trim()) {
    return ans.opening_patient_line.trim();
  }
  return "Hi, I need some advice. Can you help me?";
}

function messagesForApi(messages: ChatMessage[]) {
  const firstQuestionIndex = messages.findIndex((message) => message.role === "user");
  return firstQuestionIndex === -1 ? messages : messages.slice(firstQuestionIndex);
}

function shouldUseLocalFallback(reply: string) {
  const text = reply.toLowerCase();
  return text.includes("gemini") || text.includes("api key") || text.includes("quota") || text.includes("not connected");
}

function stringifyInfo(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(String).join(", ");
  return String(value ?? "");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
