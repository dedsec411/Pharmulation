import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, MODE_TIMERS, toastScore, type Mode } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ClipboardList, Database, HeartPulse, Plus, Terminal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";

export const Route = createFileRoute("/_authenticated/game/hospital")({
  head: () => ({ meta: [{ title: "Clinical - PharmaVerse" }] }),
  component: () => <ModeTheme mode="hospital"><HospitalGame mode="hospital" /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const ROUTES = ["oral", "IV", "IM", "SC"];
const FREQS = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];

function ClinicalEkgFloor() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-28 overflow-hidden opacity-45" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-px bg-indigo-300/25" />
      <div className="ekg-scroll absolute inset-x-[-40%] bottom-5 h-20">
        <svg viewBox="0 0 640 90" className="h-full w-[200%]" preserveAspectRatio="none">
          {[0, 640].map((offset) => (
            <polyline
              key={offset}
              points={`${offset + 0},50 ${offset + 58},50 ${offset + 72},28 ${offset + 88},68 ${offset + 104},50 ${offset + 170},50 ${offset + 188},12 ${offset + 206},78 ${offset + 224},50 ${offset + 305},50 ${offset + 326},40 ${offset + 348},62 ${offset + 370},50 ${offset + 472},50 ${offset + 490},24 ${offset + 510},70 ${offset + 532},50 ${offset + 640},50`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-300"
            />
          ))}
        </svg>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-500/10 to-transparent" />
    </div>
  );
}

type ChartTab = "vitals" | "meds" | "labs" | "order";

