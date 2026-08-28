import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowLeft, Gauge, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_RULES,
  MODE_LABEL,
  type Difficulty,
  type Mode,
} from "@/lib/game/shared";

const OPTIONS: Array<{
  difficulty: Difficulty;
  icon: any;
  desc: string;
}> = [
  // Descriptions state what actually changes, so the choice is informed:
  // time allowed, scoring weights, how much the mentor reveals after a
  // mistake, and how forthcoming the AI patient is in OTC.
  {
    difficulty: "easy",
    icon: Activity,
    desc: "25% more time. Gentle penalties. After a mistake the mentor explains it and shows you the correct answer. Patients answer openly.",
  },
  {
    difficulty: "medium",
    icon: Gauge,
    desc: "Standard time and scoring. The mentor still reveals the correct answer after a mistake. Patients answer what you ask, no more.",
  },
  {
    difficulty: "hard",
    icon: ShieldAlert,
    desc: "15% less time. Bigger rewards, harsher penalties. The mentor explains why you were wrong but withholds the answer. Patients are vague and volunteer nothing.",
  },
];

function storageKey(mode: Mode) {
  return `pharmulation:${mode}:difficulty`;
}

/**
 * @param onCancel where to go if the player backs out. Defaults to the mode
 *   list; Community passes its own so Back returns to the Rx/OTC picker.
 */
export function useDifficultyChoice(mode: Mode, onCancel?: () => void) {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setDifficulty(null);
    setOpen(true);
  }, [mode]);

  function choose(next: Difficulty) {
    localStorage.setItem(storageKey(mode), next);
    setDifficulty(next);
    setOpen(false);
  }

  function cancel() {
    if (onCancel) onCancel();
    else navigate({ to: "/modes" });
  }

  return {
    difficulty,
    difficultyModal: (
      <DifficultySelectModal
        mode={mode}
        open={open}
        onChoose={choose}
        onCancel={cancel}
      />
    ),
  };
}

function DifficultySelectModal({
  mode,
  open,
  onChoose,
  onCancel,
}: {
  mode: Mode;
  open: boolean;
  onChoose: (difficulty: Difficulty) => void;
  onCancel: () => void;
}) {
  const { profile } = useAuthStore();
  const [lastDifficulty, setLastDifficulty] = useState<Difficulty | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  // Escape backs out, the same as the Back button and the backdrop.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(storageKey(mode));
    const safeStored =
      stored === "easy" || stored === "medium" || stored === "hard"
        ? stored
        : null;
    setLastDifficulty(safeStored);
    setLastScore(null);

    if (!profile?.user_id || !safeStored) return;
    supabase
      .from("scores")
      .select("score, cases!inner(difficulty)")
      .eq("user_id", profile.user_id)
      .eq("mode", mode)
      .eq("cases.difficulty", safeStored)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setLastScore(typeof data?.score === "number" ? data.score : null);
      });
  }, [mode, open, profile?.user_id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-2xl rounded-2xl border border-border/40 bg-card p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {MODE_LABEL[mode]}
                </p>
                <h2 className="mt-1 text-2xl font-bold">Choose difficulty</h2>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-right text-xs">
                <p className="text-muted-foreground">Last played</p>
                <p className="font-semibold">
                  {lastDifficulty ? DIFFICULTY_LABEL[lastDifficulty] : "None"}
                  {lastScore != null ? ` · ${lastScore} pts` : ""}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {OPTIONS.map(({ difficulty: d, icon: Icon, desc }) => {
                const rules = DIFFICULTY_RULES[d];
                const selected = lastDifficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChoose(d)}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 ${
                      selected ? "border-primary/50 bg-primary/10" : "border-border/40 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="size-5 text-primary" />
                      {selected && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                          Last
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-lg font-bold">{DIFFICULTY_LABEL[d]}</h3>
                    <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                    <div className="mt-3 rounded-lg bg-background/40 p-2 text-[11px] text-muted-foreground">
                      <p>Rewards x{rules.rewardMultiplier}</p>
                      <p>Penalties x{rules.penaltyMultiplier}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
