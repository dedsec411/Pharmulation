import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { SimulatedPrescription } from "@/components/game/SimulatedPrescription";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, MODE_TIMERS, toastScore } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { User } from "lucide-react";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";
import {
  OtcScenarioPanel,
  formatOtcCorrectChoice,
  getOtcCorrectChoices,
  getOtcCorrectQuestionText,
  getOtcPatientResponse,
  getOtcQuestionOptions,
  getOtcSelectedQuestionText,
  isOtcQuestionChoiceCorrect,
  type OtcDialogueTurn,
} from "@/components/game/OtcScenarioPanel";

export const Route = createFileRoute("/_authenticated/game/otc")({
  head: () => ({ meta: [{ title: "OTC Consultation - Pharmulation" }] }),
  component: () => <ModeTheme mode="otc"><OtcGame /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const LIMIT = MODE_TIMERS.otc;
type Step = "questions" | "drug" | "dose" | "quantity" | "advice" | "done";

function OtcGame() {
  const onExit = useGameExit("/modes");
  const { difficulty, difficultyModal } = useDifficultyChoice("otc");
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader("otc", difficulty);
  const [step, setStep] = useState<Step>("questions");
  const [qi, setQi] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [hints, setHints] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [dialogueLog, setDialogueLog] = useState<OtcDialogueTurn[]>([]);

  const timer = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "otc",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    setStep("questions"); setQi(0); setCorrect(0); setWrong(0); setHints(0); setQuantity(1); setResult(null); setDialogueLog([]);
  }, [caseData?.id]);

  if (loading || !caseData) return <>{difficultyModal}<Loading /></>;
  const ans = caseData.correct_answer_json ?? {};
  const questions: any[] = ans.questions ?? [];

  function pickQuestion(i: number) {
    const q = questions[qi];
    const selectedQuestion = getOtcSelectedQuestionText(q, i);
    const patientResponse = getOtcPatientResponse(q, i);
    const isCorrect = isOtcQuestionChoiceCorrect(q, i);
    setDialogueLog((log) => [...log, { pharmacist: selectedQuestion, patient: patientResponse, correct: isCorrect }]);
    if (isCorrect) { setCorrect((n) => n + 1); toastScore(20, "good question"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong path");
      errPanel.logError({
        errorType: "Irrelevant follow-up question",
        wrongChoice: selectedQuestion,
        correctChoice: getOtcCorrectQuestionText(q),
        whyWrong: "That question does not uncover the key OTC safety information for this scenario.",
        whatToKnow: "Priority OTC questions establish who the medicine is for, symptoms, duration, prior treatment, allergies, medical conditions, and current medicines.",
        hint: "Ask about onset, severity, or red-flag features first.",
      });
    }
    if (qi + 1 < questions.length) setQi((x) => x + 1);
    else setStep("drug");
  }
  function pickDrug(opt: string) {
    const correctChoices = getOtcCorrectChoices(ans);
    if (correctChoices.includes(opt)) { setCorrect((n) => n + 1); toastScore(20, "correct drug"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong drug");
      errPanel.logError({
        errorType: "Wrong OTC recommendation",
        wrongChoice: opt,
        correctChoice: formatOtcCorrectChoice(ans),
        whyWrong: `${opt} is not appropriate for this patient given their presenting symptoms, history, or contraindications.`,
        whatToKnow: "Match OTC product to symptom + screen for red flags, pregnancy, allergies, and current meds before recommending.",
        hint: "Consider this patient's specific risk factors and symptom pattern.",
      });
    }
    setStep("dose");
  }
  function pickDose(opt: string) {
    if (opt === ans.correct_dose) { setCorrect((n) => n + 1); toastScore(25, "correct dose"); }
    else {
      setWrong((n) => n + 1); toastScore(-10, "wrong dose");
      errPanel.logError({
        errorType: "Wrong dose",
        wrongChoice: opt,
        correctChoice: ans.correct_dose,
        whyWrong: `${opt} is outside the safe/effective range for this patient.`,
        whatToKnow: "OTC dosing depends on age, weight, renal/hepatic function, and product strength. Always check the pack labelling.",
      });
    }
    setQuantity(getCorrectQuantity(ans));
    setStep("quantity");
  }
  function submitQuantity(qty: number) {
    const expected = getCorrectQuantity(ans);
    if (qty === expected) { setCorrect((n) => n + 1); toastScore(10, "correct quantity"); }
    else {
      setWrong((n) => n + 1); toastScore(-5, "quantity off");
      errPanel.logError({
        errorType: "Wrong OTC quantity",
        wrongChoice: `${qty} pack${qty === 1 ? "" : "s"}`,
        correctChoice: `${expected} pack${expected === 1 ? "" : "s"}`,
        whyWrong: "The quantity should match the recommended OTC course without oversupplying or leaving the patient short.",
        whatToKnow: "OTC quantity should follow dose, duration, pack size, safety limits, and referral advice.",
      });
    }
    setStep("advice");
  }
  async function pickAdvice(opt: string) {
    let cl = 0, wl = 0;
    if (opt === ans.correct_advice) { cl = 1; toastScore(25, "good counseling"); }
    else {
      wl = 1; toastScore(-10, "off counseling");
      errPanel.logError({
        errorType: "Wrong counseling advice",
        wrongChoice: opt,
        correctChoice: ans.correct_advice,
        whyWrong: "That advice is incomplete or misleading for this scenario and could harm the patient or reduce efficacy.",
        whatToKnow: "Counseling should cover how to take it, what to expect, side effects to watch for, and when to seek further help.",
      });
    }
    finish(false, cl, wl);
  }

  async function finish(timedOut: boolean, cl = 0, wl = 0) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct, wrongDrugs: wrong, correctLabels: cl, wrongLabels: wl,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "otc",
      score, timeTaken: timer.taken, errors: wrong + wl,
      correctDrugs: correct, totalDrugs: questions.length + 4,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain });
    setStep("done");
  }

  if (step === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={[{ name: ans.correct_drug, correct: true, info: `${ans.correct_dose} · Qty ${quantity}` }]}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  const currentScore = correct * 20 - wrong * 15;
  return (
    <>
      {difficultyModal}
      <GameHeader title={caseData.title ?? "OTC"} remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause} score={currentScore}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint used"); }} />
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 xl:grid-cols-[1.05fr_1fr]">
        <aside className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-primary/20"><User className="size-6 text-primary" /></div>
            <div>
              <p className="font-semibold">{caseData.patient_info_json?.name}</p>
              <p className="text-xs text-muted-foreground">Age {caseData.patient_info_json?.age ?? "—"}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {Object.entries(caseData.patient_info_json ?? {}).map(([k, v]) => (
              <li key={k}><span className="font-medium text-foreground">{k}:</span> {String(v)}</li>
            ))}
          </ul>
          <div className="mt-4 overflow-hidden rounded-xl">
            <SimulatedPrescription caseData={caseData} department="OTC Consultation Training" />
          </div>
        </aside>

        <section>
          <motion.div key={`${step}-${qi}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
            {step === "questions" && questions[qi] && (
              <>
                <OtcScenarioPanel ans={ans} caseData={caseData} dialogueLog={dialogueLog} />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ask</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {getOtcQuestionOptions(questions[qi]).map((c: string, i: number) => (
                    <button key={i} onClick={() => pickQuestion(i)}
                      className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5">
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === "drug" && (
              <Picker title="Recommend a medication" options={ans.drug_options ?? []} onPick={pickDrug} />
            )}
            {step === "dose" && (
              <Picker title="Choose correct dose" options={ans.dose_options ?? []} onPick={pickDose} />
            )}
            {step === "quantity" && (
              <QuantitySlider value={quantity} max={getQuantityMax(ans)} onChange={setQuantity} onSubmit={submitQuantity} />
            )}
            {step === "advice" && (
              <Picker title="Counsel the patient" options={ans.advice_options ?? []} onPick={pickAdvice} />
            )}
          </motion.div>
        </section>
      </main>
      {errPanel.panel}
    </>
  );
}

function getCorrectQuantity(ans: any) {
  const raw = ans.correct_quantity ?? ans.quantity ?? ans.recommended_quantity ?? ans.pack_quantity ?? 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}

function getQuantityMax(ans: any) {
  return Math.max(5, getCorrectQuantity(ans) + 2);
}

function QuantitySlider({
  value,
  max,
  onChange,
  onSubmit,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  onSubmit: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Select quantity</p>
      <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Dispense quantity</p>
            <p className="mt-1 font-mono text-4xl font-black tabular-nums text-primary">{value}</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {value === 1 ? "1 pack" : `${value} packs`}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-5 w-full accent-primary"
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>1</span>
          <span>{max}</span>
        </div>
        <button
          onClick={() => onSubmit(value)}
          className="mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-primary-foreground shadow-[0_0_32px_-14px_oklch(0.74_0.14_180/0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90"
        >
          Confirm quantity
        </button>
      </div>
    </div>
  );
}

function Picker({ title, options, onPick }: { title: string; options: string[]; onPick: (s: string) => void }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p>
      <div className="mt-3 grid gap-2">
        {options.map((o, i) => (
          <button key={i} onClick={() => onPick(o)}
            className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5">
            {o}
          </button>
        ))}
      </div>
    </>
  );
}

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading case…</main>;
}
