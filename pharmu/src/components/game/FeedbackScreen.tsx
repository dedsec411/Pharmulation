import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Trophy, RotateCw, Home, CheckCircle2, XCircle, AlertCircle, GraduationCap } from "lucide-react";
import type { ErrorEntry } from "./ErrorExplanationPanel";
import { CaseCelebration } from "./CaseCelebration";
import { ClinicalExaminer } from "./ClinicalExaminer";
import { useSittingLock } from "@/lib/educator/assessment";
import { FailureDebrief } from "./FailureDebrief";
import { ContributeCase } from "@/components/lens/ContributeCase";
import { caseResultFrom, isFailure } from "@/lib/game/celebration";
import { hasExaminableContext, type ExaminerCaseContext } from "@/lib/game/examiner";

type Drug = { name: string; correct: boolean; info?: string };

type Props = {
  score: number;
  xpGain: number;
  timeTaken: number;
  mentorTip?: string | null;
  explanation?: string | null;
  drugs?: Drug[];
  breakdown?: { label: string; delta: number }[];
  errors?: ErrorEntry[];
  onNext: () => void;
  /** Named in the celebration where the mode produces something. */
  product?: { name: string; detail?: string };
  /**
   * Enables the optional viva. Omitted, the button simply does not appear and
   * nothing else about this screen changes.
   */
  examiner?: { caseRef: string; caseTitle: string; mode: string };
  /** Extra mode-specific review, rendered above the actions. */
  children?: ReactNode;
};

export function FeedbackScreen({ score, xpGain, timeTaken, mentorTip, explanation, drugs = [], breakdown = [], errors = [], onNext, product, examiner, children }: Props) {
  // Every mode renders its results through here, so the celebration lives here
  // too rather than being wired into five routes separately.
  const [celebrating, setCelebrating] = useState(true);
  // What the case actually produced, which decides both the tone of the
  // celebration and whether a debrief or a viva follows it.
  const result = caseResultFrom(errors.length, breakdown, drugs);
  const failed = isFailure(result);
  const [examining, setExamining] = useState(false);
  // Whether this case's viva has been sat. Also gates the mandatory auto-open,
  // so closing a finished viva does not immediately reopen it.
  const [examinerDone, setExaminerDone] = useState(false);

  // Everything the examiner asks about comes from what the modes already track:
  // the case, the medicines handled, and the in-game error log.
  const examinerContext: ExaminerCaseContext | null = examiner
    ? {
        caseRef: examiner.caseRef,
        caseTitle: examiner.caseTitle,
        mode: examiner.mode,
        score,
        timeTakenSec: Math.round(timeTaken),
        errors: errors.map((e) => ({
          errorType: e.errorType,
          wrongChoice: e.wrongChoice,
          correctChoice: e.correctChoice,
          whyWrong: e.whyWrong,
        })),
        drugs: drugs.map((d) => ({ name: d.name, correct: d.correct })),
      }
    : null;
  // A case with nothing specific to ask about would produce a generic viva,
  // which is worse than not offering one.
  //
  // Never during a timed sitting. The viva is an AI tutor that talks through
  // the reasoning of the case just played - exactly the coaching an
  // assessment is meant to withhold - and it would burn the candidate's clock
  // between cases while it did so.
  const sittingLocked = useSittingLock();
  const canExamine =
    !sittingLocked && examinerContext !== null && hasExaminableContext(examinerContext);

  // The viva is required, so it presents itself rather than waiting to be
  // chosen. It opens once the celebration is out of the way - two overlays at
  // once would just hide each other.
  useEffect(() => {
    if (canExamine && !celebrating && !examinerDone) setExamining(true);
  }, [canExamine, celebrating, examinerDone]);

  // A failed case gets the debrief instead of the viva. Being examined on
  // reasoning you have just been told was wrong is the wrong conversation, and
  // making someone sit both would turn a bad case into a long one.
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(score * (0.2 + 0.8 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AnimatePresence>
        {celebrating && (
          <CaseCelebration
            score={score}
            xpGain={xpGain}
            result={result}
            product={product}
            onDone={() => setCelebrating(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-primary" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Case complete</p>
            <h1 className="text-3xl font-bold">Score: {display}</h1>
            <p className="text-sm text-primary">+{xpGain} XP · {Math.floor(timeTaken)}s</p>
          </div>
        </div>

        {breakdown.length > 0 && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {breakdown.map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm">
                <span>{b.label}</span>
                <span className={b.delta >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                  {b.delta >= 0 ? "+" : ""}{b.delta}
                </span>
              </div>
            ))}
          </div>
        )}

        {drugs.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Drugs in this case</p>
            <ul className="space-y-2">
              {drugs.map((d) => (
                <li key={d.name} className="flex items-start gap-2 rounded-lg border border-border/30 bg-muted/20 p-3 text-sm">
                  {d.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
                  <div>
                    <p className="font-medium">{d.name}</p>
                    {d.info && <p className="text-xs text-muted-foreground">{d.info}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
              <AlertCircle className="size-4" /> Your mistakes this case ({errors.length})
            </p>
            <ul className="mt-3 space-y-2">
              {errors.map((e, i) => (
                <li key={i} className="rounded-lg border border-border/30 bg-background/40 p-3 text-xs">
                  <p className="font-semibold text-red-700 dark:text-red-300">{e.errorType}: {e.wrongChoice}</p>
                  <p className="mt-1 text-muted-foreground"><b className="text-foreground">Why:</b> {e.whyWrong}</p>
                  {e.correctChoice && (
                    <p className="mt-1 text-emerald-700 dark:text-emerald-300"><b>Correct:</b> {e.correctChoice}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The assessment briefing promises no mentor tips, so this has to be
            the thing that honours it, not just the hint button in the header. */}
        {mentorTip && !sittingLocked && (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mentor tip</p>
            <p className="mt-1">{mentorTip}</p>
          </div>
        )}
        {explanation && (
          <p className="mt-3 text-sm text-muted-foreground">{explanation}</p>
        )}

        {children}

        {/* Renders nothing unless this case came from a scan. */}
        <ContributeCase />

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <RotateCw className="size-4" /> Next case
          </button>
          {/* Sits beside Next case rather than in front of it: skipping the
              examiner costs the learner nothing at all. */}
          {/* The viva opens on its own; this reopens it for another go. Not
              offered after a failed case, which had a debrief instead. */}
          {canExamine && examinerDone && !failed && (
            <button
              onClick={() => setExamining(true)}
              className="inline-flex items-center gap-2 rounded-full border border-primary/45 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
            >
              <GraduationCap className="size-4" /> Face the Examiner again
            </button>
          )}
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold hover:bg-muted">
            <Home className="size-4" /> Dashboard
          </Link>
        </div>
      </motion.div>

      <AnimatePresence>
        {examining && examinerContext && (
          failed ? (
            <FailureDebrief
              context={examinerContext}
              onClose={() => { setExamining(false); setExaminerDone(true); }}
            />
          ) : (
            <ClinicalExaminer
              context={examinerContext}
              onClose={() => { setExamining(false); setExaminerDone(true); }}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
