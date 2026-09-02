import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GraduationCap, ArrowRight, Loader2, X as XIcon, CheckCircle2, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import {
  EXAMINERS, SCORE_AXES, QUESTIONS_PER_SESSION, axisAverages, bandFor,
  clinicalReasoningIndex, examinerByKey,
  type ExaminerCaseContext, type ExaminerQuestion, type GradedAnswer,
} from "@/lib/game/examiner";
import { generateExaminerQuestions, gradeExaminerSession } from "@/lib/api/examiner.functions";

/**
 * The viva that can follow a case.
 *
 * Entirely optional and entirely additive: it opens over the feedback screen,
 * and closing it at any point returns the learner exactly where they were with
 * nothing lost. A learner who never opens it sees no difference anywhere.
 *
 * examiner_sessions is newer than the checked-in Supabase types, which are
 * generated from the live schema, so the table is reached through one narrow
 * cast until those are regenerated.
 */
const examinerTable = () => (supabase as unknown as {
  from: (table: string) => any;
}).from("examiner_sessions");

type Stage = "choose" | "loading" | "asking" | "marking" | "result";

const ACCENT: Record<string, { ring: string; text: string; chip: string }> = {
  rose: { ring: "border-rose-400/50", text: "text-rose-300", chip: "bg-rose-400/10" },
  primary: { ring: "border-primary/50", text: "text-primary", chip: "bg-primary/10" },
  amber: { ring: "border-amber-400/50", text: "text-amber-300", chip: "bg-amber-400/10" },
};

