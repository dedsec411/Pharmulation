import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Stethoscope, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ExaminerCaseContext } from "@/lib/game/examiner";
import { answerDebrief, askDebriefQuestion } from "@/lib/api/examiner.functions";

/**
 * The conversation after a failed case.
 *
 * Deliberately not the examiner. Failing and being dropped straight onto a
 * scoresheet leaves the worst moment of the session as the emptiest one, so a
 * senior colleague asks what happened instead: one question, one answer, one
 * reply. No marks and no personalities - a learner who has just failed does not
 * need a second number telling them so, or a choice of who delivers it.
 *
 * It cannot be dismissed until answered, for the same reason the viva cannot,
 * and it lets the learner past if the model is unreachable, for the same reason
 * too - a required step that is broken must not strand anyone.
 */

type Stage = "asking" | "loading" | "replying" | "done" | "unavailable";

export function FailureDebrief({
  context, onClose,
}: {
  context: ExaminerCaseContext;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");
  const [problem, setProblem] = useState("");

  // Guards React's double-invoked effects in development from asking twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const result = await askDebriefQuestion({ data: { context } });
      if (!result.ok || !result.question) {
        setProblem(result.error ?? "Could not reach your colleague.");
        setStage("unavailable");
        return;
      }
      setQuestion(result.question);
      setStage("asking");
    })();
  }, [context]);

  async function send() {
    const said = draft.trim();
    setStage("replying");
    const result = await answerDebrief({ data: { context, question, answer: said } });
    if (!result.ok || !result.reply) {
      setProblem(result.error ?? "Could not reach your colleague.");
      setStage("unavailable");
      return;
    }
    setReply(result.reply);
    setStage("done");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-background/85 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="my-auto w-full max-w-xl"
      >
        <div className="glass-card p-6">
          <div className="border-b border-border/40 pb-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
              <Stethoscope className="size-3.5" /> A word with your supervisor
            </p>
            <h2 className="mt-1 text-xl font-bold">{context.caseTitle}</h2>
          </div>

          <AnimatePresence mode="wait">
            {(stage === "loading" || stage === "replying") && (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid place-items-center py-14 text-center">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {stage === "loading" ? "They are looking over your case…" : "Thinking about what you said…"}
                </p>
              </motion.div>
            )}

            {stage === "asking" && (
              <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p className="mt-5 text-lg font-semibold leading-snug">{question}</p>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Say it however you like. Nothing here is marked."
                  className="mt-4 w-full resize-y rounded-xl border border-border/40 bg-background/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/60"
                />
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={send}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                >
                  Tell them <ArrowRight className="size-4" />
                </button>
              </motion.div>
            )}

            {stage === "done" && (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  You said
                </p>
                <p className="mt-1 rounded-xl border border-border/40 bg-background/40 p-3 text-sm text-muted-foreground">
                  {draft.trim()}
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">They said</p>
                <p className="mt-1 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">{reply}</p>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  <CheckCircle2 className="size-4" /> Got it
                </button>
              </motion.div>
            )}

            {stage === "unavailable" && (
              <motion.div key="unavailable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                <p className="text-sm font-semibold">Your supervisor is not around right now.</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{problem}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Continue to the breakdown
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
