import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, ScanSearch, ShieldAlert } from "lucide-react";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useTimer } from "@/lib/game/useTimer";
import { useAuthStore } from "@/lib/auth-store";
import { useGameExit } from "@/lib/game/useGameExit";
import {
  computeScoreFromPoints, liveScoreFromPoints, modeTimeLimit, retryRewardFactor,
  submitScore, toastScore,
} from "@/lib/game/shared";
import { buildLookalikeDrill, explainWrongPack, type ShelfPack } from "@/lib/game/lookalike-case";
import { BRANDS_SCANNED, LOOKALIKE_PAIRS } from "@/lib/game/lookalike-pairs";

/**
 * The look-alike drill.
 *
 * A prescription names one brand and the shelf holds another whose name is one
 * or two letters away. That is all it asks, and it is the point: the error
 * being modelled is a reading error, not a knowledge one, and it is among the
 * commonest ways a dispensing mistake reaches a patient.
 *
 * It opens on the finding rather than on a case, because the finding is the
 * reason the drill exists - these pairs were measured out of this catalogue,
 * and a learner should see the size of the problem before being asked to work
 * it.
 *
 * Scored and stored as Rx. Handing over the right pack against a written
 * prescription is community dispensing, and giving it a mode of its own would
 * have meant a new value in a Postgres enum for no gain.
 */

const CROSS_CLASS = LOOKALIKE_PAIRS.filter((p) => p.crossClass).length;

