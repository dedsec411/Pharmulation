import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, ShieldAlert, User, XCircle } from "lucide-react";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { OtcPatientChat, type ChatMessage } from "@/components/game/OtcPatientChat";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useTimer } from "@/lib/game/useTimer";
import { useGameExit } from "@/lib/game/useGameExit";
import { useAuthStore } from "@/lib/auth-store";
import { gradeConsultation, type ConsultationGrade } from "@/lib/api/chat.functions";
import { pickOtcCase, type OtcCase } from "@/lib/game/otc-cases";
import {
  computeScore, liveScore, submitScore, toastScore, SCORE_WEIGHTS,
  retryRewardFactor, type Difficulty,
} from "@/lib/game/shared";

type Step = "consult" | "grading" | "drug" | "dose" | "counselling" | "done";

/** Points for each WWHAM item the pharmacist actually elicited. */
const WWHAM_POINTS = 12;
/** Points per red flag uncovered through questioning. */
const RED_FLAG_POINTS = 20;

const WWHAM_LABELS: Array<{ key: keyof ConsultationGrade["wwham"]; label: string }> = [
  { key: "who", label: "Who it's for" },
  { key: "what", label: "Symptoms" },
  { key: "howLong", label: "Duration" },
  { key: "action", label: "Already tried" },
  { key: "medication", label: "Meds / allergies" },
];

