import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, RotateCw, Sparkles, X as XIcon } from "lucide-react";
import { buildQuiz, type QuizQuestion, type StudyDrug } from "@/lib/drug-study";

/**
 * One question at a time, answered and marked immediately.
 *
 * The previous quiz listed every question on one page and scored the lot on
 * submit, so feedback arrived long after the thinking had happened. Marking
 * each answer as it is given puts the explanation next to the decision that
 * earned it, which is the whole point of an explanation.
 */

const QUESTION_COUNT = 10;

const KIND_LABEL: Record<QuizQuestion["kind"], string> = {
  indication: "Indication",
  class: "Drug class",
  sideEffect: "Side effect",
  contraindication: "Contraindication",
  category: "Category",
};

type Answered = { question: QuizQuestion; chosen: string; correct: boolean };

export function DrugQuiz({ drugs, pool }: { drugs: StudyDrug[]; pool: StudyDrug[] }) {
  const [round, setRound] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => buildQuiz(drugs, pool, QUESTION_COUNT), [drugs, pool, round]);

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [history, setHistory] = useState<Answered[]>([]);

  const question = questions[index];
  const finished = index >= questions.length;
  const score = history.filter((h) => h.correct).length;

  function answer(option: string) {
    if (chosen || !question) return;
    setChosen(option);
    setHistory((h) => [...h, { question, chosen: option, correct: option === question.correct }]);
  }

  function next() {
    setChosen(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setHistory([]);
    setChosen(null);
    setIndex(0);
    setRound((r) => r + 1);
  }

  // Number keys pick an option, Enter moves on - a quiz is faster with hands
  // on the keyboard than reaching for the mouse each time.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (finished || !question) return;
      if (!chosen) {
        const n = Number(event.key);
        if (n >= 1 && n <= question.options.length) answer(question.options[n - 1]);
      } else if (event.key === "Enter") {
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (questions.length === 0) {
    return (
      <div className="mt-6 glass-card p-10 text-center text-muted-foreground">
        Not enough detail in this selection to build a quiz. Try the whole catalogue.
      </div>
    );
  }

  if (finished) {
    const missed = history.filter((h) => !h.correct);
    const pct = Math.round((score / history.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-6 max-w-2xl space-y-4"
      >
        <div className="glass-card p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Quiz complete</p>
          <p className="mt-3 text-5xl font-black tabular-nums">{score}<span className="text-2xl text-muted-foreground">/{history.length}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">
            {pct === 100 ? "Every one right." : pct >= 70 ? "Solid round - review what slipped." : "Worth another pass through these."}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <button
            onClick={restart}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
          >
            <RotateCw className="size-4" /> New quiz
          </button>
        </div>

        {missed.length > 0 && (
          <div className="glass-card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What to revisit ({missed.length})
            </p>
            <ul className="mt-3 space-y-3">
              {missed.map((m) => (
                <li key={m.question.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
                  <p className="text-sm font-semibold">{m.question.question}</p>
                  <p className="mt-1 text-xs text-destructive">You said: {m.chosen}</p>
                  <p className="text-xs text-primary">Answer: {m.question.correct}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.question.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      {/* Progress reads as position in the round, not just a number. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <p className="text-xs font-semibold tabular-nums text-primary">{score} correct</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${(index / questions.length) * 100}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="glass-card mt-4 p-6"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="size-3" /> {KIND_LABEL[question.kind]}
          </span>
          <h3 className="mt-3 text-lg font-bold leading-snug">{question.question}</h3>

          <div className="mt-4 grid gap-2">
            {question.options.map((option, i) => {
              const isChosen = chosen === option;
              const isCorrect = option === question.correct;
              const reveal = chosen !== null;
              return (
                <button
                  key={option}
                  disabled={reveal}
                  onClick={() => answer(option)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    reveal && isCorrect
                      ? "border-emerald-400/70 bg-emerald-400/10"
                      : reveal && isChosen
                        ? "border-rose-400/70 bg-rose-400/10"
                        : reveal
                          ? "border-border/30 opacity-55"
                          : "border-border/40 hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border/40 text-[11px] font-bold text-muted-foreground">
                    {reveal && isCorrect ? <Check className="size-3.5 text-emerald-400" />
                      : reveal && isChosen ? <XIcon className="size-3.5 text-rose-400" />
                      : i + 1}
                  </span>
                  <span className="min-w-0">{option}</span>
                </button>
              );
            })}
          </div>

          {chosen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden"
            >
              <div className={`rounded-xl border p-3 text-sm ${
                chosen === question.correct
                  ? "border-emerald-400/35 bg-emerald-400/10"
                  : "border-rose-400/35 bg-rose-400/10"
              }`}>
                <p className="text-xs font-bold uppercase tracking-wider">
                  {chosen === question.correct ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1 text-muted-foreground">{question.explanation}</p>
              </div>
              <button
                onClick={next}
                className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
              >
                {index + 1 === questions.length ? "See results" : "Next question"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {!chosen && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Press 1-{question.options.length} to answer
        </p>
      )}
    </div>
  );
}