export function ClinicalExaminer({
  context, onClose,
}: {
  context: ExaminerCaseContext;
  onClose: () => void;
}) {
  const { profile } = useAuthStore();
  const [stage, setStage] = useState<Stage>("choose");
  const [examiner, setExaminer] = useState<string>("hakim");
  const [questions, setQuestions] = useState<ExaminerQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [graded, setGraded] = useState<GradedAnswer[]>([]);
  const [overall, setOverall] = useState("");

  const chosen = examinerByKey(examiner);
  const accent = ACCENT[chosen.accent] ?? ACCENT.primary;

  async function begin(key: string) {
    setExaminer(key);
    setStage("loading");
    const result = await generateExaminerQuestions({ data: { examiner: key, context } });
    if (!result.ok || !result.questions.length) {
      toast.error(result.error ?? "The examiner is unavailable right now.");
      setStage("choose");
      return;
    }
    setQuestions(result.questions);
    setAnswers([]);
    setIndex(0);
    setDraft("");
    setStage("asking");
  }

  async function submitAnswer() {
    const next = [...answers, draft.trim()];
    setAnswers(next);
    setDraft("");

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }

    setStage("marking");
    const result = await gradeExaminerSession({
      data: {
        examiner,
        context,
        exchanges: questions.map((q, i) => ({
          questionId: q.id, question: q.question, answer: next[i] ?? "",
        })),
      },
    });

    if (!result.ok) {
      toast.error(result.error ?? "Could not mark your answers.");
      // Back to the last question rather than losing the whole session.
      setStage("asking");
      setAnswers(answers);
      setIndex(questions.length - 1);
      return;
    }

    setGraded(result.answers);
    setOverall(result.overall);
    setStage("result");
    void save(result.answers, result.overall, next);
  }

  /** Storing the result must never break the screen showing it. */
  async function save(marks: GradedAnswer[], summary: string, given: string[]) {
    if (!profile?.user_id) return;
    const averages = axisAverages(marks);
    try {
      const { error } = await examinerTable().insert({
        user_id: profile.user_id,
        case_ref: context.caseRef,
        case_title: context.caseTitle,
        mode: context.mode,
        examiner,
        questions,
        answers: marks.map((m, i) => ({ ...m, answer: given[i] ?? "" })),
        accuracy: averages.accuracy,
        reasoning: averages.reasoning,
        safety: averages.safety,
        communication: averages.communication,
        cri: clinicalReasoningIndex(marks),
        overall_feedback: summary,
      });
      if (error) throw error;
    } catch (error) {
      console.error("[supabase] could not save examiner session:", error);
      toast.error("Your result could not be saved to your profile.");
    }
  }

  const cri = clinicalReasoningIndex(graded);
  const band = bandFor(cri);
  const averages = axisAverages(graded);

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
        className="my-auto w-full max-w-2xl"
      >
        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                <GraduationCap className="size-3.5" /> Clinical reasoning examiner
              </p>
              <h2 className="mt-1 text-xl font-bold">{context.caseTitle}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Leave the examiner"
              className="rounded-full border border-border/50 p-1.5 text-muted-foreground transition hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {stage === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="mt-4 text-sm text-muted-foreground">
                  Three questions about the decisions you just made, answered in your own words.
                  Pick who examines you.
                </p>
                <div className="mt-4 grid gap-3">
                  {EXAMINERS.map((e) => {
                    const style = ACCENT[e.accent] ?? ACCENT.primary;
                    return (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => begin(e.key)}
                        className={`rounded-2xl border ${style.ring} ${style.chip} p-4 text-left transition hover:-translate-y-0.5`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className={`font-bold ${style.text}`}>{e.name}</p>
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            {e.style}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm">{e.tagline}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{e.blurb}</p>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 w-full rounded-full border border-border/50 px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Not now
                </button>
              </motion.div>
            )}

            {(stage === "loading" || stage === "marking") && (
              <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid place-items-center py-16 text-center">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {stage === "loading"
                    ? `${chosen.name} is reading your case…`
                    : `${chosen.name} is marking your answers…`}
                </p>
              </motion.div>
            )}

            {stage === "asking" && questions[index] && (
              <motion.div key={`q${index}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${accent.ring} ${accent.chip} ${accent.text}`}>
                    {chosen.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {index + 1} / {questions.length}
                  </span>
                </div>

                <p className="mt-3 text-lg font-semibold leading-snug">{questions[index].question}</p>

                <textarea
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="Answer in your own words. Explain why, not just what."
                  className="mt-4 w-full resize-y rounded-xl border border-border/40 bg-background/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/60"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    onClick={submitAnswer}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                  >
                    {index + 1 === questions.length ? "Submit for marking" : "Next question"}
                    <ArrowRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={submitAnswer}
                    className="rounded-full border border-border/50 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    Skip this one
                  </button>
                </div>
              </motion.div>
            )}

            {stage === "result" && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mt-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Clinical Reasoning Index
                  </p>
                  <p className="mt-1 text-5xl font-black tabular-nums">{cri}<span className="text-2xl text-muted-foreground">/100</span></p>
                  <p className={`mt-1 font-bold ${accent.text}`}>{band.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{band.note}</p>
                </div>

                <div className="mt-5 grid gap-2">
                  {SCORE_AXES.map((axis) => (
                    <div key={axis.key} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-xs text-muted-foreground">{axis.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${averages[axis.key] * 10}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">
                        {averages[axis.key]}
                      </span>
                    </div>
                  ))}
                </div>

                {overall && (
                  <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{chosen.name}</p>
                    <p className="mt-1">{overall}</p>
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {questions.map((q, i) => {
                    const mark = graded[i];
                    if (!mark) return null;
                    const total = SCORE_AXES.reduce((s, a) => s + mark.scores[a.key], 0);
                    return (
                      <div key={q.id} className="rounded-xl border border-border/40 bg-background/40 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold">{q.question}</p>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-primary">{total}/40</span>
                        </div>
                        {q.focus && <p className="mt-1 text-[11px] text-muted-foreground">Testing: {q.focus}</p>}
                        {mark.feedback && <p className="mt-2 text-xs text-muted-foreground">{mark.feedback}</p>}
                        {mark.modelAnswer && (
                          <p className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2.5 text-xs text-emerald-100">
                            <b className="text-emerald-300">A good answer:</b> {mark.modelAnswer}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                  >
                    <CheckCircle2 className="size-4" /> Done
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGraded([]); setOverall(""); setStage("choose"); }}
                    className="inline-flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
                  >
                    <RotateCw className="size-4" /> Another examiner
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {stage === "choose" && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Optional. {QUESTIONS_PER_SESSION} questions, about two minutes.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