export function OtcConsultation({
  difficulty,
  seenIds,
  onSeen,
  next,
  limit,
}: {
  difficulty: Difficulty;
  seenIds: string[];
  onSeen: (id: string) => void;
  next: () => void;
  limit: number;
}) {
  const { profile } = useAuthStore();
  const onExit = useGameExit("/modes");

  // Chosen once per case so a re-render never swaps the patient mid-consultation.
  const [otcCase, setOtcCase] = useState<OtcCase>(() => pickOtcCase(seenIds));
  const [step, setStep] = useState<Step>("consult");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [grade, setGrade] = useState<ConsultationGrade | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  // Reward credit is fractional: an answer reached on the second try is worth
  // 0.6 of a correct answer, so computeScore's difficulty multipliers still
  // apply. `correct` stays a whole count, for the accuracy figure sent to the DB.
  const [rewardDrugs, setRewardDrugs] = useState(0);
  const [rewardLabels, setRewardLabels] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<any>(null);
  // Wrong answers already tried on the current step. The step does not advance
  // until the right one is chosen, so these are struck through to show what is
  // ruled out without letting the same mistake be re-scored.
  const [tried, setTried] = useState<string[]>([]);

  const timer = useTimer(limit, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "otc",
    difficulty,
    mentorTip: otcCase.mentorTip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    setMessages([{ role: "assistant", content: otcCase.patient.opening }]);
    onSeen(otcCase.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otcCase.id]);

  const consultationBonus = useMemo(() => {
    if (!grade) return 0;
    const covered = Object.values(grade.wwham).filter(Boolean).length;
    return covered * WWHAM_POINTS + grade.redFlagsIdentified.length * RED_FLAG_POINTS;
  }, [grade]);

  async function endConsultation() {
    setStep("grading");
    timer.setExternalPaused(true);
    try {
      const response = await gradeConsultation({
        data: {
          transcript: messages,
          caseFacts: {
            title: otcCase.title,
            hidden: otcCase.hidden as unknown as Record<string, unknown>,
            redFlags: otcCase.redFlags,
            outcome: otcCase.outcome,
          },
        },
      });
      if (response.ok) {
        setGrade(response.grade);
        const covered = Object.values(response.grade.wwham).filter(Boolean).length;
        toastScore(covered * WWHAM_POINTS, `${covered}/5 history covered`);
        if (response.grade.redFlagsIdentified.length) {
          toastScore(response.grade.redFlagsIdentified.length * RED_FLAG_POINTS, "red flags spotted");
        }
      } else {
        // Grading is a bonus layer; losing it must not block the case.
        setGradeError(response.error ?? "Could not grade the consultation.");
      }
    } catch {
      setGradeError("Could not grade the consultation.");
    } finally {
      timer.setExternalPaused(false);
      setStep("drug");
    }
  }

  /** Advance to `nextStep`, clearing the ruled-out answers for the new one. */
  function advance(nextStep: Step) {
    setTried([]);
    setStep(nextStep);
  }

  /**
   * Credit a correct answer, scaled down by how many attempts it took, and
   * report the actual points so the toast never overstates what was earned.
   * Returns the fractional credit, which the final step needs for scoring.
   */
  function awardCorrect(kind: "drug" | "label", weight: number, label: string) {
    const factor = retryRewardFactor(tried.length);
    const points = Math.round(weight * factor);
    setCorrect((n) => n + 1);
    if (kind === "drug") setRewardDrugs((r) => r + factor);
    else setRewardLabels((r) => r + factor);
    toastScore(points, tried.length === 0 ? label : `${label} (try ${tried.length + 1})`);
    return factor;
  }

  function pickDrug(option: string) {
    if (otcCase.recommendation.correct.includes(option)) {
      awardCorrect("drug", SCORE_WEIGHTS.correctDrug, "correct recommendation");
      advance("dose");
      return;
    }
    setWrong((n) => n + 1);
    setTried((current) => [...current, option]);
    toastScore(-SCORE_WEIGHTS.wrongDrug, "wrong recommendation");
    errPanel.logError({
      errorType: otcCase.outcome === "refer" ? "Sold when referral was needed" : "Wrong OTC recommendation",
      wrongChoice: option,
      correctChoice: otcCase.recommendation.correct.join(" or "),
      whyWrong: otcCase.outcome === "refer"
        ? "This patient has findings that need medical assessment. Supplying an OTC product here delays diagnosis."
        : `${option} is not appropriate for this patient given their symptoms, medicines or circumstances.`,
      whatToKnow: otcCase.explanation,
    });
  }

  function pickDose(option: string) {
    if (option === otcCase.recommendation.dose) {
      awardCorrect("drug", SCORE_WEIGHTS.correctDrug, "correct dose");
      advance("counselling");
      return;
    }
    setWrong((n) => n + 1);
    setTried((current) => [...current, option]);
    toastScore(-SCORE_WEIGHTS.wrongDrug, "wrong dose");
    errPanel.logError({
      errorType: "Wrong dose or direction",
      wrongChoice: option,
      correctChoice: otcCase.recommendation.dose,
      whyWrong: "That is outside the safe or effective regimen for this patient.",
      whatToKnow: otcCase.explanation,
    });
  }

  function pickCounselling(option: string) {
    if (option === otcCase.recommendation.counselling) {
      const earned = awardCorrect("label", SCORE_WEIGHTS.correctLabel, "good counselling");
      finish(false, earned);
      return;
    }
    setWrong((n) => n + 1);
    setTried((current) => [...current, option]);
    toastScore(-SCORE_WEIGHTS.wrongLabel, "incomplete counselling");
    errPanel.logError({
      errorType: "Incomplete counselling",
      wrongChoice: option,
      correctChoice: otcCase.recommendation.counselling,
      whyWrong: "That advice is incomplete or misleading for this scenario.",
      whatToKnow: "Counselling should cover how to take it, what to watch for, and when to seek further help.",
    });
  }

  async function finish(timedOut: boolean, earnedLabelCredit = 0) {
    const base = computeScore({
      difficulty,
      // Fractional credit: retries are worth progressively less.
      correctDrugs: rewardDrugs,
      wrongDrugs: wrong,
      correctLabels: rewardLabels + earnedLabelCredit,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken,
      timeLimitSec: limit,
      timedOut,
    });
    const score = Math.max(0, base + consultationBonus);

    const { xpGain } = await submitScore({
      userId: profile!.user_id,
      // Cases live in code, not the cases table, so there is no row to link to.
      caseId: `generated:${otcCase.id}`,
      mode: "otc",
      score,
      timeTaken: timer.taken,
      errors: wrong,
      correctDrugs: correct,
      totalDrugs: 3,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain });
    setStep("done");
  }

  function playNext() {
    setOtcCase(pickOtcCase([...seenIds, otcCase.id]));
    setStep("consult");
    setGrade(null);
    setGradeError(null);
    setCorrect(0);
    setRewardDrugs(0);
    setRewardLabels(0);
    setWrong(0);
    setHints(0);
    setTried([]);
    setResult(null);
    errPanel.reset();
    next();
  }

  if (step === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score}
        xpGain={result.xpGain}
        timeTaken={timer.taken}
        mentorTip={otcCase.mentorTip}
        explanation={otcCase.explanation}
        drugs={[{
          name: otcCase.recommendation.correct.join(" or "),
          correct: true,
          info: otcCase.recommendation.dose,
        }]}
        breakdown={grade ? [
          { label: "History taken", delta: Object.values(grade.wwham).filter(Boolean).length * WWHAM_POINTS },
          ...(grade.redFlagsIdentified.length
            ? [{ label: "Red flags spotted", delta: grade.redFlagsIdentified.length * RED_FLAG_POINTS }]
            : []),
        ] : []}
        errors={errPanel.errors}
        onNext={playNext}
      >
        <ConsultationReview grade={grade} otcCase={otcCase} messages={messages} />
      </FeedbackScreen>
    );
  }

  return (
    <>
      <GameHeader
        title={`${otcCase.patient.name}, ${otcCase.patient.age}`}
        remaining={timer.remaining}
        pct={timer.pct}
        paused={timer.paused}
        togglePause={timer.togglePause}
        score={liveScore({
          difficulty,
          // Same fractional credit the final score uses, so the running total
          // cannot drift from the results screen.
          correctDrugs: rewardDrugs,
          correctLabels: rewardLabels,
          wrongDrugs: wrong,
          hintsUsed: hints,
          pauseUsed: timer.pauseUsed,
        }) + consultationBonus}
        onExit={onExit}
        onHint={() => {
          setHints((n) => n + 1);
          toastScore(-SCORE_WEIGHTS.hint, "hint used");
        }}
      />

      <main className="relative mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr]">
        <aside className="relative z-10 h-fit rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <User className="size-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">At the counter</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/20">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{otcCase.patient.name}</p>
              <p className="text-xs text-muted-foreground">Age {otcCase.patient.age}</p>
            </div>
          </div>
          {/* Only what a pharmacist could see or has been told. Everything else
              must be earned by asking; dumping the history here would be the
              answer sheet. */}
          <p className="mt-4 rounded-xl border border-border/40 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            You know nothing about this patient yet. Take the history yourself.
          </p>
          {grade && <WwhamTracker grade={grade} />}
        </aside>

        <section className="relative z-10">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur"
          >
            {step === "consult" && (
              <OtcPatientChat
                otcCase={otcCase}
                difficulty={difficulty}
                messages={messages}
                setMessages={setMessages}
                onComplete={endConsultation}
              />
            )}

            {step === "grading" && (
              <div className="grid min-h-[220px] place-items-center text-center">
                <div>
                  <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-semibold">Reviewing your consultation...</p>
                  <p className="mt-1 text-xs text-muted-foreground">Checking what you established with the patient.</p>
                </div>
              </div>
            )}

            {gradeError && step !== "grading" && (
              <p className="mb-4 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-500">
                Consultation review unavailable ({gradeError}) — your recommendation is still scored.
              </p>
            )}

            {step === "drug" && (
              <Chooser
                title="What do you recommend?"
                hint={otcCase.outcome === "refer" ? "Selling something is not always the right answer." : undefined}
                options={otcCase.recommendation.options}
                tried={tried}
                onPick={pickDrug}
              />
            )}
            {step === "dose" && (
              <Chooser
                title="Dose and directions"
                options={otcCase.recommendation.doseOptions}
                tried={tried}
                onPick={pickDose}
              />
            )}
            {step === "counselling" && (
              <Chooser
                title="What do you tell the patient?"
                options={otcCase.recommendation.counsellingOptions}
                tried={tried}
                onPick={pickCounselling}
              />
            )}
          </motion.div>
        </section>
      </main>
      {errPanel.panel}
    </>
  );
}

