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
import { Check, X as XIcon, Thermometer, Droplets, FlaskConical, Pill, CupSoda, PackageCheck, Sparkles, Cog, ClipboardCheck } from "lucide-react";
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

function IndustryAmbient() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Cog className="gear-spin absolute -right-16 top-24 h-44 w-44 text-amber-300/10" strokeWidth={1.2} />
      <Cog className="gear-spin absolute right-20 top-44 h-24 w-24 text-amber-200/10" strokeWidth={1.3} style={{ animationDirection: "reverse", animationDuration: "16s" }} />
      <div className="absolute inset-x-0 bottom-0 h-20 border-t border-amber-300/10 bg-black/20">
        <div className="conveyor-scroll h-full opacity-35"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 28px, rgba(251,191,36,0.22) 28px 32px), linear-gradient(180deg, transparent, rgba(251,191,36,0.08))" }} />
      </div>
    </div>
  );
}

function BatchFlash({ decision }: { decision: "release" | "reject" | null }) {
  if (!decision) return null;
  const isRelease = decision === "release";
  return (
    <motion.div
      key={decision}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={`pointer-events-none fixed inset-0 z-[80] ${isRelease ? "bg-emerald-400" : "bg-red-500"}`}
    />
  );
}

function OfficialStamp({ label = "GMP CONTROLLED" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute right-6 top-24 rotate-[-12deg] rounded-md border-4 border-amber-500/20 px-5 py-2 text-center font-mono text-xl font-black uppercase tracking-[0.26em] text-amber-600/20">
      {label}
    </div>
  );
}

