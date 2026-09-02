import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { MENTOR_IMAGE } from "@/lib/mentor";

export type ErrorEntry = {
  timestamp: number;
  mode: string;
  errorType: string;
  wrongChoice: string;
  correctChoice?: string;
  whyWrong: string;
  whatToKnow: string;
  hint?: string;
  difficulty: string;
  forceShowCorrect?: boolean;
};

type Props = {
  entry: ErrorEntry | null;
  mentorTip?: string | null;
  onDismiss: () => void;
};

const AUTO_DISMISS_SEC = 15;

export function ErrorExplanationPanel({ entry, mentorTip, onDismiss }: Props) {
  const [count, setCount] = useState(AUTO_DISMISS_SEC);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setCount(AUTO_DISMISS_SEC);
    setExpanded(false);
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id);
          onDismiss();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [entry, onDismiss]);

  const showCorrect = entry && (entry.forceShowCorrect || entry.difficulty !== "hard");

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl"
            style={{ borderLeft: "4px solid #EF4444" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mentor avatar */}
            <div className="absolute right-4 top-4 flex flex-col items-end gap-1">
              <div className="grid size-12 place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10">
                <motion.img
                  src={MENTOR_IMAGE}
                  alt=""
                  className="h-14 w-12 object-contain object-top drop-shadow-[0_8px_14px_rgba(0,0,0,0.2)]"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">{count}s</span>
            </div>

            <div className="p-5 pr-16">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="size-5" />
                <h3 className="text-base font-bold uppercase tracking-wider">Wrong Selection</h3>
              </div>
              {entry.wrongChoice && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You chose: <span className="font-medium text-foreground">{entry.wrongChoice}</span>
                </p>
              )}

              <Section title="Why this is wrong" color="text-red-700 dark:text-red-300">
                {entry.whyWrong}
              </Section>

              <Section title="What you should know" color="text-amber-700 dark:text-amber-300">
                {entry.whatToKnow}
              </Section>

              {showCorrect && entry.correctChoice && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5" /> Correct answer
                  </p>
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-100">{entry.correctChoice}</p>
                </div>
              )}

              {!showCorrect && entry.hint && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <Sparkles className="size-3.5" /> Hint (Hard mode)
                  </p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-100">{entry.hint}</p>
                </div>
              )}

              {expanded && mentorTip && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mentor</p>
                  <p className="mt-1 text-sm">{mentorTip}</p>
                </motion.div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={onDismiss}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Got it, continue
                </button>
                {mentorTip && (
                  <button
                    onClick={() => setExpanded((x) => !x)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-4 py-2 text-xs font-medium hover:bg-muted"
                  >
                    <MessageCircle className="size-3.5" />
                    {expanded ? "Hide" : "Ask Mentor"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}:</p>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}
