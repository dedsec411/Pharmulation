import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ArrowLeft, Gauge, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useModeTutorialTrigger } from "@/lib/use-mode-tutorial";
import { modeGuideKey } from "@/lib/tutorial";
import {
  DIFFICULTY_CONTENT,
  DIFFICULTY_LABEL,
  DIFFICULTY_RULES,
  MODE_LABEL,
  type Difficulty,
  type Mode,
} from "@/lib/game/shared";

/**
 * What each level actually changes, written from the table that changes it.
 *
 * The numbers are interpolated rather than typed out because this panel is the
 * only place a player is told what they are choosing, and a description that
 * has drifted from the behaviour is worse than none. Until recently there was
 * nothing to describe: difficulty moved the clock and the multipliers and
 * nothing else, so the three cards were three ways of scoring identical work.
 */
const OPTIONS: Array<{
  difficulty: Difficulty;
  icon: any;
  desc: string;
}> = [
  {
    difficulty: "easy",
    icon: Activity,
    desc: `25% more time and gentle penalties. ${DIFFICULTY_CONTENT.easy.cartons} consignments to check, ${DIFFICULTY_CONTENT.easy.auditScenarios} judgement calls, ${DIFFICULTY_CONTENT.easy.distractors} decoy on the bench, and every tolerance printed beside its control. After a mistake the mentor explains it and shows you the correct answer. Patients answer openly.`,
  },
  {
    difficulty: "medium",
    icon: Gauge,
    desc: `Standard time and scoring. ${DIFFICULTY_CONTENT.medium.cartons} consignments, ${DIFFICULTY_CONTENT.medium.auditScenarios} judgement calls, ${DIFFICULTY_CONTENT.medium.distractors} decoys, tolerances still shown. The mentor reveals the correct answer after a mistake. Patients answer what you ask, no more.`,
  },
  {
    difficulty: "hard",
    icon: ShieldAlert,
    desc: `15% less time, bigger rewards, harsher penalties. ${DIFFICULTY_CONTENT.hard.cartons} consignments, ${DIFFICULTY_CONTENT.hard.auditScenarios} judgement calls, ${DIFFICULTY_CONTENT.hard.distractors} decoys, and tolerances only in the batch record. The mentor explains why you were wrong but withholds the answer. Patients are vague and volunteer nothing.`,
  },
];

function storageKey(mode: Mode) {
  return `pharmulation:${mode}:difficulty`;
}

/**
 * @param onCancel where to go if the player backs out. Defaults to the mode
 *   list; Community passes its own so Back returns to the Rx/OTC picker.
 */
export function useDifficultyChoice(
  mode: Mode,
  onCancel?: () => void,
  /**
   * Which guide introduces this the first time, when it is not the mode's own.
   * The look-alike drill borrows the Rx timer and difficulty, but it is not an
   * Rx case, and the Rx/OTC overview in front of it would be the wrong lesson.
   * Null for none.
   */
  options?: { guideKey?: string | null },
) {
  const navigate = useNavigate();
  const openModeTutorial = useModeTutorialTrigger();
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
    // First time in this mode, the mentor explains it before they start
    // guessing at it. Fired from here rather than from the modes because this
    // is where the difficulty modal closes - the guide would otherwise open
    // behind it.
    openModeTutorial(options?.guideKey !== undefined ? options.guideKey : modeGuideKey(mode));
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
    // Was `cases!inner(difficulty)`, filtered on the joined column - an inner
    // join that only ever matched a score whose case_id points at a real row
    // in `cases`. Most cases are generated on the fly and persist with
    // case_id null, so on real data that join silently excluded roughly two
    // thirds of score history and this card read "None" for players with a
    // full week of play behind them. Difficulty is stored on the score row
    // itself now, so no join is needed at all.
    (supabase.from("scores") as any)
      .select("score")
      .eq("user_id", profile.user_id)
      .eq("mode", mode)
      .eq("difficulty", safeStored)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { score: number } | null }) => {
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
          // Scrolls itself: on a phone the three options are taller than the
          // screen, and a fixed layer that cannot scroll left Expert out of reach.
          className="fixed inset-0 z-[80] grid place-items-end overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"
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
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground max-sm:min-h-11 max-sm:px-4"
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
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary max-sm:text-[11px]">
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
