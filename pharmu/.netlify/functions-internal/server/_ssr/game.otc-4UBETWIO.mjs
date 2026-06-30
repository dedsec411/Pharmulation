import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-EgUqRVpw.mjs";
import { S as SimulatedPrescription } from "./SimulatedPrescription-BtzF8rKo.mjs";
import { M as ModeTheme } from "./ModeTheme-Dcsp8zjD.mjs";
import { t as toastScore, a as MODE_TIMERS, c as computeScore, s as submitScore } from "./shared-JKtrmWmg.mjs";
import { u as useAuthStore } from "./router-BNcp_T-P.mjs";
import "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { J as User } from "../_libs/lucide-react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
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
import "./client-Bd0g9e26.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "./vendor-tanstack-B1LzCUcS.mjs";
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
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const LIMIT = MODE_TIMERS.otc;
function OtcGame() {
  const onExit = useGameExit("/modes");
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice("otc");
  const {
    profile
  } = useAuthStore();
  const {
    caseData,
    loading,
    next
  } = useCaseLoader("otc", difficulty);
  const [step, setStep] = reactExports.useState("questions");
  const [qi, setQi] = reactExports.useState(0);
  const [correct, setCorrect] = reactExports.useState(0);
  const [wrong, setWrong] = reactExports.useState(0);
  const [hints, setHints] = reactExports.useState(0);
  const [quantity, setQuantity] = reactExports.useState(1);
  const [result, setResult] = reactExports.useState(null);
  const timer = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "otc",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  reactExports.useEffect(() => {
    setStep("questions");
    setQi(0);
    setCorrect(0);
    setWrong(0);
    setHints(0);
    setQuantity(1);
    setResult(null);
  }, [caseData?.id]);
  if (loading || !caseData) return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, {})
  ] });
  const ans = caseData.correct_answer_json ?? {};
  const questions = ans.questions ?? [];
  function pickQuestion(i) {
    const q = questions[qi];
    if (i === q.correct) {
      setCorrect((n) => n + 1);
      toastScore(20, "good question");
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, "wrong path");
      errPanel.logError({
        errorType: "Irrelevant follow-up question",
        wrongChoice: q.choices?.[i] ?? "",
        correctChoice: q.choices?.[q.correct],
        whyWrong: "That question doesn't help narrow down the diagnosis here and wastes the consultation.",
        whatToKnow: "Priority OTC questions establish duration, severity, associated symptoms, current medications, and red flag signs.",
        hint: "Ask about onset, severity, or red-flag features first."
      });
    }
    if (qi + 1 < questions.length) setQi((x) => x + 1);
    else setStep("drug");
  }
  function pickDrug(opt) {
    if (opt === ans.correct_drug) {
      setCorrect((n) => n + 1);
      toastScore(20, "correct drug");
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, "wrong drug");
      errPanel.logError({
        errorType: "Wrong OTC recommendation",
        wrongChoice: opt,
        correctChoice: ans.correct_drug,
        whyWrong: `${opt} is not appropriate for this patient given their presenting symptoms, history, or contraindications.`,
        whatToKnow: "Match OTC product to symptom + screen for red flags, pregnancy, allergies, and current meds before recommending.",
        hint: "Consider this patient's specific risk factors and symptom pattern."
      });
    }
    setStep("dose");
  }
  function pickDose(opt) {
    if (opt === ans.correct_dose) {
      setCorrect((n) => n + 1);
      toastScore(25, "correct dose");
    } else {
      setWrong((n) => n + 1);
      toastScore(-10, "wrong dose");
      errPanel.logError({
        errorType: "Wrong dose",
        wrongChoice: opt,
        correctChoice: ans.correct_dose,
        whyWrong: `${opt} is outside the safe/effective range for this patient.`,
        whatToKnow: "OTC dosing depends on age, weight, renal/hepatic function, and product strength. Always check the pack labelling."
      });
    }
    setQuantity(getCorrectQuantity(ans));
    setStep("quantity");
  }
  function submitQuantity(qty) {
    const expected = getCorrectQuantity(ans);
    if (qty === expected) {
      setCorrect((n) => n + 1);
      toastScore(10, "correct quantity");
    } else {
      setWrong((n) => n + 1);
      toastScore(-5, "quantity off");
      errPanel.logError({
        errorType: "Wrong OTC quantity",
        wrongChoice: `${qty} pack${qty === 1 ? "" : "s"}`,
        correctChoice: `${expected} pack${expected === 1 ? "" : "s"}`,
        whyWrong: "The quantity should match the recommended OTC course without oversupplying or leaving the patient short.",
        whatToKnow: "OTC quantity should follow dose, duration, pack size, safety limits, and referral advice."
      });
    }
    setStep("advice");
  }
  async function pickAdvice(opt) {
    let cl = 0, wl = 0;
    if (opt === ans.correct_advice) {
      cl = 1;
      toastScore(25, "good counseling");
    } else {
      wl = 1;
      toastScore(-10, "off counseling");
      errPanel.logError({
        errorType: "Wrong counseling advice",
        wrongChoice: opt,
        correctChoice: ans.correct_advice,
        whyWrong: "That advice is incomplete or misleading for this scenario and could harm the patient or reduce efficacy.",
        whatToKnow: "Counseling should cover how to take it, what to expect, side effects to watch for, and when to seek further help."
      });
    }
    finish(false, cl, wl);
  }
  async function finish(timedOut, cl = 0, wl = 0) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct,
      wrongDrugs: wrong,
      correctLabels: cl,
      wrongLabels: wl,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken,
      timeLimitSec: LIMIT,
      timedOut
    });
    const {
      xpGain
    } = await submitScore({
      userId: profile.user_id,
      caseId: caseData.id,
      mode: "otc",
      score,
      timeTaken: timer.taken,
      errors: wrong + wl,
      correctDrugs: correct,
      totalDrugs: questions.length + 4,
      errorsDetail: errPanel.errors
    });
    setResult({
      score,
      xpGain
    });
    setStep("done");
  }
  if (step === "done" && result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FeedbackScreen, { score: result.score, xpGain: result.xpGain, timeTaken: timer.taken, mentorTip: caseData.mentor_tip, explanation: caseData.explanation, drugs: [{
      name: ans.correct_drug,
      correct: true,
      info: `${ans.correct_dose} · Qty ${quantity}`
    }], errors: errPanel.errors, onNext: next });
  }
  const currentScore = correct * 20 - wrong * 15;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "OTC", remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: currentScore, onExit, onHint: () => {
      setHints((n) => n + 1);
      toastScore(-10, "hint used");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto grid max-w-6xl gap-4 px-4 py-6 xl:grid-cols-[1.05fr_1fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Patient" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid size-12 place-items-center rounded-full bg-primary/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-6 text-primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: caseData.patient_info_json?.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "Age ",
              caseData.patient_info_json?.age ?? "—"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-4 space-y-1 text-xs text-muted-foreground", children: Object.entries(caseData.patient_info_json ?? {}).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-foreground", children: [
            k,
            ":"
          ] }),
          " ",
          String(v)
        ] }, k)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 overflow-hidden rounded-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SimulatedPrescription, { caseData, department: "OTC Consultation Training" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 8
      }, animate: {
        opacity: 1,
        y: 0
      }, className: "rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur", children: [
        step === "questions" && questions[qi] && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "rounded-lg bg-primary/10 p-3 text-sm italic text-primary", children: [
            '"',
            qi === 0 ? ans.complaint : questions[qi].q,
            '"'
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Ask" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid gap-2 sm:grid-cols-2", children: questions[qi].choices.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => pickQuestion(i), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5", children: c }, i)) })
        ] }),
        step === "drug" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Recommend a medication", options: ans.drug_options ?? [], onPick: pickDrug }),
        step === "dose" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Choose correct dose", options: ans.dose_options ?? [], onPick: pickDose }),
        step === "quantity" && /* @__PURE__ */ jsxRuntimeExports.jsx(QuantitySlider, { value: quantity, max: getQuantityMax(ans), onChange: setQuantity, onSubmit: submitQuantity }),
        step === "advice" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Counsel the patient", options: ans.advice_options ?? [], onPick: pickAdvice })
      ] }, `${step}-${qi}`) })
    ] }),
    errPanel.panel
  ] });
}
function getCorrectQuantity(ans) {
  const raw = ans.correct_quantity ?? ans.quantity ?? ans.recommended_quantity ?? ans.pack_quantity ?? 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}
function getQuantityMax(ans) {
  return Math.max(5, getCorrectQuantity(ans) + 2);
}
function QuantitySlider({
  value,
  max,
  onChange,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: "Select quantity" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Dispense quantity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-mono text-4xl font-black tabular-nums text-primary", children: value })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary", children: value === 1 ? "1 pack" : `${value} packs` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 1, max, step: 1, value, onChange: (e) => onChange(Number(e.target.value)), className: "mt-5 w-full accent-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex justify-between font-mono text-[10px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: max })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onSubmit(value), className: "mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-primary-foreground shadow-[0_0_32px_-14px_oklch(0.74_0.14_180/0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90", children: "Confirm quantity" })
    ] })
  ] });
}
function Picker({
  title,
  options,
  onPick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-2", children: options.map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onPick(o), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5", children: o }, i)) })
  ] });
}
function Loading() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading case…" });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "otc", children: /* @__PURE__ */ jsxRuntimeExports.jsx(OtcGame, {}) });
export {
  SplitComponent as component
};
