import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, MODE_TIMERS, toastScore } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { Siren, Lock } from "lucide-react";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";

export const Route = createFileRoute("/_authenticated/game/emergency")({
  head: () => ({ meta: [{ title: "Emergency — PharmaVerse" }] }),
  component: () => <ModeTheme mode="emergency"><EmergencyGate /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function EmergencyGate() {
  const onExit = useGameExit("/modes");
  const { profile } = useAuthStore();
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ["emergency-gate", profile?.user_id],
    queryFn: async () => {
      if (!profile) return 0;
      const { count } = await supabase.from("scores")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id);
      return count ?? 0;
    },
    enabled: !!profile,
  });
  if (isLoading) return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">…</main>;
  if (count < 10) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <Lock className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold">Emergency mode locked</h1>
        <p className="mt-2 text-muted-foreground">Complete 10 cases in any mode to unlock. You have {count} / 10.</p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Back to dashboard</Link>
      </main>
    );
  }
  return <EmergencyGame />;
}

const LIMIT = MODE_TIMERS.emergency;
type Step = "drug" | "dose" | "route" | "done";

function EmergencyGame() {
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader("emergency");
  const [step, setStep] = useState<Step>("drug");
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<any>(null);

  const timer = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "emergency",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });
  useEffect(() => { setStep("drug"); setCorrect(0); setWrong(0); setResult(null); }, [caseData?.id]);

  if (loading || !caseData) return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading…</main>;
  const ans = caseData.correct_answer_json ?? {};
  const patient = caseData.patient_info_json ?? {};

  function pick(opt: string, target: string, nextStep: Step, points: number, kind: "drug" | "dose" | "route") {
    if (opt === target) { setCorrect((n) => n + 1); toastScore(points, "correct"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong");
      const messages: Record<string, { type: string; why: string; what: string }> = {
        drug: {
          type: "Wrong emergency drug",
          why: `${opt} is not the first-line treatment for ${ans.emergency}. Delay or substitution here is life-threatening.`,
          what: `First-line for ${ans.emergency} is ${target} because it directly reverses the underlying pathophysiology.`,
        },
        dose: {
          type: "Wrong emergency dose",
          why: `${opt} is the wrong dose for ${ans.emergency}. Under-dosing fails to reverse the emergency; over-dosing risks toxicity.`,
          what: `Correct dose for ${ans.emergency} is ${target}. Memorize emergency doses — there is no time to look them up.`,
        },
        route: {
          type: "Wrong route",
          why: `${opt} is too slow or unavailable in this emergency. The route changes onset of action dramatically.`,
          what: `Correct route is ${target} for fastest onset and reliable absorption in a crashing patient.`,
        },
      };
      const m = messages[kind];
      errPanel.logError({
        errorType: m.type,
        wrongChoice: opt,
        correctChoice: target,
        whyWrong: m.why,
        whatToKnow: m.what,
        forceShowCorrect: true,
      });
    }
    if (nextStep === "done") finish(false);
    else setStep(nextStep);
  }

  async function finish(timedOut: boolean) {
    const score = computeScore({
      correctDrugs: correct, wrongDrugs: wrong,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
      emergencyMultiplier: true,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "emergency",
      score, timeTaken: timer.taken, errors: wrong, correctDrugs: correct, totalDrugs: 3,
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
        drugs={[{ name: ans.correct_drug, correct: true, info: `${ans.correct_dose} ${ans.correct_route}` }]}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950/40 to-background">
      <GameHeader title={caseData.title ?? "EMERGENCY"} onExit={onExit} remaining={timer.remaining} pct={timer.pct}
        paused={false} togglePause={() => {}} score={correct * 30 - wrong * 15} hidePause />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <Siren className="size-6 animate-pulse text-red-400" />
          <div>
            <p className="text-xs uppercase tracking-wider text-red-300">CODE — {ans.emergency}</p>
            <p className="font-semibold">{patient.symptoms}</p>
            <p className="text-xs text-muted-foreground">Cause: {patient.cause}</p>
          </div>
        </motion.div>

        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-border/40 bg-card/70 p-5 backdrop-blur">
          {step === "drug" && <Picker title="Emergency drug — NOW" options={ans.drug_options} onPick={(o) => pick(o, ans.correct_drug, "dose", 30, "drug")} />}
          {step === "dose" && <Picker title="Correct dose" options={ans.dose_options} onPick={(o) => pick(o, ans.correct_dose, "route", 30, "dose")} />}
          {step === "route" && <Picker title="Route of administration" options={ans.route_options} onPick={(o) => pick(o, ans.correct_route, "done", 30, "route")} />}
        </motion.div>

        <p className="mt-3 text-center text-xs text-red-300/80">⚡ 3× XP multiplier · No pause</p>
      </main>
      {errPanel.panel}
    </div>
  );
}

function Picker({ title, options, onPick }: { title: string; options: string[]; onPick: (s: string) => void }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-red-300">{title}</p>
      <div className="mt-3 grid gap-2">
        {(options ?? []).map((o, i) => (
          <button key={i} onClick={() => onPick(o)}
            className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-red-400/40 hover:bg-red-500/10">
            {o}
          </button>
        ))}
      </div>
    </>
  );
}
