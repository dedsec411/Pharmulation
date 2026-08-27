import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api/chat.functions";
import { MENTOR_IMAGE } from "@/lib/mentor";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_EXCHANGES = 15;
const OPENING_MESSAGE = "Hi, I am Dr. Hakim, your pharmacy AI mentor. Ask me about medicines, doses, counseling, interactions, calculations, compounding, or study help.";

export function PharmacistChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const context = "mentor" as const;
  const title = "Dr. Hakim";
  const subtitle = "Pharmacy AI mentor";
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
    if (!open) return;
    setMessages((current) => current.length
      ? current
      : [{ role: "assistant", content: OPENING_MESSAGE }]);
  }, [open]);

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
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/30 bg-background/55 shadow-[0_0_20px_-8px_oklch(0.74_0.14_180/0.9)]">
                <img
                  src={MENTOR_IMAGE}
                  alt=""
                  className="h-16 w-14 object-contain object-top drop-shadow-[0_8px_14px_rgba(0,0,0,0.28)]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  Mentor chat
                </p>
                <h2 className="mt-1 text-lg font-black leading-none">{title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              </div>
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
                Ask Dr. Hakim any pharmacy question: drug therapy, OTC counseling, interactions, dosing, calculations, formulations, or exam practice.
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
                placeholder="Ask Dr. Hakim..."
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

function messagesForApi(messages: ChatMessage[]) {
  const firstQuestionIndex = messages.findIndex((message) => message.role === "user");
  return firstQuestionIndex === -1 ? messages : messages.slice(firstQuestionIndex);
}
