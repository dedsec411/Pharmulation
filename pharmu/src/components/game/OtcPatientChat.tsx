import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, MessageCircle, RotateCcw, Send } from "lucide-react";
import { sendChatMessage } from "@/lib/api/chat.functions";
import type { OtcCase } from "@/lib/game/otc-cases";
import type { Difficulty } from "@/lib/game/shared";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Gemini requires the conversation to start with a user turn, so drop the
 * patient's opening line. It comes from the case facts in the system prompt
 * anyway, so no context is lost.
 */
function forApi(messages: ChatMessage[]) {
  const firstUser = messages.findIndex((message) => message.role === "user");
  return firstUser === -1 ? messages : messages.slice(firstUser);
}

/**
 * Backstop so the typing indicator can never spin forever. The server has its
 * own per-model timeout, but a request that dies in transit (stale dev server,
 * dropped connection) would otherwise leave a promise that never settles.
 */
const REPLY_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

/** Questions asked, not messages: how many chances the pharmacist gets. */
const MAX_QUESTIONS: Record<Difficulty, number> = {
  easy: 14,
  medium: 11,
  hard: 9,
};

export function OtcPatientChat({
  otcCase,
  difficulty,
  messages,
  setMessages,
  onComplete,
}: {
  otcCase: OtcCase;
  difficulty: Difficulty;
  messages: ChatMessage[];
  setMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void;
  onComplete: () => void;
}) {
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const maxQuestions = MAX_QUESTIONS[difficulty] ?? MAX_QUESTIONS.medium;
  const asked = messages.filter((message) => message.role === "user").length;
  const remaining = Math.max(0, maxQuestions - asked);
  const limitReached = remaining === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting, error]);

  async function ask(question: string) {
    setWaiting(true);
    setError(null);

    const history: ChatMessage[] = [...messages, { role: "user", content: question }];

    try {
      const result = await withTimeout(sendChatMessage({
        data: {
          messages: forApi(history),
          context: "patient",
          caseFacts: {
            name: otcCase.patient.name,
            age: otcCase.patient.age,
            manner: otcCase.patient.manner,
            who: otcCase.hidden.who,
            what: otcCase.hidden.what,
            howLong: otcCase.hidden.howLong,
            action: otcCase.hidden.action,
            medication: otcCase.hidden.medication,
            allergies: otcCase.hidden.allergies,
            conditions: otcCase.hidden.conditions,
            extra: otcCase.hidden.extra ?? [],
            difficulty,
          },
        },
      }), REPLY_TIMEOUT_MS);

      if (!result.ok) {
        // No scripted stand-in: a canned reply would teach the wrong lesson.
        setError(result.reply);
        setLastFailed(question);
        return;
      }

      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
      setLastFailed(null);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "timeout"
          ? "The patient took too long to respond. If this keeps happening, restart the dev server."
          : "Could not reach the patient. Check your connection and try again.",
      );
      setLastFailed(question);
    } finally {
      setWaiting(false);
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || waiting || limitReached) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content }]);
    await ask(content);
  }

  async function retry() {
    if (!lastFailed || waiting) return;
    await ask(lastFailed);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/25 bg-background/35 shadow-[0_0_34px_-24px_oklch(0.74_0.14_180/0.9)]">
      <div className="flex items-center justify-between gap-3 border-b border-primary/15 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/15">
            <MessageCircle className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              {otcCase.patient.name}, {otcCase.patient.age}
            </p>
            <p className="text-[11px] text-muted-foreground">Take the history in your own words.</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            remaining <= 2
              ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
              : "border-primary/25 bg-primary/10 text-primary"
          }`}
        >
          {remaining} question{remaining === 1 ? "" : "s"} left
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

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="leading-relaxed">{error}</p>
              {lastFailed && (
                <button
                  type="button"
                  onClick={retry}
                  disabled={waiting}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1 font-bold transition hover:bg-destructive/15 disabled:opacity-50"
                >
                  <RotateCcw className="size-3" /> Retry
                </button>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-border/35 bg-background/60 p-3">
        {limitReached && (
          <p className="mb-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            No questions left. Continue to your recommendation.
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={waiting || limitReached}
            placeholder="Ask the patient a question..."
            className="min-w-0 flex-1 rounded-full border border-border/45 bg-card/70 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={waiting || limitReached || !input.trim()}
            className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110 disabled:opacity-45"
            aria-label="Send question to patient"
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