function BalanceScale({ value, max, min, target, unit, ok }: { value: number; max: number; min?: number; target?: number; unit?: string; ok: boolean }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const angle = -54 + pct * 1.08;
  return (
    <div className={`rounded-2xl border p-4 ${ok ? "border-emerald-300/40 bg-emerald-950/20" : "border-red-400/45 bg-red-950/20"}`}>
      <div className="relative mx-auto h-36 max-w-xs rounded-t-full border border-white/10 bg-black/45 shadow-inner">
        <div className="absolute inset-4 rounded-t-full border-t border-x border-white/10" />
        <div className="absolute bottom-4 left-1/2 h-24 w-1 origin-bottom rounded-full bg-current transition-transform duration-150"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)`, color: ok ? "rgb(16 185 129)" : "rgb(239 68 68)", boxShadow: `0 0 18px ${ok ? "rgba(16,185,129,.65)" : "rgba(239,68,68,.65)"}` }} />
        <div className="absolute bottom-3 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-white/20 bg-slate-900" />
        <div className="absolute bottom-3 left-5 text-[10px] font-bold text-muted-foreground">0</div>
        <div className="absolute bottom-3 right-5 text-[10px] font-bold text-muted-foreground">{displayWeight(max, unit)}</div>
        {min !== undefined && target !== undefined && (
          <div className="absolute inset-x-8 bottom-9 h-1 rounded-full bg-white/10">
            <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-emerald-400/80"
              style={{ left: `${Math.max(0, (min / max) * 100)}%`, width: `${Math.max(4, ((target - min) / max) * 200)}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

function IndustrialGauge({ icon: Icon, label, value, unit, range }: any) {
  const min = Number(range?.[0] ?? 0);
  const max = Number(range?.[1] ?? 100);
  const gaugeMin = Math.min(0, min - (max - min));
  const gaugeMax = max + (max - min);
  const pct = Math.max(0, Math.min(1, (value - gaugeMin) / (gaugeMax - gaugeMin || 1)));
  const angle = -130 + pct * 260;
  const ok = value >= min && value <= max;
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-3 text-xs ${ok ? "border-emerald-400/35 bg-emerald-500/5" : "border-red-400/45 bg-red-500/10"}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      <div className="relative mx-auto mt-2 h-24 w-28">
        <div className="absolute inset-x-0 top-0 h-24 rounded-t-full border border-white/15 bg-black/35 shadow-inner" />
        <div className="absolute right-2 top-8 h-8 w-8 rounded-full border border-red-400/30 bg-red-500/10" />
        <div className="absolute bottom-2 left-1/2 h-16 w-1 origin-bottom rounded-full bg-amber-300 transition-transform"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)`, boxShadow: "0 0 12px rgba(251,191,36,0.65)" }} />
        <div className="absolute bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-200" />
      </div>
      <div className={`mt-1 text-center font-mono text-lg font-black tabular-nums ${ok ? "text-emerald-300" : "text-red-300"}`}>{value}{unit}</div>
      <div className="text-center text-[10px] text-muted-foreground">Safe {min}-{max}{unit}</div>
    </div>
  );
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
  const [releaseFlash, setReleaseFlash] = useState<"release" | "reject" | null>(null);

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
    setResult(null); setReleaseFlash(null);
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
  const activeWeightOk = activeIngredient ? slider >= activeIngredient.min && slider <= activeIngredient.max : false;

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
    setReleaseFlash(release ? "release" : "reject");
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
      <IndustryAmbient />
      <BatchFlash decision={releaseFlash} />
      <GameHeader
        title={`Batch - ${batchProduct}`}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={points}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toast(`Stage ${stageIdx + 1}: ${STAGES[stageIdx]} - read the formula carefully.`); }}
      />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-4">
        {/* Env gauges always visible after formula */}
        {phase !== "formula" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <IndustrialGauge icon={Thermometer} label="Temp" value={temp} unit=" deg C" range={f.env.tempRange} />
            <IndustrialGauge icon={Droplets} label="Humidity" value={humidity} unit="%" range={f.env.humidityRange} />
            <InfoChip label="Batch" value={batchSizeLabel} />
            <InfoChip label="Errors" value={String(errors)} />
          </div>
        )}

        {phase === "formula" && (
          <section className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 p-6 text-slate-950 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.8)]">
            <OfficialStamp />
            <div className="relative border-b-2 border-slate-900 pb-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Batch Manufacturing Record</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{batchProduct}</h2>
                  <p className="text-sm font-semibold text-slate-600">{productChoice.form} dosage form - Batch size: {batchSizeLabel}</p>
                </div>
                <div className="rounded border border-slate-400 bg-white px-3 py-2 font-mono text-xs">
                  <p>BMR No. PHM-{caseData.id?.slice?.(0, 5) ?? "00001"}</p>
                  <p>Revision 01</p>
                </div>
              </div>
            </div>
            <div className="relative mt-4 rounded-none border-2 border-slate-900 bg-white p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label htmlFor="industry-batch-size" className="text-xs font-black uppercase tracking-wider text-amber-700">
                    Batch size
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
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
                    className="h-10 w-36 rounded border border-slate-400 bg-slate-50 px-3 text-right font-mono text-sm tabular-nums outline-none focus:border-amber-600"
                  />
                  <span className="rounded border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
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
                className="mt-4 w-full accent-amber-600"
              />
              <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>{formatBatchSize(f.batchSize, minBatchCount)}</span>
                <span>{formatBatchSize(f.batchSize, maxBatchCount)}</span>
              </div>
            </div>
            <ul className="relative mt-4 divide-y divide-slate-300 border-2 border-slate-900 bg-white">
              {ingredients.map((i: any) => (
                <li key={i.name} className="grid grid-cols-[26px_1fr_auto] items-center gap-3 p-3 text-sm">
                  <span className="grid h-4 w-4 place-items-center border border-slate-700 text-[10px]">
                    <Check className="size-3 text-amber-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-slate-500">{i.role}</p>
                  </div>
                  <span className="text-right font-mono tabular-nums">{formatAmount(i.target)} {i.unit} <span className="text-slate-500">({formatAmount(i.min)}-{formatAmount(i.max)})</span></span>
                </li>
              ))}
            </ul>
            <button onClick={acknowledgeFormula} className="relative mt-5 rounded-full bg-amber-500 px-6 py-2 text-sm font-black text-slate-950 shadow-[0_0_28px_-12px_rgba(245,158,11,0.9)] hover:bg-amber-400">
              Acknowledge BMR
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

            <div className="rounded-2xl border border-amber-300/25 bg-card/60 p-5 shadow-[0_18px_55px_-38px_rgba(245,158,11,0.8)] backdrop-blur">
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
                  <BalanceScale
                    value={slider}
                    max={weighingMax}
                    min={activeIngredient?.min}
                    target={activeIngredient?.target}
                    unit={activeIngredient?.unit}
                    ok={activeWeightOk}
                  />
                  <input type="range" min={0} max={weighingMax} step={weighingStep} value={slider}
                    onChange={(e) => setSlider(Number(e.target.value))} className={`w-full ${activeWeightOk ? "accent-emerald-500" : "accent-red-500"}`} />
                  <button onClick={confirmWeigh} className={`w-full rounded-full py-2 text-sm font-semibold text-white ${activeWeightOk ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
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
          <section className="overflow-hidden rounded-2xl border border-slate-300/50 bg-slate-100/90 p-6 text-slate-950 shadow-[0_20px_60px_-38px_rgba(0,0,0,0.8)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">Step 5 - Quality Control</p>
            <h3 className="mt-1 text-lg font-bold">Judge each test</h3>
            <ul className="mt-3 space-y-3">
              {f.qc.map((t: any, i: number) => {
                const ans = qcAnswers[i];
                const stamped = ans !== undefined;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 42 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 220, damping: 24 }}
                    className="relative overflow-hidden rounded-none border border-slate-300 bg-white p-3 font-mono text-sm shadow-[0_14px_30px_-24px_rgba(0,0,0,0.8)] before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-[repeating-linear-gradient(90deg,#d1d5db_0_8px,transparent_8px_16px)]"
                  >
                    {stamped && (
                      <motion.div
                        initial={{ opacity: 0, scale: 1.8, rotate: ans ? -8 : 8 }}
                        animate={{ opacity: 1, scale: 1, rotate: ans ? -8 : 8 }}
                        transition={{ type: "spring", stiffness: 420, damping: 18 }}
                        className={`absolute right-4 top-5 rounded border-4 px-3 py-1 text-lg font-black uppercase tracking-widest ${
                          ans ? "border-emerald-600/70 text-emerald-700/80" : "border-red-600/70 text-red-700/80"
                        }`}
                      >
                        {ans ? "PASS" : "FAIL"}
                      </motion.div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{t.test}</p>
                        <p className="text-xs text-slate-500">{t.result}</p>
                      </div>
                      <div className="flex gap-1">
                        <button disabled={ans !== undefined} onClick={() => answerQc(i, true)}
                          className={`rounded-full px-3 py-1 text-xs ${ans === true ? "bg-emerald-600 text-white" : "border border-slate-300 bg-slate-50"}`}>Pass</button>
                        <button disabled={ans !== undefined} onClick={() => answerQc(i, false)}
                          className={`rounded-full px-3 py-1 text-xs ${ans === false ? "bg-red-600 text-white" : "border border-slate-300 bg-slate-50"}`}>Fail</button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
            <button disabled={!allQcAnswered} onClick={() => setPhase("release")}
              className="mt-4 rounded-full bg-amber-500 px-6 py-2 text-sm font-black text-slate-950 disabled:opacity-40">
              Continue to batch decision &gt;
            </button>
          </section>
        )}

        {phase === "release" && (
          <section className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-black/55 p-8 text-center shadow-[0_24px_80px_-42px_rgba(245,158,11,0.9)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 opacity-30"
              style={{ backgroundImage: "linear-gradient(rgba(251,191,36,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <FlaskConical className="relative mx-auto size-12 text-amber-300" />
            <h3 className="relative mt-3 text-2xl font-black uppercase tracking-wide">Final batch decision</h3>
            <p className="relative mt-1 text-sm text-muted-foreground">Based on QC results and production records, authorize the batch.</p>
            <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => releaseDecision(true)}
                className="rounded-2xl border border-emerald-300/50 bg-emerald-500 px-8 py-6 font-mono text-3xl font-black uppercase tracking-[0.18em] text-emerald-950 shadow-[0_0_44px_-12px_rgba(16,185,129,0.95)] transition hover:scale-[1.02] hover:bg-emerald-400"
              >
                Release
              </button>
              <button
                onClick={() => releaseDecision(false)}
                className="rounded-2xl border border-red-300/50 bg-red-600 px-8 py-6 font-mono text-3xl font-black uppercase tracking-[0.18em] text-red-50 shadow-[0_0_44px_-12px_rgba(239,68,68,0.95)] transition hover:scale-[1.02] hover:bg-red-500"
              >
                Reject
              </button>
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
      <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-950 shadow-[0_16px_40px_-24px_rgba(245,158,11,0.65)]">
        <OfficialStamp label="REFERENCE" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Master formula</p>
            <h3 className="mt-1 text-lg font-black leading-tight">{batchProduct}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{productChoice.form} dosage form</p>
          </div>
          <span className="rounded border border-slate-300 bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-700">
            {batchSizeLabel}
          </span>
        </div>

        <div className="mt-4 border-2 border-slate-900 bg-white p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-700">Ingredients</p>
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {ingredients.map((i: any) => (
              <li key={i.name} className="grid grid-cols-[18px_1fr] gap-2 border-b border-slate-200 pb-1.5 text-xs last:border-b-0">
                <span className="mt-0.5 grid h-3.5 w-3.5 place-items-center border border-slate-600">
                  <Check className="size-2.5 text-amber-700" />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className="text-[10px] text-slate-500">{i.role}</p>
                  </div>
                  <span className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                    {formatAmount(i.target)}{i.unit}
                  </span>
                </div>
                <p className="col-start-2 mt-0.5 text-[10px] text-slate-500">Range {formatAmount(i.min)}-{formatAmount(i.max)}{i.unit}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="border border-slate-300 bg-white p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Temp</p>
            <p className="mt-1 font-bold">{f.env.tempRange[0]}-{f.env.tempRange[1]}C</p>
          </div>
          <div className="border border-slate-300 bg-white p-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Humidity</p>
            <p className="mt-1 font-bold">{f.env.humidityRange[0]}-{f.env.humidityRange[1]}%</p>
          </div>
        </div>

        <div className="mt-3 border border-slate-300 bg-white p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Process map</p>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((stage, i) => (
              <span
                key={stage}
                className={`rounded px-2 py-1 text-[10px] capitalize ${
                  phase === "process" && i === stageIdx
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-100 text-slate-500"
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

