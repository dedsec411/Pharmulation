import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api/chat.functions";
import { useActiveCaseStore } from "@/lib/active-case-store";

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
};

const MAX_EXCHANGES = 15;
const PRACTICE_PATIENT: PatientInfo = {
  name: "Ayesha Khan",
  age: 32,
  symptoms: "blocked nose, sore throat, dry cough, and feeling tired for the last 2 days",
  allergies: "penicillin caused a rash once",
  current_meds: "metformin 500 mg twice daily and occasional paracetamol",
};

export function PharmacistChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeCase = useActiveCaseStore((state) => state.caseData);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const isGame = pathname.includes("/game/");
  const patientInfo = useMemo(() => extractPatientInfo(activeCase), [activeCase]);
  const conversationKey = `${pathname}:${activeCase?.id ?? "practice"}`;
  const context = "patient" as const;
  const title = patientInfo.name || "Patient";
  const subtitle = isGame && activeCase ? "Case patient" : "Practice patient";
  const exchangeCount = messages.filter((message) => message.role === "user").length;
  const limitReached = exchangeCount >= MAX_EXCHANGES;

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setWaiting(false);
    }
  }, [open]);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setWaiting(false);
  }, [conversationKey]);

  useEffect(() => {
    if (!open) return;
    setMessages((current) => current.length
      ? current
      : [{ role: "assistant", content: openingLine(patientInfo) }]);
  }, [open, conversationKey, patientInfo]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting, open]);

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
          context,
          patientInfo,
        },
      });
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Sorry, I could not respond right now." }]);
    } finally {
      setWaiting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="glass-card fixed bottom-24 left-5 z-[60] flex h-[min(620px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden border-primary/35 bg-background/90 shadow-[0_24px_70px_-26px_oklch(0.74_0.14_180/0.95)]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/40 bg-primary/10 p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                Patient chat
              </p>
              <h2 className="mt-1 text-lg font-black leading-none">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border/50 p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-border/35 bg-card/45 p-4 text-sm text-muted-foreground">
                Ask the patient focused questions about symptoms, allergies, current medicines, red flags, and expectations.
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_oklch(0.74_0.14_180/0.95)]"
                      : "glass-card border-border/40 bg-card/65 text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {waiting && (
              <div className="flex justify-start">
                <div className="glass-card flex items-center gap-1.5 border-border/40 bg-card/65 px-4 py-3">
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                  <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="border-t border-border/40 bg-background/70 p-3">
            {limitReached && (
              <p className="mb-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                Conversation limit reached, refresh to start a new chat
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
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function extractPatientInfo(caseData: any): PatientInfo {
  if (!caseData) return PRACTICE_PATIENT;

  const patient = caseData?.patient_info_json ?? {};
  const symptoms = patient.symptoms ?? patient.complaint ?? patient.presenting_complaint ?? patient.diagnosis ?? caseData?.title ?? "";
  const meds = patient.current_meds ?? patient.currentMeds ?? patient.medications ?? patient.home_meds ?? "";
  return {
    name: patient.name ?? caseData?.electronic_prescription_json?.patient ?? "Patient",
    age: patient.age ?? "",
    symptoms: stringifyInfo(symptoms),
    allergies: stringifyInfo(patient.allergies ?? patient.allergy ?? "none"),
    current_meds: stringifyInfo(meds || "none"),
  };
}

function openingLine(patientInfo: PatientInfo) {
  const symptomText = patientInfo.symptoms || "a problem I wanted to ask about";
  return `Hi, I wanted to ask about ${symptomText}. Can you help me?`;
}

function messagesForApi(messages: ChatMessage[]) {
  const firstQuestionIndex = messages.findIndex((message) => message.role === "user");
  return firstQuestionIndex === -1 ? messages : messages.slice(firstQuestionIndex);
}

function stringifyInfo(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(String).join(", ");
  return String(value ?? "");
}