export function LookalikeDrill({ onBack }: { onBack: () => void }) {
  const onExit = useGameExit("/modes");
  const { profile } = useAuthStore();
  const { difficulty, difficultyModal } = useDifficultyChoice("rx", onBack);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [errors, setErrors] = useState(0);
  const [tried, setTried] = useState<Record<number, string[]>>({});
  const [result, setResult] = useState<{ score: number; xpGain: number } | null>(null);

  const questions = useMemo(
    () => (difficulty ? buildLookalikeDrill(`${profile?.user_id ?? "guest"}:${Date.now()}`, difficulty) : []),
    // Built once per run: a new shelf appearing mid-decision would invalidate
    // the answer being reasoned about.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty],
  );

  const LIMIT = modeTimeLimit("rx", difficulty);
  const timer = useTimer(LIMIT, () => !result && finish(true));
  const errPanel = useErrorPanel({ mode: "rx", difficulty, setExternalPaused: timer.setExternalPaused });

  if (!difficulty) return <>{difficultyModal}</>;
  if (result) {
    return (
      <FeedbackScreen
        score={result.score}
        xpGain={result.xpGain}
        timeTaken={timer.taken}
        mentorTip="Two brand names a letter apart are picked up for each other every day. Read the generic on the pack against the prescription before it leaves the counter."
        explanation={`${questions.length} look-alike pairs, drawn from the ${LOOKALIKE_PAIRS.length} found in this catalogue.`}
        breakdown={[{ label: "Packs handed over correctly", delta: Math.max(0, points) }, { label: "Wrong pack reached for", delta: -errors * 10 }]}
        errors={errPanel.errors}
        examiner={{ caseRef: "lookalike", caseTitle: "Look-alike brand names", mode: "rx" }}
        onNext={onBack}
      />
    );
  }

  if (!started) return <Briefing onStart={() => setStarted(true)} onBack={onBack} />;

  const question = questions[index];
  if (!question) return null;
  const ruledOut = tried[index] ?? [];

  async function finish(timedOut: boolean, extraPoints = 0) {
    const score = computeScoreFromPoints({
      difficulty, hintsUsed: 0, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
      points: points + extraPoints,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: null, mode: "rx", difficulty,
      score, timeTaken: timer.taken, errors,
      correctDrugs: Math.max(0, questions.length - errors), totalDrugs: questions.length || 1,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain });
  }

  function pick(pack: ShelfPack) {
    if (pack.correct) {
      const earned = Math.round(25 * retryRewardFactor(ruledOut.length));
      toastScore(earned, "Right pack");
      if (index + 1 < questions.length) {
        setPoints((p) => p + earned);
        setIndex((i) => i + 1);
      } else {
        setPoints((p) => p + earned);
        void finish(false, earned);
      }
      return;
    }
    // Stay on the question. The explanation only teaches while the decision it
    // belongs to can still be changed.
    setTried((m) => ({ ...m, [index]: [...(m[index] ?? []), pack.brand] }));
    setErrors((e) => e + 1);
    setPoints((p) => p - 10);
    toastScore(-10, "Wrong pack");
    const { whyWrong, whatToKnow } = explainWrongPack(question, pack);
    errPanel.logError({
      errorType: "Look-alike brand dispensed",
      wrongChoice: `${pack.brand} (${pack.generic})`,
      correctChoice: `${question.prescribed} (${question.prescribedGeneric})`,
      whyWrong, whatToKnow,
    });
  }

  return (
    <>
      <GameHeader
        title={`Safety check · pack ${index + 1} of ${questions.length}`}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={liveScoreFromPoints({ difficulty, hintsUsed: 0, pauseUsed: timer.pauseUsed, points })}
        onExit={onExit}
      />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <section className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">The prescription says</p>
          {/* Brand only, and large. What a prescriber writes is a brand, and
              reading it is the whole task - a dose here would have to be
              invented, and an invented dose is a wrong number taught. */}
          <p className="mt-3 font-mono text-3xl font-black tracking-tight sm:text-5xl">{question.prescribed}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Hand over the right pack. Check the generic name, not the shape of the word.
          </p>
        </section>

        <p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
          <ScanSearch className="size-3.5" aria-hidden="true" /> On the shelf
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {question.shelf.map((pack) => {
            const out = ruledOut.includes(pack.brand);
            return (
              <motion.button
                key={pack.brand}
                type="button"
                disabled={out}
                whileTap={out ? undefined : { scale: 0.985 }}
                onClick={() => pick(pack)}
                className={`rounded-2xl border p-4 text-left transition ${
                  out
                    ? "border-destructive/40 opacity-55"
                    : "border-border/50 bg-card/60 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <p className={`text-xl font-black tracking-tight ${out ? "line-through" : ""}`}>{pack.brand}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pack.generic}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{pack.drugClass}</p>
              </motion.button>
            );
          })}
        </div>
      </main>
    </>
  );
}

/**
 * The finding, before the drill.
 *
 * This screen is the reason the mode exists and it is the first thing anybody
 * sees, including a judge at a stand. Every number on it is computed from the
 * list rather than typed, so it cannot drift from what the scan actually
 * found - and the caveat is on the screen, not in a footnote, because the
 * pairs are candidates for review and saying otherwise would be a claim
 * nobody has earned.
 */
function Briefing({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-amber-400/30 bg-card/60 p-6 shadow-2xl backdrop-blur sm:p-8"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <ShieldAlert className="size-3.5" aria-hidden="true" /> Dispensing safety
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Names close enough to reach for by mistake
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          We measured every brand name in this catalogue against every other one. These are the
          pairs within two letters of each other &mdash; the kind that get picked up for one another
          across a counter.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { value: BRANDS_SCANNED.toLocaleString(), label: "Pakistani brand names scanned" },
            { value: LOOKALIKE_PAIRS.length, label: "pairs within two letters" },
            // Printing "55" twice under two different labels reads as a
            // mistake rather than as the finding it is, so when every pair
            // crosses a class the tile says so in words.
            CROSS_CLASS === LOOKALIKE_PAIRS.length
              ? { value: "Every one", label: "crosses into a different class of medicine" }
              : { value: CROSS_CLASS, label: "of those cross into a different class of medicine" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/40 bg-background/40 p-4">
              <p className="text-3xl font-black tabular-nums text-primary">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-border/40 bg-background/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            The closest pairs in this catalogue
          </p>
          <ul className="mt-3 space-y-2">
            {LOOKALIKE_PAIRS.slice(0, 3).map((pair) => (
              <li key={`${pair.a}-${pair.b}`} className="text-sm">
                <span className="font-bold">{pair.a}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="font-bold">{pair.b}</span>
                <span className="block text-xs text-muted-foreground">
                  {pair.aGeneric} ({pair.aClass}) &nbsp;vs&nbsp; {pair.bGeneric} ({pair.bClass})
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 flex gap-2 rounded-2xl border border-border/40 p-4 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <span>
            These are candidates for review, not confirmed confusions. The measurement is how close
            two names are to read, type or hear &mdash; not evidence that any pair has been mixed up in
            a Pakistani pharmacy, which would take incident data and a pharmacist to establish.
          </span>
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            <Check className="size-4" aria-hidden="true" /> Start the drill
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-border/50 px-5 py-3 text-sm font-semibold transition hover:bg-muted"
          >
            Back <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </main>
  );
}