function VitalBar({ label, value, pct, tone = "primary" }: { label: string; value: string; pct: number; tone?: "primary" | "red" | "sky" }) {
  const theme = tone === "red"
    ? {
      wrap: "border-red-200 bg-red-50/95",
      label: "text-red-700",
      value: "text-red-900",
      track: "bg-red-100",
      fill: "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)]",
    }
    : tone === "sky"
      ? {
        wrap: "border-sky-200 bg-sky-50/95",
        label: "text-sky-700",
        value: "text-sky-950",
        track: "bg-sky-100",
        fill: "bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.7)]",
      }
      : {
        wrap: "border-emerald-200 bg-emerald-50/95",
        label: "text-emerald-700",
        value: "text-emerald-950",
        track: "bg-emerald-100",
        fill: "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.7)]",
      };
  return (
    <div className={`rounded-lg border p-2 ${theme.wrap}`}>
      <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider">
        <span className={theme.label}>{label}</span>
        <span className={`font-black ${theme.value}`}>{value}</span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full ${theme.track}`}>
        <div className={`h-full rounded-full ${theme.fill}`} style={{ width: `${Math.max(8, Math.min(100, pct))}%`, animation: "vital-monitor-scan 2.6s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

function ClinicalAlarmBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 top-16 z-[70] mx-auto max-w-4xl px-4">
      <div className="score-toast-wrong flex items-center gap-3 rounded-2xl border border-red-400/60 bg-red-950/95 px-4 py-3 text-sm font-bold text-red-50 shadow-[0_0_45px_-12px_rgba(239,68,68,0.9)]">
        <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-red-200" />
        <span className="font-mono uppercase tracking-wider">Clinical alert</span>
        <span className="min-w-0 truncate">{message}</span>
      </div>
    </div>
  );
}

function listFromJson(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.values(value).map((item) => String(item)).filter(Boolean);
  }
  return [];
}

export function HospitalGame({ mode }: { mode: Mode }) {
  const LIMIT = MODE_TIMERS[mode];
  const onExit = useGameExit("/modes");
  const { difficulty, difficultyModal } = useDifficultyChoice(mode);
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader(mode, difficulty);
  const [allDrugs, setAllDrugs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [alarm, setAlarm] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<ChartTab>("vitals");

  const timer = useTimer(LIMIT, () => !done && finish(true));
  const errPanel = useErrorPanel({
    mode,
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    supabase.from("drugs").select("*").then(({ data }) => setAllDrugs(data ?? []));
  }, []);
  useEffect(() => { setOrders([]); setHints(0); setResult(null); setDone(false); setSearch(""); setAlarm(null); setChartTab("vitals"); }, [caseData?.id]);
  useEffect(() => {
    if (!alarm) return;
    const id = window.setTimeout(() => setAlarm(null), 4600);
    return () => window.clearTimeout(id);
  }, [alarm]);

  const filtered = useMemo(() =>
    allDrugs.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [allDrugs, search]);

  function addOrder(d: any) {
    setOrders((o) => [...o, { drug: d.name, dose: "", route: "oral", frequency: "once daily" }]);
    setSearch("");
    const correctOrders: any[] = caseData?.correct_answer_json?.drugs ?? [];
    const isExpected = correctOrders.find((co) => co.drug?.toLowerCase() === d.name.toLowerCase());
    // interaction check
    const ints = orders.map((o) => o.drug).filter((existing) => {
      const a = allDrugs.find((x) => x.name === existing);
      return a?.interactions?.includes(d.name) || d.interactions?.includes(existing);
    });
    if (ints.length) {
      const message = `Interaction: ${d.name} + ${ints.join(", ")}`;
      setAlarm(message);
      toast.warning(message, { duration: 5000 });
      errPanel.logError({
        errorType: "Drug interaction risk",
        wrongChoice: `${d.name} + ${ints.join(", ")}`,
        correctChoice: `Remove ${d.name} or replace with a non-interacting alternative; add monitoring if combination is unavoidable.`,
        whyWrong: `${d.name} interacts with ${ints.join(", ")}, increasing risk of toxicity, reduced efficacy, or serious adverse events.`,
        whatToKnow: "Always run an interaction check before submitting clinical orders. Major interactions require substitution or close monitoring.",
        hint: "Check the patient's current med list before adding a new drug.",
      });
    }
    // renal alert
    const eGFR = caseData?.patient_info_json?.labs?.eGFR;
    if (eGFR && eGFR < 60 && d.contraindications?.some((c: string) => /renal/i.test(c))) {
      const message = `Renal caution: eGFR ${eGFR}, dose-adjust ${d.name}`;
      setAlarm(message);
      toast.warning(message, { duration: 5000 });
      errPanel.logError({
        errorType: "Renal dosing alert",
        wrongChoice: `${d.name} at standard dose with eGFR ${eGFR}`,
        correctChoice: `Dose-adjust ${d.name} for renal impairment, or choose a non-renally-cleared alternative.`,
        whyWrong: `Patient eGFR is ${eGFR} mL/min. ${d.name} is renally cleared/contraindicated and will accumulate to toxic levels at standard dose.`,
        whatToKnow: "Check renal function before prescribing renally-cleared drugs. Adjust dose or frequency per local renal dosing guideline.",
      });
    }
    if (!isExpected && !ints.length) {
      errPanel.logError({
        errorType: "Drug not indicated for this patient",
        wrongChoice: d.name,
        correctChoice: correctOrders.map((c) => c.drug).join(", "),
        whyWrong: `${d.name} doesn't match this patient's diagnosis or order. Adding it adds unnecessary risk without clinical benefit.`,
        whatToKnow: "Clinical orders must match the indication on the physician order. Cross-check allergies, current meds, and labs before adding any drug.",
        hint: "Re-read the physician order and patient diagnosis.",
      });
    }
  }
  function updateOrder(i: number, patch: any) {
    setOrders((o) => o.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }
  function removeOrder(i: number) {
    setOrders((o) => o.filter((_, idx) => idx !== i));
  }

  async function submit() {
    finish(false);
  }
  async function finish(timedOut: boolean) {
    setDone(true);
    const correctOrders: any[] = caseData?.correct_answer_json?.drugs ?? [];
    const remove: string[] = caseData?.correct_answer_json?.remove ?? [];
    let correctDrugs = 0, wrongDrugs = 0, correctLabels = 0, wrongLabels = 0;
    correctOrders.forEach((co) => {
      const found = orders.find((o) => o.drug.toLowerCase() === co.drug.toLowerCase());
      if (found) {
        correctDrugs += 1;
        const ok = found.route === co.route && found.frequency === co.frequency &&
          (co.dose ? String(found.dose).includes(String(co.dose)) : true);
        if (ok) correctLabels += 1; else wrongLabels += 1;
      } else wrongDrugs += 1;
    });
    // wrong = added but not in correct list, and not "remove" notes
    orders.forEach((o) => {
      if (!correctOrders.find((co) => co.drug.toLowerCase() === o.drug.toLowerCase())) wrongDrugs += 1;
    });

    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs, wrongDrugs, correctLabels, wrongLabels,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
      emergencyMultiplier: mode === "emergency",
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode,
      score, timeTaken: timer.taken, errors: wrongDrugs + wrongLabels,
      correctDrugs, totalDrugs: correctOrders.length || 1,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain, correctOrders, remove });
  }

  if (loading || !caseData) return <>{difficultyModal}<Loading /></>;
  if (done && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={result.correctOrders.map((o: any) => ({
          name: `${o.drug} ${o.dose}${o.dose ? "mg" : ""} ${o.route} ${o.frequency}`,
          correct: !!orders.find((x) => x.drug.toLowerCase() === o.drug.toLowerCase()),
        }))}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  const patient = caseData.patient_info_json ?? {};
  const currentMeds = listFromJson(patient.current_meds);
  const vitals = patient.vitals ?? {};
  const hr = Number(vitals.hr ?? vitals.heartRate ?? 82);
  const bp = String(vitals.bp ?? vitals.BP ?? "124/78");
  const o2 = Number(vitals.o2 ?? vitals.spo2 ?? vitals.SpO2 ?? 97);
  return (
    <>
      {difficultyModal}
      <ClinicalEkgFloor />
      <ClinicalAlarmBanner message={alarm} />
      <GameHeader title={caseData.title ?? "Clinical"} onExit={onExit} remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause} score={orders.length * 5}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint used"); toast.info(`Hint: ${caseData.mentor_tip}`); }} />
      <main className="relative z-10 mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.3fr]">
        <aside className="relative rounded-2xl border border-slate-300/20 bg-slate-100/95 p-4 text-slate-950 shadow-[0_24px_65px_-38px_rgba(15,23,42,0.8)] backdrop-blur">
          <div className="absolute left-1/2 top-0 h-8 w-28 -translate-x-1/2 -translate-y-3 rounded-b-xl border border-slate-400/40 bg-slate-300 shadow-inner" />
          <div className="rounded-xl border border-slate-300 bg-white/90 p-4 shadow-inner">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700"><ClipboardList className="h-3.5 w-3.5" /> Patient file</p>
          <h2 className="mt-1 text-xl font-black">{patient.name ?? "Clinical Patient"}</h2>
          <p className="border-b border-slate-300 pb-3 text-sm text-slate-600">Age {patient.age ?? "-"} | {patient.diagnosis ?? patient.condition ?? "Assessment pending"}</p>
          <div className="mt-3 flex gap-1 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {(["vitals", "meds", "labs", "order"] as ChartTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setChartTab(tab)}
                className={`rounded-t-md px-3 py-1 transition ${
                  chartTab === tab
                    ? "bg-indigo-600 text-white shadow-[0_8px_18px_-12px_rgba(79,70,229,0.9)]"
                    : "bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-52 pt-3">
            {chartTab === "vitals" && (
              <div className="grid gap-2">
                <VitalBar label="HR" value={`${hr} bpm`} pct={hr} tone={hr > 100 ? "red" : "primary"} />
                <VitalBar label="BP" value={bp} pct={72} tone="sky" />
                <VitalBar label="O2" value={`${o2}%`} pct={o2} tone={o2 < 94 ? "red" : "primary"} />
                {patient.allergies && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-700">Allergies:</span> {String(patient.allergies)}
                  </div>
                )}
              </div>
            )}

            {chartTab === "meds" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Current meds</p>
                {currentMeds.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {currentMeds.map((m, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No current medicines recorded.</p>
                )}
              </div>
            )}

            {chartTab === "labs" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Labs</p>
                {patient.labs ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(patient.labs).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                        <b className="text-sky-700">{k}:</b> {String(v)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No labs available for this case.</p>
                )}
              </div>
            )}

            {chartTab === "order" && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Physician order</p>
                <p className="mt-2">{patient.order ?? "No physician order recorded."}</p>
              </div>
            )}
          </div>
          </div>
        </aside>

        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-indigo-300/25 bg-black/70 p-4 font-mono shadow-[0_18px_60px_-34px_oklch(0.60_0.20_270)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-indigo-300/15 pb-2">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                <Database className="h-4 w-4" /> Hospital formulary
              </p>
              <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                <Terminal className="h-3 w-3" /> DB ONLINE
              </span>
            </div>
            <label className="text-[10px] uppercase tracking-wider text-indigo-300">Query medication database</label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-indigo-300/25 bg-slate-950 px-3 py-2">
              <span className="text-emerald-300">&gt;</span>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="search formulary..."
                className="w-full bg-transparent text-sm text-emerald-100 outline-none placeholder:text-emerald-100/35"
              />
              <span className="h-4 w-2 animate-pulse bg-emerald-300" />
            </div>
            {search && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-indigo-300/20 bg-slate-950/80">
                {filtered.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => addOrder(d)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-indigo-500/15 hover:text-white">
                      <span>{d.name} <span className="text-xs text-indigo-200/60">[{d.category}]</span></span>
                      <Plus className="size-4 text-emerald-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <HeartPulse className="h-3.5 w-3.5 text-primary" /> Order builder
            </p>
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <motion.ul layout className="mt-2 space-y-2">
                <AnimatePresence initial={false}>
                {orders.map((o, i) => (
                  <motion.li
                    key={`${o.drug}-${i}`}
                    layout
                    initial={{ opacity: 0, y: -28, rotateX: -8 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, x: 24, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 360, damping: 28 }}
                    className="relative rounded-lg border border-slate-300/70 bg-slate-50 p-3 text-slate-950 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.9)] before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-black uppercase tracking-wide">{o.drug}</p>
                      <button onClick={() => removeOrder(i)} className="text-slate-500 hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <input placeholder="Dose (mg)" value={o.dose} onChange={(e) => updateOrder(i, { dose: e.target.value })}
                        className="rounded border border-slate-300 bg-white px-2 py-1" />
                      <select value={o.route} onChange={(e) => updateOrder(i, { route: e.target.value })}
                        className="rounded border border-slate-300 bg-white px-2 py-1">
                        {ROUTES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <select value={o.frequency} onChange={(e) => updateOrder(i, { frequency: e.target.value })}
                        className="rounded border border-slate-300 bg-white px-2 py-1">
                        {FREQS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </motion.ul>
            )}
            <button onClick={submit} disabled={orders.length === 0}
              className="mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              Submit order
            </button>
          </div>
        </section>
      </main>
      {errPanel.panel}
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return <p className="mt-2 text-sm"><span className="text-xs uppercase tracking-wider text-indigo-700">{label}:</span> {String(value)}</p>;
}
function Loading() {
  return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading case...</main>;
}
