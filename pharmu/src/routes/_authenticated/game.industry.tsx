import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import {
  computeScore, submitScore, MODE_TIMERS, toastScore, awardBadge, bumpCounterBadge,
} from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { Check, X as XIcon, Thermometer, Droplets, FlaskConical, Pill, CupSoda, PackageCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";

export const Route = createFileRoute("/_authenticated/game/industry")({
  head: () => ({ meta: [{ title: "Industry - PharmaVerse" }] }),
  component: () => <ModeTheme mode="industry"><IndustryGame /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const LIMIT = MODE_TIMERS.industry;

type Phase = "formula" | "weighing" | "env" | "process" | "qc" | "release" | "done";
type IngEntry = { name: string; weight: number; ok: boolean };
type ProductChoice = { form: string; type: string };

const STAGES = ["mixing", "granulation", "drying", "compression", "coating", "packaging"] as const;
type Stage = typeof STAGES[number];

const PRODUCT_FORMS = [
  {
    form: "Tablet",
    icon: Pill,
    desc: "Solid oral dosage manufacturing with compression and coating controls.",
    types: ["Immediate-release tablet", "Film-coated tablet", "Enteric-coated tablet", "Chewable tablet"],
  },
  {
    form: "Syrup",
    icon: CupSoda,
    desc: "Liquid oral preparation with solution clarity, viscosity, and fill checks.",
    types: ["Simple syrup", "Antitussive syrup", "Pediatric syrup", "Sugar-free syrup"],
  },
  {
    form: "Capsule",
    icon: PackageCheck,
    desc: "Encapsulated dosage form with blend uniformity and shell filling checks.",
    types: ["Hard gelatin capsule", "Soft gelatin capsule", "Delayed-release capsule", "Powder-filled capsule"],
  },
  {
    form: "Semi-solid",
    icon: Sparkles,
    desc: "Topical product preparation with base consistency and contamination control.",
    types: ["Cream", "Ointment", "Gel", "Lotion"],
  },
];

function parseBatchCount(batchSize: unknown) {
  if (typeof batchSize === "number" && Number.isFinite(batchSize)) return batchSize;
  if (typeof batchSize !== "string") return 0;
  const match = batchSize.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function scaleAmount(value: unknown, scale: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  return Math.round(value * scale * 100) / 100;
}

function formatBatchSize(template: unknown, count: number) {
  const formatted = formatAmount(count);
  if (typeof template !== "string") return `${formatted} units`;
  if (/\d/.test(template)) {
    return template.replace(/[\d,]+(\.\d+)?/, formatted);
  }
  return `${formatted} ${template}`.trim();
}

function displayWeight(value: number, unit = "g") {
  const decimals = Math.abs(value) < 10 && !Number.isInteger(value) ? 2 : 1;
  return `${value.toFixed(decimals)} ${unit}`;
}

function IndustryGame() {
  const [productChoice, setProductChoice] = useState<ProductChoice | null>(null);

  if (!productChoice) {
    return <ProductChoiceScreen onPick={setProductChoice} />;
  }

  return <IndustryRun productChoice={productChoice} />;
}

function ProductChoiceScreen({ onPick }: { onPick: (choice: ProductChoice) => void }) {
  const [selectedForm, setSelectedForm] = useState(PRODUCT_FORMS[0].form);
  const active = PRODUCT_FORMS.find((item) => item.form === selectedForm) ?? PRODUCT_FORMS[0];

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-6xl place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Industry</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">What do you want to manufacture?</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose the dosage form first, then select the specific product type for this batch.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {PRODUCT_FORMS.map((item) => {
            const Icon = item.icon;
            const selected = item.form === selectedForm;
            return (
              <button
                key={item.form}
                onClick={() => setSelectedForm(item.form)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  selected
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/35"
                }`}
              >
                <Icon className={`size-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <h2 className="mt-3 text-base font-bold">{item.form}</h2>
                <p className="mt-1 text-xs leading-relaxed">{item.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border/40 bg-background/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{active.form} types</p>
              <p className="mt-1 text-sm text-muted-foreground">Pick one to start the batch record.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {active.types.map((type) => (
              <button
                key={type}
                onClick={() => onPick({ form: active.form, type })}
                className="rounded-xl border border-border/40 bg-card/60 p-3 text-left text-sm font-semibold transition hover:border-primary/50 hover:bg-primary/10"
              >
                {type}
                <span className="mt-1 block text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                  Start batch
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </main>
  );
}

function IndustryRun({ productChoice }: { productChoice: ProductChoice }) {
  const onExit = useGameExit("/modes");
  const { difficulty, difficultyModal } = useDifficultyChoice("industry");
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader("industry", difficulty);
  const f = caseData?.formula_json;
  const batchProduct = productChoice.type;
  const [phase, setPhase] = useState<Phase>("formula");
  const baseBatchCount = useMemo(() => parseBatchCount(f?.batchSize), [f?.batchSize]);
  const [batchCount, setBatchCount] = useState(0);

  // scoring counters
  const [points, setPoints] = useState(0);
  const [errors, setErrors] = useState(0);
  const [qcErrors, setQcErrors] = useState(0);
  const [contaminated, setContaminated] = useState(false);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<any>(null);

  // weighing
  const [weighed, setWeighed] = useState<Record<string, IngEntry>>({});
  const [active, setActive] = useState<string | null>(null);
  const [slider, setSlider] = useState(0);

  // env
  const [temp, setTemp] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [envFixed, setEnvFixed] = useState(false);

  // process
  const [stageIdx, setStageIdx] = useState(0);
  const [stageResults, setStageResults] = useState<Record<Stage, boolean>>({} as any);
  const [dryTemp, setDryTemp] = useState(50);

  // qc
  const [qcAnswers, setQcAnswers] = useState<Record<number, boolean>>({});

  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "industry",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    setPhase("formula"); setPoints(0); setErrors(0); setQcErrors(0); setContaminated(false);
    setHints(0); setWeighed({}); setActive(null); setSlider(0);
    setEnvFixed(false); setStageIdx(0); setStageResults({} as any); setQcAnswers({});
    setResult(null);
    setBatchCount(parseBatchCount(f?.batchSize));
    if (f?.env) {
      // randomize: 60% chance OK, 40% chance out of range
      const okRun = Math.random() < 0.6;
      if (okRun) {
        setTemp(Math.round((f.env.tempRange[0] + f.env.tempRange[1]) / 2));
        setHumidity(Math.round((f.env.humidityRange[0] + f.env.humidityRange[1]) / 2));
      } else {
        setTemp(f.env.tempRange[1] + 4);
        setHumidity(f.env.humidityRange[1] + 15);
      }
    }
    setDryTemp(f?.process?.drying?.min ?? 50);
  }, [caseData?.id]);

  const rawIngredients = f?.ingredients ?? [];
  const batchScale = baseBatchCount > 0 && batchCount > 0 ? batchCount / baseBatchCount : 1;
  const batchSizeLabel = formatBatchSize(f?.batchSize, batchCount || baseBatchCount || 1);
  const minBatchCount = Math.max(1, Math.round((baseBatchCount || 1000) * 0.25));
  const maxBatchCount = Math.max(minBatchCount + 1, Math.round((baseBatchCount || 1000) * 3));
  const batchStep = Math.max(1, Math.round((baseBatchCount || 1000) / 20));
  const ingredients = useMemo(() => (
    rawIngredients.map((i: any) => ({
      ...i,
      target: scaleAmount(i.target, batchScale),
      min: scaleAmount(i.min, batchScale),
      max: scaleAmount(i.max, batchScale),
    }))
  ), [rawIngredients, batchScale]);
  const distractors = f?.distractors ?? [];
  const allWeighingItems = useMemo(() => {
    const items = [
      ...ingredients.map((i: any) => ({ name: i.name, role: i.role, isReal: true })),
      ...distractors.map((n: string) => ({ name: n, role: "Distractor", isReal: false })),
    ];
    return items.sort(() => Math.random() - 0.5);
  }, [caseData?.id, ingredients, distractors]);
  const activeIngredient = active ? ingredients.find((i: any) => i.name === active) : null;
  const weighingMax = activeIngredient
    ? Math.max(Number(activeIngredient.max) * 1.6, Number(activeIngredient.target) * 2, 10)
    : 500;
  const weighingStep = activeIngredient?.unit?.toLowerCase?.().includes("kg") ? 0.01 : 0.5;

  if (loading || !caseData || !f) {
    return (
      <>
        {difficultyModal}
        <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading batch...</main>
      </>
    );
  }

  function acknowledgeFormula() {
    setPoints((p) => p + 10);
    toastScore(10, "Formula acknowledged");
    setPhase("weighing");
  }

  function updateBatchCount(nextCount: number) {
    const clamped = Math.min(maxBatchCount, Math.max(minBatchCount, nextCount || minBatchCount));
    setBatchCount(clamped);
    setWeighed({});
    setActive(null);
    setSlider(0);
  }

  function startWeigh(name: string) {
    setActive(name);
    const ing = ingredients.find((i: any) => i.name === name);
    setSlider(ing ? ing.target : 100);
  }

  function confirmWeigh() {
    if (!active) return;
    const ing = ingredients.find((i: any) => i.name === active);
    const isDistractor = !ing;
    if (isDistractor) {
      setErrors((e) => e + 1);
      setPoints((p) => p - 15);
      toastScore(-15, `${active} is not in this formula`);
      toast.error("Wrong ingredient - check the master formula.");
      errPanel.logError({
        errorType: "Wrong ingredient picked",
        wrongChoice: active,
        correctChoice: ingredients.map((i: any) => i.name).join(", "),
        whyWrong: `${active} is not in the master formula for ${batchProduct}. Using it would change the dosage form's properties or contaminate the batch.`,
        whatToKnow: "Binders hold ingredients together, fillers add bulk, disintegrants help tablets break apart, lubricants prevent sticking. Always cross-check against the master formula.",
        hint: "Re-open the master formula and verify each ingredient against the list.",
      });
    } else {
      const ok = slider >= ing.min && slider <= ing.max;
      setWeighed((w) => ({ ...w, [active]: { name: active, weight: slider, ok } }));
      if (ok) { setPoints((p) => p + 15); toastScore(15, `${active} OK`); }
      else {
        setErrors((e) => e + 1); setPoints((p) => p - 10); toastScore(-10, `${active} out of range`);
        errPanel.logError({
          errorType: "Weight out of range",
          wrongChoice: `${displayWeight(slider, ing.unit)} of ${active}`,
          correctChoice: `${displayWeight(ing.target, ing.unit)} (range ${displayWeight(ing.min, ing.unit)}-${displayWeight(ing.max, ing.unit)})`,
          whyWrong: `You weighed ${displayWeight(slider, ing.unit)} but the acceptable range is ${displayWeight(ing.min, ing.unit)}-${displayWeight(ing.max, ing.unit)}. Out-of-spec weights cause dose non-uniformity, failed compression, or batch rejection.`,
          whatToKnow: "Pharmaceutical manufacturing requires strict weight tolerances (+/-2-5%) to ensure dose uniformity across the batch.",
        });
      }
    }
    setActive(null);
  }

  const allWeighed = ingredients.every((i: any) => weighed[i.name]?.ok);

  function fixEnvironment(action: string) {
    const okNeeded = temp > f.env.tempRange[1] || temp < f.env.tempRange[0]
      || humidity > f.env.humidityRange[1] || humidity < f.env.humidityRange[0];
    const correct = (action === "dehumidifier" && humidity > f.env.humidityRange[1])
      || (action === "hvac" && (temp > f.env.tempRange[1] || temp < f.env.tempRange[0]))
      || (action === "delay" && okNeeded);
    if (!okNeeded) {
      toast("Conditions already within range.");
      setEnvFixed(true);
      setPoints((p) => p + 20);
      toastScore(20, "Env check OK");
      setPhase("process");
      return;
    }
    if (correct) {
      setTemp(Math.round((f.env.tempRange[0] + f.env.tempRange[1]) / 2));
      setHumidity(Math.round((f.env.humidityRange[0] + f.env.humidityRange[1]) / 2));
      setEnvFixed(true);
      setPoints((p) => p + 20);
      toastScore(20, "Conditions normalized");
      setPhase("process");
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 10);
      toastScore(-10, "Wrong corrective action");
      errPanel.logError({
        errorType: "Wrong environmental corrective action",
        wrongChoice: action,
        correctChoice: humidity > f.env.humidityRange[1] ? "Activate dehumidifier" : "Adjust HVAC temperature",
        whyWrong: `${action} doesn't address the actual deviation (temp ${temp} deg C, humidity ${humidity}%). Wrong correction wastes time and risks the batch.`,
        whatToKnow: "Match the corrective action to the deviation: dehumidifier for high humidity, HVAC for temperature, delay if both are unstable.",
      });
    }
  }

  function ignoreEnv() {
    setContaminated(true);
    setEnvFixed(true);
    toast.error("Batch contamination risk - proceeding anyway.");
    errPanel.logError({
      errorType: "Environmental check ignored",
      wrongChoice: `Proceeded at temp ${temp} deg C / humidity ${humidity}%`,
      correctChoice: `Hold batch until temp ${f.env.tempRange[0]}-${f.env.tempRange[1]} deg C, humidity ${f.env.humidityRange[0]}-${f.env.humidityRange[1]}%`,
      whyWrong: "Proceeding outside the safe range will degrade moisture-sensitive APIs and fail GMP requirements. The batch is now at risk.",
      whatToKnow: "GMP requires strict environmental controls during manufacture. Out-of-spec conditions mandate hold + investigation, not 'continue anyway'.",
    });
    setPhase("process");
  }

  function chooseStage(stage: Stage, ok: boolean) {
    setStageResults((s) => ({ ...s, [stage]: ok }));
    if (ok) { setPoints((p) => p + 15); toastScore(15, `${stage} OK`); advanceStage(); }
    else {
      setErrors((e) => e + 1); setPoints((p) => p - 5); toastScore(-5, `${stage} - retry`);
      errPanel.logError({
        errorType: `Wrong ${stage} process choice`,
        wrongChoice: `Incorrect option for ${stage}`,
        correctChoice: `See master formula for ${stage} spec`,
        whyWrong: `That ${stage} choice is wrong for this product. Wet granulation can't be used for moisture-sensitive APIs; enteric coating requires polymer-based coats, not sugar.`,
        whatToKnow: `Each manufacturing stage has product-specific constraints. ${stage} parameters are in the master formula - re-check before answering.`,
        hint: "Cross-reference the product's properties with the stage requirements.",
      });
    }
  }
  function advanceStage() {
    if (stageIdx + 1 < STAGES.length) setStageIdx((i) => i + 1);
    else setPhase("qc");
  }

  function answerQc(i: number, judged: boolean) {
    const t = f.qc[i];
    const correct = judged === t.shouldPass;
    setQcAnswers((m) => ({ ...m, [i]: judged }));
    if (correct) { setPoints((p) => p + 20); toastScore(20, `${t.test}`); }
    else {
      setQcErrors((e) => e + 1); setErrors((e) => e + 1); setPoints((p) => p - 10); toastScore(-10, `${t.test}`);
      errPanel.logError({
        errorType: "QC judgement error",
        wrongChoice: `${t.test}: marked ${judged ? "Pass" : "Fail"}`,
        correctChoice: `${t.test}: should be ${t.shouldPass ? "Pass" : "Fail"} (${t.result})`,
        whyWrong: `The QC result "${t.result}" should have been judged ${t.shouldPass ? "PASS" : "FAIL"}. Misjudging QC releases unsafe batches or wastes good stock.`,
        whatToKnow: "Compare each QC reading against the spec limits. If any parameter is out of spec, the batch fails QC.",
      });
    }
  }
  const allQcAnswered = f.qc.every((_: any, i: number) => qcAnswers[i] !== undefined);

  async function releaseDecision(release: boolean) {
    const correct = release === f.release;
    let delta = correct ? 30 : -50;
    if (contaminated) delta -= 30;
    setPoints((p) => p + delta);
    if (correct) toastScore(delta, "Batch decision");
    else {
      toast.error(`Wrong decision - batch ${f.release ? "should have been released" : "should have been rejected"}.`);
      errPanel.logError({
        errorType: "Wrong batch release decision",
        wrongChoice: release ? "Release" : "Reject",
        correctChoice: f.release ? "Release" : "Reject",
        whyWrong: `Based on QC results and environmental controls, this batch ${f.release ? "met all release criteria" : "failed one or more criteria and must be rejected"}.`,
        whatToKnow: "A QP releases only when every QC test passes and environmental records are within spec. Any deviation is grounds for rejection.",
      });
    }
    await finish(false, delta);
  }

  async function finish(timedOut: boolean, releaseDelta = 0) {
    const totalPoints = points + releaseDelta;
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: 0, wrongDrugs: 0,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    }) - 100 + Math.max(0, totalPoints); // strip base, use custom points
    const finalScore = Math.max(0, Math.round(score));
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "industry",
      score: finalScore, timeTaken: timer.taken, errors,
      correctDrugs: ingredients.filter((i: any) => weighed[i.name]?.ok).length,
      totalDrugs: ingredients.length,
      errorsDetail: errPanel.errors,
    });

    // Badge logic
    if (qcErrors === 0 && !timedOut) {
      await bumpCounterBadge(profile!.user_id, "industry_zero_qc", 5, {
        name: "Master Manufacturer", description: "Complete 5 Industry cases with 0 QC errors", icon: "Industry",
      });
    }
    if (!timedOut && errors === 0 && qcErrors === 0 && finalScore >= 180) {
      await awardBadge(profile!.user_id, "Batch Perfectionist", "Release a batch with 100% score", "*");
    }
    setResult({ score: finalScore, xpGain });
    setPhase("done");
  }

  if (phase === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={ingredients.map((i: any) => ({
          name: `${i.name} (${i.role})`,
          correct: !!weighed[i.name]?.ok,
          info: weighed[i.name] ? `Weighed ${displayWeight(weighed[i.name].weight, i.unit)} (target ${displayWeight(i.target, i.unit)})` : "Not weighed",
        }))}
        breakdown={[
          { label: "Points earned", delta: Math.max(0, points) },
          { label: "Errors", delta: -errors * 5 },
          { label: "QC errors", delta: -qcErrors * 10 },
          { label: "Contaminated batch", delta: contaminated ? -30 : 0 },
        ]}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  return (
    <>
      {difficultyModal}
      <GameHeader
        title={`Batch - ${batchProduct}`}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={points}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toast(`Stage ${stageIdx + 1}: ${STAGES[stageIdx]} - read the formula carefully.`); }}
      />

      <main className="mx-auto max-w-7xl px-4 py-4">
        {/* Env gauges always visible after formula */}
        {phase !== "formula" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Gauge icon={Thermometer} label="Temp" value={temp} unit=" deg C" range={f.env.tempRange} />
            <Gauge icon={Droplets} label="Humidity" value={humidity} unit="%" range={f.env.humidityRange} />
            <InfoChip label="Batch" value={batchSizeLabel} />
            <InfoChip label="Errors" value={String(errors)} />
          </div>
        )}

        {phase === "formula" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 1 - Master Formula</p>
            <h2 className="mt-1 text-2xl font-bold">{batchProduct}</h2>
            <p className="text-sm text-muted-foreground">{productChoice.form} dosage form - Batch size: {batchSizeLabel}</p>
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label htmlFor="industry-batch-size" className="text-xs font-bold uppercase tracking-wider text-primary">
                    Batch size
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adjust the batch and the master formula recalculates all ingredient targets.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="industry-batch-size"
                    type="number"
                    min={minBatchCount}
                    max={maxBatchCount}
                    step={batchStep}
                    value={batchCount || ""}
                    onChange={(e) => updateBatchCount(Number(e.target.value))}
                    className="h-10 w-36 rounded-xl border border-border/50 bg-background/70 px-3 text-right font-mono text-sm tabular-nums outline-none focus:border-primary"
                  />
                  <span className="rounded-full bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    {batchScale.toFixed(2)}x
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={minBatchCount}
                max={maxBatchCount}
                step={batchStep}
                value={batchCount || baseBatchCount || minBatchCount}
                onChange={(e) => updateBatchCount(Number(e.target.value))}
                className="mt-4 w-full"
              />
              <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{formatBatchSize(f.batchSize, minBatchCount)}</span>
                <span>{formatBatchSize(f.batchSize, maxBatchCount)}</span>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-border/30 rounded-xl border border-border/30">
              {ingredients.map((i: any) => (
                <li key={i.name} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.role}</p>
                  </div>
                  <span className="tabular-nums">{formatAmount(i.target)} {i.unit} <span className="text-muted-foreground">({formatAmount(i.min)}-{formatAmount(i.max)})</span></span>
                </li>
              ))}
            </ul>
            <button onClick={acknowledgeFormula} className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
              Acknowledge formula
            </button>
          </section>
        )}

        {phase !== "formula" && (
          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <MasterFormulaReference
              f={f}
              batchProduct={batchProduct}
              productChoice={productChoice}
              ingredients={ingredients}
              batchSizeLabel={batchSizeLabel}
              phase={phase}
              stageIdx={stageIdx}
            />
            <div className="min-w-0 space-y-4">

        {phase === "weighing" && (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 2 - Weighing</p>
              <h3 className="mt-1 text-lg font-bold">Ingredient inventory</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {allWeighingItems.map((it: any) => {
                  const done = weighed[it.name]?.ok;
                  return (
                    <button key={it.name} disabled={done} onClick={() => startWeigh(it.name)}
                      className={`rounded-xl border p-3 text-left text-sm transition ${done
                        ? "border-primary/40 bg-primary/10 opacity-60"
                        : "border-border/40 bg-card/60 hover:border-primary/40"}`}>
                      <p className="font-semibold">{it.name}</p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{it.role}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Weighing station</p>
              {!active ? (
                <p className="mt-4 text-sm text-muted-foreground">Select an ingredient from the inventory.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-lg font-bold">{active}</p>
                  <p className="text-2xl font-mono tabular-nums">{displayWeight(slider, activeIngredient?.unit)}</p>
                  {activeIngredient && (
                    <p className="text-xs text-muted-foreground">
                      Target {displayWeight(activeIngredient.target, activeIngredient.unit)} - Range {displayWeight(activeIngredient.min, activeIngredient.unit)}-{displayWeight(activeIngredient.max, activeIngredient.unit)}
                    </p>
                  )}
                  <input type="range" min={0} max={weighingMax} step={weighingStep} value={slider}
                    onChange={(e) => setSlider(Number(e.target.value))} className="w-full" />
                  <button onClick={confirmWeigh} className="w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground">
                    Confirm weight
                  </button>
                </div>
              )}
              <div className="mt-5 rounded-lg bg-muted/30 p-3 text-xs">
                <p className="mb-1 font-semibold">Weighed</p>
                {Object.values(weighed).length === 0 && <p className="text-muted-foreground">Nothing weighed yet.</p>}
                {Object.values(weighed).map((w) => (
                  <p key={w.name} className={w.ok ? "text-primary" : "text-destructive"}>
                    {w.ok ? "OK" : "X"} {w.name} - {displayWeight(w.weight, ingredients.find((i: any) => i.name === w.name)?.unit)}
                  </p>
                ))}
              </div>
              <button disabled={!allWeighed} onClick={() => setPhase("env")}
                className="mt-3 w-full rounded-full border border-border/40 py-2 text-sm font-semibold disabled:opacity-40">
                Proceed to environmental check &gt;
              </button>
            </div>
          </section>
        )}

        {phase === "env" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 3 - Environmental check</p>
            <h3 className="mt-1 text-lg font-bold">Verify mixing room conditions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Safe range: {f.env.tempRange[0]}-{f.env.tempRange[1]} deg C, {f.env.humidityRange[0]}-{f.env.humidityRange[1]}% RH
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => fixEnvironment("dehumidifier")} className="rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40">
                Activate dehumidifier
              </button>
              <button onClick={() => fixEnvironment("hvac")} className="rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40">
                Adjust HVAC temperature
              </button>
              <button onClick={() => fixEnvironment("delay")} className="rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40">
                Delay batch until conditions stabilize
              </button>
              <button onClick={ignoreEnv} className="rounded-xl border border-destructive/40 p-3 text-left text-sm text-destructive hover:bg-destructive/10">
                Ignore and proceed (risky)
              </button>
            </div>
          </section>
        )}

        {phase === "process" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/40 bg-card/60 p-3 backdrop-blur">
              {STAGES.map((s, i) => {
                const done = stageResults[s] !== undefined;
                const active = i === stageIdx;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`rounded-full px-3 py-1 text-xs capitalize ${active ? "bg-primary text-primary-foreground" : done ? (stageResults[s] ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive") : "bg-muted text-muted-foreground"}`}>
                      {s}
                    </div>
                    {i < STAGES.length - 1 && <span className="text-muted-foreground">&gt;</span>}
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
              <StagePicker
                stage={STAGES[stageIdx]}
                spec={f.process[STAGES[stageIdx]]}
                dryTemp={dryTemp} setDryTemp={setDryTemp}
                onAnswer={(ok: boolean) => chooseStage(STAGES[stageIdx], ok)}
              />
            </div>
          </section>
        )}

        {phase === "qc" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 5 - Quality Control</p>
            <h3 className="mt-1 text-lg font-bold">Judge each test</h3>
            <ul className="mt-3 space-y-2">
              {f.qc.map((t: any, i: number) => {
                const ans = qcAnswers[i];
                return (
                  <li key={i} className="rounded-xl border border-border/30 bg-muted/30 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{t.test}</p>
                        <p className="text-xs text-muted-foreground">{t.result}</p>
                      </div>
                      <div className="flex gap-1">
                        <button disabled={ans !== undefined} onClick={() => answerQc(i, true)}
                          className={`rounded-full px-3 py-1 text-xs ${ans === true ? "bg-primary text-primary-foreground" : "border border-border/40"}`}>Pass</button>
                        <button disabled={ans !== undefined} onClick={() => answerQc(i, false)}
                          className={`rounded-full px-3 py-1 text-xs ${ans === false ? "bg-destructive text-destructive-foreground" : "border border-border/40"}`}>Fail</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button disabled={!allQcAnswered} onClick={() => setPhase("release")}
              className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              Continue to batch decision &gt;
            </button>
          </section>
        )}

        {phase === "release" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center backdrop-blur">
            <FlaskConical className="mx-auto size-10 text-primary" />
            <h3 className="mt-2 text-xl font-bold">Final batch decision</h3>
            <p className="mt-1 text-sm text-muted-foreground">Based on your QC results, what's your call?</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => releaseDecision(true)} className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Release batch</button>
              <button onClick={() => releaseDecision(false)} className="rounded-full bg-destructive px-6 py-2 text-sm font-semibold text-destructive-foreground">Reject batch</button>
            </div>
          </section>
        )}

            </div>
          </div>
        )}
      </main>
      {errPanel.panel}
    </>
  );
}

function Gauge({ icon: Icon, label, value, unit, range }: any) {
  const ok = value >= range[0] && value <= range[1];
  return (
    <div className={`rounded-xl border p-2 text-xs ${ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/10"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="size-3" /> {label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}{unit}</div>
      <div className="text-[10px] text-muted-foreground">Safe {range[0]}-{range[1]}{unit}</div>
    </div>
  );
}
function InfoChip({ label, value }: any) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 p-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function MasterFormulaReference({ f, batchProduct, productChoice, ingredients, batchSizeLabel, phase, stageIdx }: any) {
  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-2xl border border-primary/25 bg-card/80 p-4 shadow-[0_16px_40px_-24px_oklch(0.78_0.16_75/0.65)] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Master formula</p>
            <h3 className="mt-1 text-lg font-black leading-tight">{batchProduct}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{productChoice.form} dosage form</p>
          </div>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary">
            {batchSizeLabel}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-border/35 bg-background/35 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingredients</p>
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {ingredients.map((i: any) => (
              <li key={i.name} className="rounded-lg bg-muted/25 px-2 py-1.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className="text-[10px] text-muted-foreground">{i.role}</p>
                  </div>
                  <span className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                    {formatAmount(i.target)}{i.unit}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Range {formatAmount(i.min)}-{formatAmount(i.max)}{i.unit}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-border/35 bg-background/35 p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Temp</p>
            <p className="mt-1 font-bold">{f.env.tempRange[0]}-{f.env.tempRange[1]}C</p>
          </div>
          <div className="rounded-xl border border-border/35 bg-background/35 p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Humidity</p>
            <p className="mt-1 font-bold">{f.env.humidityRange[0]}-{f.env.humidityRange[1]}%</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-border/35 bg-background/35 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Process map</p>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((stage, i) => (
              <span
                key={stage}
                className={`rounded-full px-2 py-1 text-[10px] capitalize ${
                  phase === "process" && i === stageIdx
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function StagePicker({ stage, spec, dryTemp, setDryTemp, onAnswer }: any) {
  if (stage === "drying") {
    const ok = dryTemp >= spec.min && dryTemp <= spec.max;
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 4 - Drying</p>
        <h4 className="mt-1 text-lg font-bold">Set drying temperature</h4>
        <p className="text-sm text-muted-foreground">Target: {spec.target}{spec.unit} ({spec.min}-{spec.max}{spec.unit})</p>
        <p className="mt-3 text-3xl font-mono tabular-nums">{dryTemp}{spec.unit}</p>
        <input type="range" min={20} max={120} value={dryTemp} onChange={(e) => setDryTemp(Number(e.target.value))} className="mt-2 w-full" />
        <button onClick={() => onAnswer(ok)} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Run drying
        </button>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground capitalize">Step - {stage}</p>
      <h4 className="mt-1 text-lg font-bold">{spec.prompt}</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {spec.options.map((o: string, i: number) => (
          <button key={i} onClick={() => onAnswer(i === spec.correct)}
            className="rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40">
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