function Chooser({
  title,
  hint,
  options,
  tried,
  onPick,
}: {
  title: string;
  hint?: string;
  options: string[];
  tried: string[];
  onPick: (option: string) => void;
}) {
  // Shuffled once per mount so the correct answer isn't always first. Stable
  // across retries, so the list does not reorder under the player.
  const shuffled = useMemo(
    () => [...options].sort(() => Math.random() - 0.5),
    [options],
  );
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {tried.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-500">
          Not quite — try again.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        {shuffled.map((option) => {
          const ruledOut = tried.includes(option);
          return (
            <button
              key={option}
              onClick={() => onPick(option)}
              disabled={ruledOut}
              className={
                ruledOut
                  ? "rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-muted-foreground line-through opacity-60"
                  : "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm transition hover:border-primary/50 hover:bg-primary/10"
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </>
  );
}

function WwhamTracker({ grade }: { grade: ConsultationGrade }) {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">History covered</p>
      <ul className="mt-2 space-y-1.5">
        {WWHAM_LABELS.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2 text-xs">
            {grade.wwham[key]
              ? <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              : <XCircle className="size-3.5 shrink-0 text-muted-foreground/50" />}
            <span className={grade.wwham[key] ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The teaching moment: what they missed, and why it mattered. */
function ConsultationReview({
  grade,
  otcCase,
  messages,
}: {
  grade: ConsultationGrade | null;
  otcCase: OtcCase;
  messages: ChatMessage[];
}) {
  const asked = messages.filter((m) => m.role === "user");
  if (!grade) return null;

  const missed = WWHAM_LABELS.filter(({ key }) => !grade.wwham[key]);

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-border/40 bg-card/50 p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Consultation review</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {asked.length} question{asked.length === 1 ? "" : "s"} asked
        </p>
      </div>

      {grade.summary && <p className="text-sm leading-relaxed">{grade.summary}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {WWHAM_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
              grade.wwham[key]
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-border/40 bg-background/40 text-muted-foreground"
            }`}
          >
            {grade.wwham[key]
              ? <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              : <XCircle className="size-3.5 shrink-0" />}
            {label}
          </div>
        ))}
      </div>

      {grade.criticalMisses.length > 0 && (
        <div className="rounded-xl border border-destructive/35 bg-destructive/10 p-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-destructive" />
            <p className="text-xs font-bold uppercase tracking-wider text-destructive">Could have caused harm</p>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {grade.criticalMisses.map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
      )}

      {grade.redFlagsMissed.length > 0 && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Red flags you did not uncover</p>
          <ul className="mt-2 space-y-1 text-sm">
            {grade.redFlagsMissed.map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
      )}

      {missed.length === 0 && grade.criticalMisses.length === 0 && (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          Complete history — you covered every part of WWHAM.
        </p>
      )}

      {otcCase.outcome === "refer" && (
        <p className="text-xs text-muted-foreground">
          This case required referral rather than a sale.
        </p>
      )}
    </div>
  );
}
