import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-DCFOkmRx.mjs";
import { t as toastScore, M as MODE_TIMERS, c as computeScore, s as submitScore } from "./shared-Bfopko4w.mjs";
import { u as useAuthStore } from "./router-Cn57AZkw.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { f as ClipboardList, D as Database, ab as Terminal, ac as Plus, h as HeartPulse, W as Trash2, O as TriangleAlert } from "../_libs/lucide-react.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "./vendor-tanstack-DQdgH_5g.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const ROUTES = ["oral", "IV", "IM", "SC"];
const FREQS = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];
function ClinicalEkgFloor() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none fixed inset-x-0 bottom-0 z-0 h-28 overflow-hidden opacity-45", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-0 h-px bg-indigo-300/25" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ekg-scroll absolute inset-x-[-40%] bottom-5 h-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 640 90", className: "h-full w-[200%]", preserveAspectRatio: "none", children: [0, 640].map((offset) => /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: `${offset + 0},50 ${offset + 58},50 ${offset + 72},28 ${offset + 88},68 ${offset + 104},50 ${offset + 170},50 ${offset + 188},12 ${offset + 206},78 ${offset + 224},50 ${offset + 305},50 ${offset + 326},40 ${offset + 348},62 ${offset + 370},50 ${offset + 472},50 ${offset + 490},24 ${offset + 510},70 ${offset + 532},50 ${offset + 640},50`, fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", className: "text-indigo-300" }, offset)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-500/10 to-transparent" })
  ] });
}
function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function bpPercent(value) {
  const systolic = Number(value.match(/\d+/)?.[0]);
  if (!Number.isFinite(systolic)) return 70;
  return Math.max(35, Math.min(100, (systolic - 80) / 80 * 100));
}
function VitalWave({
  label,
  value,
  pct,
  tone = "primary"
}) {
  const theme = tone === "red" ? {
    wrap: "border-red-400/35 bg-red-500/10 shadow-[0_14px_34px_-28px_rgba(239,68,68,0.9)]",
    label: "text-red-200",
    value: "text-red-50",
    track: "bg-red-950/45",
    fill: "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.7)]",
    stroke: "rgb(239 68 68)",
    glow: "rgba(239,68,68,0.65)"
  } : tone === "sky" ? {
    wrap: "border-sky-300/35 bg-sky-400/10 shadow-[0_14px_34px_-28px_rgba(14,165,233,0.9)]",
    label: "text-sky-200",
    value: "text-sky-50",
    track: "bg-sky-950/45",
    fill: "bg-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.7)]",
    stroke: "rgb(14 165 233)",
    glow: "rgba(14,165,233,0.65)"
  } : {
    wrap: "border-emerald-300/35 bg-emerald-400/10 shadow-[0_14px_34px_-28px_rgba(16,185,129,0.9)]",
    label: "text-emerald-200",
    value: "text-emerald-50",
    track: "bg-emerald-950/45",
    fill: "bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.7)]",
    stroke: "rgb(16 185 129)",
    glow: "rgba(16,185,129,0.65)"
  };
  const safePct = Math.max(8, Math.min(100, Number.isFinite(pct) ? pct : 72));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative overflow-hidden rounded-xl border p-2.5 ${theme.wrap}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 opacity-45", style: {
      backgroundImage: "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
      backgroundSize: "12px 12px"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 font-mono text-[10px] font-black uppercase tracking-wider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: theme.label, children: label }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 150 34", className: "h-9 min-w-0 flex-1", preserveAspectRatio: "none", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "0,19 18,19 24,19 30,10 36,26 43,19 58,19 64,19 70,5 77,31 84,19 101,19 110,14 118,24 126,19 150,19", fill: "none", stroke: theme.stroke, strokeWidth: "2.6", strokeLinecap: "round", strokeLinejoin: "round", className: "vital-ecg-line", style: {
        filter: `drop-shadow(0 0 5px ${theme.glow})`
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-16 text-right font-mono text-xs font-black tabular-nums ${theme.value}`, children: value })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `relative mt-1.5 h-1.5 overflow-hidden rounded-full ${theme.track}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full rounded-full ${theme.fill}`, style: {
      width: `${safePct}%`,
      transition: "width 0.7s ease"
    } }) })
  ] });
}
function ClinicalAlarmBanner({
  message
}) {
  if (!message) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-x-0 top-16 z-[70] mx-auto max-w-4xl px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "score-toast-wrong flex items-center gap-3 rounded-2xl border border-red-400/60 bg-red-950/95 px-4 py-3 text-sm font-bold text-red-50 shadow-[0_0_45px_-12px_rgba(239,68,68,0.9)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-5 w-5 shrink-0 animate-pulse text-red-200" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono uppercase tracking-wider", children: "Clinical alert" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: message })
  ] }) });
}
function listFromJson(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => Array.isArray(item) ? item : [item]).map((item) => String(item ?? "").trim()).filter((item) => item.length > 0 && !/^(none|null|undefined|n\/a)$/i.test(item));
  }
  return [];
}
function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}
function buildClinicalChart(caseData, patient) {
  const correctOrders = caseData?.correct_answer_json?.drugs ?? [];
  const diagnosis = firstText(patient.diagnosis, patient.condition, caseData?.title, "Clinical review") ?? "Clinical review";
  const diagnosisLower = diagnosis.toLowerCase();
  const currentMeds = listFromJson(patient.current_meds ?? patient.currentMeds ?? patient.medications ?? patient.home_meds);
  const generatedMeds = currentMeds.length > 0 ? currentMeds : diagnosisLower.includes("pneumonia") || diagnosisLower.includes("cap") ? ["Paracetamol 500 mg PO PRN fever", "Salbutamol inhaler PRN wheeze", "No chronic medicines documented"] : diagnosisLower.includes("diabetes") ? ["Metformin 500 mg PO twice daily", "Atorvastatin 20 mg PO at night"] : diagnosisLower.includes("hypertension") || diagnosisLower.includes("cardiac") ? ["Amlodipine 5 mg PO once daily", "Aspirin 75 mg PO once daily"] : ["Medication history pending reconciliation", "No high-risk home medicine documented"];
  const defaultLabs = diagnosisLower.includes("pneumonia") || diagnosisLower.includes("cap") ? {
    WBC: "13.8 x10^9/L",
    CRP: "68 mg/L",
    "S. Creatinine": patient?.labs?.Cr ?? patient?.labs?.creatinine ?? 78,
    eGFR: patient?.labs?.eGFR ?? 92,
    ALT: "24 U/L",
    Potassium: "4.2 mmol/L"
  } : diagnosisLower.includes("renal") || diagnosisLower.includes("kidney") ? {
    "S. Creatinine": patient?.labs?.Cr ?? patient?.labs?.creatinine ?? 142,
    eGFR: patient?.labs?.eGFR ?? 48,
    Urea: "12 mmol/L",
    Potassium: "4.9 mmol/L",
    Sodium: "136 mmol/L",
    Hb: "11.2 g/dL"
  } : {
    WBC: "8.4 x10^9/L",
    "S. Creatinine": patient?.labs?.Cr ?? patient?.labs?.creatinine ?? 82,
    eGFR: patient?.labs?.eGFR ?? 88,
    ALT: "28 U/L",
    Potassium: "4.1 mmol/L",
    Sodium: "139 mmol/L"
  };
  const labs = {
    ...defaultLabs,
    ...patient.labs ?? {}
  };
  const orderSummary = correctOrders.length > 0 ? correctOrders.map((o) => [o.drug, o.dose ? `${o.dose} mg` : "", o.route, o.frequency].filter(Boolean).join(" ")).join("; ") : "Start evidence-based therapy after formulary review";
  const physicianOrder = firstText(patient.order, patient.physician_order, patient.physicianOrder, caseData?.correct_answer_json?.order) ?? `${diagnosis}: review allergies, renal function, and initiate appropriate treatment. Suggested order target: ${orderSummary}.`;
  return {
    currentMeds: generatedMeds,
    labs,
    physicianOrder
  };
}
function HospitalGame({
  mode
}) {
  const LIMIT = MODE_TIMERS[mode];
  const onExit = useGameExit("/modes");
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice(mode);
  const {
    profile
  } = useAuthStore();
  const {
    caseData,
    loading,
    next
  } = useCaseLoader(mode, difficulty);
  const [allDrugs, setAllDrugs] = reactExports.useState([]);
  const [orders, setOrders] = reactExports.useState([]);
  const [search, setSearch] = reactExports.useState("");
  const [hints, setHints] = reactExports.useState(0);
  const [result, setResult] = reactExports.useState(null);
  const [done, setDone] = reactExports.useState(false);
  const [alarm, setAlarm] = reactExports.useState(null);
  const [chartTab, setChartTab] = reactExports.useState("vitals");
  const timer = useTimer(LIMIT, () => !done && finish(true));
  const errPanel = useErrorPanel({
    mode,
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  reactExports.useEffect(() => {
    supabase.from("drugs").select("*").then(({
      data
    }) => setAllDrugs(data ?? []));
  }, []);
  reactExports.useEffect(() => {
    setOrders([]);
    setHints(0);
    setResult(null);
    setDone(false);
    setSearch("");
    setAlarm(null);
    setChartTab("vitals");
  }, [caseData?.id]);
  reactExports.useEffect(() => {
    if (!alarm) return;
    const id = window.setTimeout(() => setAlarm(null), 4600);
    return () => window.clearTimeout(id);
  }, [alarm]);
  const filtered = reactExports.useMemo(() => allDrugs.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8), [allDrugs, search]);
  function addOrder(d) {
    setOrders((o) => [...o, {
      drug: d.name,
      dose: "",
      route: "oral",
      frequency: "once daily"
    }]);
    setSearch("");
    const correctOrders = caseData?.correct_answer_json?.drugs ?? [];
    const isExpected = correctOrders.find((co) => co.drug?.toLowerCase() === d.name.toLowerCase());
    const ints = orders.map((o) => o.drug).filter((existing) => {
      const a = allDrugs.find((x) => x.name === existing);
      return a?.interactions?.includes(d.name) || d.interactions?.includes(existing);
    });
    if (ints.length) {
      const message = `Interaction: ${d.name} + ${ints.join(", ")}`;
      setAlarm(message);
      toast.warning(message, {
        duration: 5e3
      });
      errPanel.logError({
        errorType: "Drug interaction risk",
        wrongChoice: `${d.name} + ${ints.join(", ")}`,
        correctChoice: `Remove ${d.name} or replace with a non-interacting alternative; add monitoring if combination is unavoidable.`,
        whyWrong: `${d.name} interacts with ${ints.join(", ")}, increasing risk of toxicity, reduced efficacy, or serious adverse events.`,
        whatToKnow: "Always run an interaction check before submitting clinical orders. Major interactions require substitution or close monitoring.",
        hint: "Check the patient's current med list before adding a new drug."
      });
    }
    const eGFR = caseData?.patient_info_json?.labs?.eGFR;
    if (eGFR && eGFR < 60 && d.contraindications?.some((c) => /renal/i.test(c))) {
      const message = `Renal caution: eGFR ${eGFR}, dose-adjust ${d.name}`;
      setAlarm(message);
      toast.warning(message, {
        duration: 5e3
      });
      errPanel.logError({
        errorType: "Renal dosing alert",
        wrongChoice: `${d.name} at standard dose with eGFR ${eGFR}`,
        correctChoice: `Dose-adjust ${d.name} for renal impairment, or choose a non-renally-cleared alternative.`,
        whyWrong: `Patient eGFR is ${eGFR} mL/min. ${d.name} is renally cleared/contraindicated and will accumulate to toxic levels at standard dose.`,
        whatToKnow: "Check renal function before prescribing renally-cleared drugs. Adjust dose or frequency per local renal dosing guideline."
      });
    }
    if (!isExpected && !ints.length) {
      errPanel.logError({
        errorType: "Drug not indicated for this patient",
        wrongChoice: d.name,
        correctChoice: correctOrders.map((c) => c.drug).join(", "),
        whyWrong: `${d.name} doesn't match this patient's diagnosis or order. Adding it adds unnecessary risk without clinical benefit.`,
        whatToKnow: "Clinical orders must match the indication on the physician order. Cross-check allergies, current meds, and labs before adding any drug.",
        hint: "Re-read the physician order and patient diagnosis."
      });
    }
  }
  function updateOrder(i, patch) {
    setOrders((o) => o.map((x, idx) => idx === i ? {
      ...x,
      ...patch
    } : x));
  }
  function removeOrder(i) {
    setOrders((o) => o.filter((_, idx) => idx !== i));
  }
  async function submit() {
    finish(false);
  }
  async function finish(timedOut) {
    setDone(true);
    const correctOrders = caseData?.correct_answer_json?.drugs ?? [];
    const remove = caseData?.correct_answer_json?.remove ?? [];
    let correctDrugs = 0, wrongDrugs = 0, correctLabels = 0, wrongLabels = 0;
    correctOrders.forEach((co) => {
      const found = orders.find((o) => o.drug.toLowerCase() === co.drug.toLowerCase());
      if (found) {
        correctDrugs += 1;
        const ok = found.route === co.route && found.frequency === co.frequency && (co.dose ? String(found.dose).includes(String(co.dose)) : true);
        if (ok) correctLabels += 1;
        else wrongLabels += 1;
      } else wrongDrugs += 1;
    });
    orders.forEach((o) => {
      if (!correctOrders.find((co) => co.drug.toLowerCase() === o.drug.toLowerCase())) wrongDrugs += 1;
    });
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs,
      wrongDrugs,
      correctLabels,
      wrongLabels,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken,
      timeLimitSec: LIMIT,
      timedOut,
      emergencyMultiplier: mode === "emergency"
    });
    const {
      xpGain
    } = await submitScore({
      userId: profile.user_id,
      caseId: caseData.id,
      mode,
      score,
      timeTaken: timer.taken,
      errors: wrongDrugs + wrongLabels,
      correctDrugs,
      totalDrugs: correctOrders.length || 1,
      errorsDetail: errPanel.errors
    });
    setResult({
      score,
      xpGain,
      correctOrders,
      remove
    });
  }
  if (loading || !caseData) return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, {})
  ] });
  if (done && result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FeedbackScreen, { score: result.score, xpGain: result.xpGain, timeTaken: timer.taken, mentorTip: caseData.mentor_tip, explanation: caseData.explanation, drugs: result.correctOrders.map((o) => ({
      name: `${o.drug} ${o.dose}${o.dose ? "mg" : ""} ${o.route} ${o.frequency}`,
      correct: !!orders.find((x) => x.drug.toLowerCase() === o.drug.toLowerCase())
    })), errors: errPanel.errors, onNext: next });
  }
  const patient = caseData.patient_info_json ?? {};
  const clinicalChart = buildClinicalChart(caseData, patient);
  const currentMeds = clinicalChart.currentMeds;
  const vitals = patient.vitals ?? {};
  const hr = toFiniteNumber(vitals.hr ?? vitals.heartRate ?? vitals.pulse, 82);
  const bp = String(vitals.bp ?? vitals.BP ?? "124/78");
  const o2 = toFiniteNumber(vitals.o2 ?? vitals.spo2 ?? vitals.SpO2, 97);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(ClinicalEkgFloor, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ClinicalAlarmBanner, { message: alarm }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "Clinical", onExit, remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: orders.length * 5, onHint: () => {
      setHints((n) => n + 1);
      toastScore(-10, "hint used");
      toast.info(`Hint: ${caseData.mentor_tip}`);
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative z-10 mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.3fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "relative rounded-2xl border border-indigo-300/20 bg-slate-900/55 p-4 text-slate-100 shadow-[0_24px_65px_-38px_rgba(56,189,248,0.6)] backdrop-blur-xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1/2 top-0 h-8 w-28 -translate-x-1/2 -translate-y-3 rounded-b-xl border border-indigo-200/20 bg-slate-700/70 shadow-inner backdrop-blur" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-indigo-200/20 bg-slate-950/45 p-4 shadow-inner backdrop-blur-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "h-3.5 w-3.5" }),
            " Patient file"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-xl font-black", children: patient.name ?? "Clinical Patient" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "border-b border-indigo-200/15 pb-3 text-sm text-slate-300", children: [
            "Age ",
            patient.age ?? "-",
            " | ",
            patient.diagnosis ?? patient.condition ?? "Assessment pending"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex gap-1 border-b border-indigo-200/15 text-[10px] font-bold uppercase tracking-wider text-slate-400", children: ["vitals", "meds", "labs", "order"].map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setChartTab(tab), className: `rounded-t-md px-3 py-1 transition ${chartTab === tab ? "bg-indigo-500/90 text-white shadow-[0_8px_18px_-12px_rgba(99,102,241,0.9)]" : "bg-white/5 hover:bg-indigo-400/15 hover:text-indigo-100"}`, children: tab }, tab)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-52 pt-3", children: [
            chartTab === "vitals" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalWave, { label: "HR", value: `${hr} bpm`, pct: Math.min(100, hr), tone: hr > 100 ? "red" : "primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalWave, { label: "BP", value: bp, pct: bpPercent(bp), tone: "sky" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalWave, { label: "O2", value: `${o2}%`, pct: o2, tone: o2 < 94 ? "red" : "primary" }),
              patient.allergies && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-black uppercase tracking-wider text-amber-200", children: "Allergies:" }),
                " ",
                String(patient.allergies)
              ] })
            ] }),
            chartTab === "meds" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-emerald-200", children: "Medication reconciliation" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-100", children: "Auto-filled" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2 text-sm text-slate-100", children: currentMeds.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 rounded-lg border border-emerald-300/20 bg-slate-950/45 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-1 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.75)]" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: m })
              ] }, i)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 rounded-lg border border-indigo-300/20 bg-indigo-400/10 px-3 py-2 text-xs text-indigo-50", children: "Check allergies, renal function, and interaction risk before building the medication order." })
            ] }),
            chartTab === "labs" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-indigo-200", children: "Labs" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-2 gap-2 text-sm", children: Object.entries(clinicalChart.labs).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-xs text-sky-50", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { className: "text-sky-200", children: [
                  k,
                  ":"
                ] }),
                " ",
                String(v)
              ] }, k)) })
            ] }),
            chartTab === "order" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-indigo-300/25 bg-indigo-400/10 p-3 text-sm text-indigo-50", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-indigo-200", children: "Physician order" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: clinicalChart.physicianOrder })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-2xl border border-indigo-300/25 bg-black/70 p-4 font-mono shadow-[0_18px_60px_-34px_oklch(0.60_0.20_270)] backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-3 border-b border-indigo-300/15 pb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "h-4 w-4" }),
              " Hospital formulary"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-[10px] text-emerald-300", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { className: "h-3 w-3" }),
              " DB ONLINE"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-[10px] uppercase tracking-wider text-indigo-300", children: "Query medication database" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-2 rounded-lg border border-indigo-300/25 bg-slate-950 px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-emerald-300", children: ">" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "search formulary...", className: "w-full bg-transparent text-sm text-emerald-100 outline-none placeholder:text-emerald-100/35" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-4 w-2 animate-pulse bg-emerald-300" })
          ] }),
          !search && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] uppercase tracking-wider text-emerald-200", children: "Case-linked formulary queue" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: (caseData.correct_answer_json?.drugs ?? []).slice(0, 4).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setSearch(o.drug), className: "rounded-full border border-emerald-300/25 bg-slate-950/60 px-3 py-1 text-xs text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-400/15", children: o.drug }, o.drug)) })
          ] }),
          search && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 max-h-48 overflow-y-auto rounded-lg border border-indigo-300/20 bg-slate-950/80", children: filtered.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => addOrder(d), className: "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-indigo-500/15 hover:text-white", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              d.name,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-indigo-200/60", children: [
                "[",
                d.category,
                "]"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "size-4 text-emerald-300" })
          ] }) }, d.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(HeartPulse, { className: "h-3.5 w-3.5 text-primary" }),
            " Order builder"
          ] }),
          orders.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-6 text-center text-sm text-muted-foreground", children: "No orders yet" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(motion.ul, { layout: true, className: "mt-2 space-y-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { initial: false, children: orders.map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.li, { layout: true, initial: {
            opacity: 0,
            y: -28,
            rotateX: -8
          }, animate: {
            opacity: 1,
            y: 0,
            rotateX: 0
          }, exit: {
            opacity: 0,
            x: 24,
            scale: 0.96
          }, transition: {
            type: "spring",
            stiffness: 360,
            damping: 28
          }, className: "relative rounded-lg border border-indigo-200/20 bg-slate-950/55 p-3 text-slate-100 shadow-[0_14px_28px_-24px_rgba(79,70,229,0.9)] backdrop-blur before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-indigo-200/25", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-sm font-black uppercase tracking-wide", children: o.drug }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => removeOrder(i), className: "text-slate-400 hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid grid-cols-3 gap-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { placeholder: "Dose (mg)", value: o.dose, onChange: (e) => updateOrder(i, {
                dose: e.target.value
              }), className: "rounded border border-indigo-200/20 bg-slate-900/80 px-2 py-1 text-slate-100" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: o.route, onChange: (e) => updateOrder(i, {
                route: e.target.value
              }), className: "rounded border border-indigo-200/20 bg-slate-900/80 px-2 py-1 text-slate-100", children: ROUTES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: r }, r)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: o.frequency, onChange: (e) => updateOrder(i, {
                frequency: e.target.value
              }), className: "rounded border border-indigo-200/20 bg-slate-900/80 px-2 py-1 text-slate-100", children: FREQS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: r }, r)) })
            ] })
          ] }, `${o.drug}-${i}`)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: submit, disabled: orders.length === 0, className: "mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Submit order" })
        ] })
      ] })
    ] }),
    errPanel.panel
  ] });
}
function Loading() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading case..." });
}
const SplitNotFoundComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8", children: "Not found" });
export {
  HospitalGame,
  SplitNotFoundComponent as notFoundComponent
};
