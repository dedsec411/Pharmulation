import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { a as useDifficultyChoice, b as useCaseLoader, u as useGameExit, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-COUs_biP.mjs";
import { M as ModeTheme } from "./ModeTheme-Dcsp8zjD.mjs";
import { S as SimulatedPrescription, O as OtcScenarioPanel, g as getOtcQuestionOptions, a as getOtcSelectedQuestionText, b as getOtcPatientResponse, i as isOtcQuestionChoiceCorrect, c as getOtcCorrectQuestionText, d as getOtcCorrectChoices, f as formatOtcCorrectChoice } from "./OtcScenarioPanel-Bcmb_myo.mjs";
import { c as computeScore, s as submitScore, t as toastScore } from "./shared-CP2LLHvv.mjs";
import { u as useAuthStore } from "./router-BNwBbsCq.mjs";
import { p as prepareDrugCatalog, R as RX_DRUG_CATEGORIES, g as getBrandsForDrug } from "./drug-catalog-DKPW6qki.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import { x as FileText, ae as ShoppingBag, g as ClipboardList, Y as Trash2, V as ArrowLeft, P as Pill, W as Tags, X, J as User, Z as Check } from "../_libs/lucide-react.mjs";
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
import "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "./vendor-tanstack-Csp-bHi_.mjs";
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
const LIMIT_RX = 180;
const LIMIT_OTC = 120;
const FREQS = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];
const TIMINGS = ["morning", "with food", "before sleep", "as needed"];
const DURATIONS = ["7 days", "14 days", "4 weeks", "ongoing"];
function CommunityFloatingPills({
  className = ""
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `pointer-events-none absolute inset-0 overflow-hidden ${className}`, "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "floating-pill absolute left-[5%] top-[14%] h-3 w-12 rounded-full bg-gradient-to-r from-primary to-white/80 shadow-[0_0_22px_oklch(0.74_0.14_180/0.4)]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "floating-pill absolute right-[10%] top-[22%] h-4 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-primary [animation-delay:-2.5s]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "floating-pill absolute bottom-[18%] left-[16%] h-3 w-10 rounded-full bg-gradient-to-r from-white/85 to-emerald-300 [animation-delay:-5s]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "floating-pill absolute bottom-[10%] right-[28%] h-3.5 w-12 rounded-full bg-gradient-to-r from-primary to-sky-200 [animation-delay:-7s]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "floating-pill absolute left-[52%] top-[44%] h-3 w-9 rounded-full bg-gradient-to-r from-emerald-300 to-white/75 [animation-delay:-9s]" })
  ] });
}
function SubmodeBadge({
  mode
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${mode === "rx" ? "bg-blue-500/15 text-blue-300 border border-blue-500/30" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"}`, children: [
    mode === "rx" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-3 w-3" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingBag, { className: "h-3 w-3" }),
    mode === "rx" ? "Rx Cases" : "OTC Consultation"
  ] });
}
function CommunityGame() {
  const [activeMode, setActiveMode] = reactExports.useState(null);
  if (!activeMode) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityModePicker, { onPick: setActiveMode });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityRun, { activeMode });
}
function CommunityModePicker({
  onPick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityFloatingPills, { className: "opacity-45" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
      opacity: 0,
      y: 10
    }, animate: {
      opacity: 1,
      y: 0
    }, className: "relative z-10 w-full rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.24em] text-primary", children: "Community Pharmacy" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-3 text-3xl font-black tracking-tight md:text-4xl", children: "Choose your training type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Pick whether you want to practice prescription dispensing or OTC patient consultation." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 grid gap-4 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onPick("rx"), className: "group rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400/60 hover:bg-blue-500/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "size-6" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-blue-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200", children: "Rx" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-5 text-xl font-bold", children: "Rx Cases" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Read a simulated prescription, collect the required medicines, review drug info, and create labels." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-5 inline-flex text-sm font-semibold text-blue-200 transition group-hover:translate-x-1", children: "Play Rx Cases →" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => onPick("otc"), className: "group rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-500/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShoppingBag, { className: "size-6" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200", children: "OTC" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-5 text-xl font-bold", children: "OTC Consultation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Ask follow-up questions, choose the safest medicine, pick the dose, and counsel the patient." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-5 inline-flex text-sm font-semibold text-emerald-200 transition group-hover:translate-x-1", children: "Play OTC →" })
        ] })
      ] })
    ] })
  ] });
}
function CommunityRun({
  activeMode
}) {
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice(activeMode);
  const rxLoader = useCaseLoader("rx", difficulty);
  const otcLoader = useCaseLoader("otc", difficulty);
  const loader = activeMode === "rx" ? rxLoader : otcLoader;
  const LIMIT = activeMode === "rx" ? LIMIT_RX : LIMIT_OTC;
  if (loader.loading || !loader.caseData) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      difficultyModal,
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-4xl animate-pulse", children: "Rx" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm", children: "Loading community case..." })
      ] }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    activeMode === "rx" ? /* @__PURE__ */ jsxRuntimeExports.jsx(RxGame, { caseData: loader.caseData, next: loader.next, LIMIT }) : /* @__PURE__ */ jsxRuntimeExports.jsx(OtcGame, { caseData: loader.caseData, next: loader.next, LIMIT })
  ] });
}
function RxGame({
  caseData,
  next,
  LIMIT
}) {
  const {
    profile
  } = useAuthStore();
  const onExit = useGameExit("/modes");
  const [phase, setPhase] = reactExports.useState("collect");
  const [collected, setCollected] = reactExports.useState([]);
  const [wrong, setWrong] = reactExports.useState(0);
  const [correct, setCorrect] = reactExports.useState(0);
  const [infoRead, setInfoRead] = reactExports.useState(0);
  const [correctLabels, setCorrectLabels] = reactExports.useState(0);
  const [wrongLabels, setWrongLabels] = reactExports.useState(0);
  const [compoundCorrect, setCompoundCorrect] = reactExports.useState(0);
  const [compoundWrong, setCompoundWrong] = reactExports.useState(0);
  const [compoundCompleted, setCompoundCompleted] = reactExports.useState(false);
  const [hints, setHints] = reactExports.useState(0);
  const [showClean, setShowClean] = reactExports.useState(false);
  const [category, setCategory] = reactExports.useState("");
  const [drugs, setDrugs] = reactExports.useState([]);
  const [brandDrug, setBrandDrug] = reactExports.useState(null);
  const [selectedBrands, setSelectedBrands] = reactExports.useState({});
  const [infoIdx, setInfoIdx] = reactExports.useState(0);
  const [labelIdx, setLabelIdx] = reactExports.useState(0);
  const [labelAnswers, setLabelAnswers] = reactExports.useState({});
  const [result, setResult] = reactExports.useState(null);
  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "rx",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  reactExports.useEffect(() => {
    supabase.from("drugs").select("*").then(({
      data
    }) => setDrugs(data ?? []));
  }, []);
  reactExports.useEffect(() => {
    setPhase("collect");
    setCollected([]);
    setWrong(0);
    setCorrect(0);
    setInfoRead(0);
    setCorrectLabels(0);
    setWrongLabels(0);
    setCompoundCorrect(0);
    setCompoundWrong(0);
    setCompoundCompleted(false);
    setHints(0);
    setCategory("");
    setBrandDrug(null);
    setSelectedBrands({});
    setShowClean(false);
    setInfoIdx(0);
    setLabelIdx(0);
    setLabelAnswers({});
    setResult(null);
  }, [caseData?.id]);
  const required = caseData?.drugs_required ?? [];
  const catalogDrugs = reactExports.useMemo(() => prepareDrugCatalog(drugs), [drugs]);
  const filtered = reactExports.useMemo(() => catalogDrugs.filter((d) => d.category === category), [catalogDrugs, category]);
  const categoryStats = reactExports.useMemo(() => RX_DRUG_CATEGORIES.map((name) => ({
    name,
    count: catalogDrugs.filter((d) => d.category === name).length
  })), [catalogDrugs]);
  const compoundTriggerDrug = String(caseData?.correct_answer_json?.compound_trigger_drug ?? "").trim();
  const hasCompoundTrigger = !!caseData?.requires_compounding && !!compoundTriggerDrug;
  function matchesCompoundTrigger(name) {
    return hasCompoundTrigger && normalizeText(name) === normalizeText(compoundTriggerDrug);
  }
  function maybeStartCompound(name) {
    if (matchesCompoundTrigger(name) && !compoundCompleted) {
      setPhase("compound");
    }
  }
  function openBrandSelection(drug) {
    const name = drug.name;
    if (collected.includes(name)) return;
    if (!required.includes(name)) {
      setWrong((n) => n + 1);
      toastScore(-15, `wrong: ${name}`);
      errPanel.logError({
        errorType: "Wrong drug selected",
        wrongChoice: name,
        correctChoice: required.join(", "),
        whyWrong: `${name} is not indicated for this prescription.${drug?.indications?.length ? ` It is used for ${drug.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: "Think about the class of drug that treats the condition in this prescription."
      });
      return;
    }
    setBrandDrug(drug);
  }
  function addDrug(name, brand) {
    if (collected.includes(name)) return;
    setCollected((c) => [...c, name]);
    if (brand) setSelectedBrands((m) => ({
      ...m,
      [name]: brand
    }));
    setCorrect((n) => n + 1);
    toastScore(20, brand ? `${name} - ${brand}` : name);
    maybeStartCompound(name);
  }
  function removeDrug(name) {
    setCollected((x) => x.filter((n) => n !== name));
    setSelectedBrands((m) => {
      const nextBrands = {
        ...m
      };
      delete nextBrands[name];
      return nextBrands;
    });
  }
  function selectBrand(drug, brand) {
    addDrug(drug.name, brand);
    setBrandDrug(null);
  }
  function confirmCollection() {
    if (required.some((r) => !collected.includes(r))) {
      toast.warning("Some required drugs still missing");
      return;
    }
    if (hasCompoundTrigger && !compoundCompleted && collected.some(matchesCompoundTrigger)) {
      setPhase("compound");
      return;
    }
    setPhase("info");
  }
  const correctDrugs = collected.filter((c) => required.includes(c));
  function markInfo() {
    setInfoRead((n) => n + 1);
    toastScore(15, "info read");
    if (infoIdx + 1 < correctDrugs.length) setInfoIdx((i) => i + 1);
    else setPhase("label");
  }
  function submitLabel(drug, ans) {
    const correctAns = caseData?.correct_answer_json?.labels?.[drug];
    const ok = correctAns && ans.frequency === correctAns.frequency && ans.timing === correctAns.timing && ans.duration === correctAns.duration;
    setLabelAnswers((m) => ({
      ...m,
      [drug]: {
        ans,
        ok,
        correct: correctAns
      }
    }));
    if (ok) {
      setCorrectLabels((n) => n + 1);
      toastScore(25, "label OK");
    } else {
      setWrongLabels((n) => n + 1);
      toastScore(-10, "label off");
      if (correctAns) {
        const fields = [];
        if (ans.frequency !== correctAns.frequency) fields.push(`frequency`);
        if (ans.timing !== correctAns.timing) fields.push(`timing`);
        if (ans.duration !== correctAns.duration) fields.push(`duration`);
        errPanel.logError({
          errorType: "Wrong label",
          wrongChoice: `${drug}: ${ans.frequency} · ${ans.timing} · ${ans.duration}`,
          correctChoice: `${correctAns.frequency} · ${correctAns.timing} · ${correctAns.duration}`,
          whyWrong: `Your label for ${drug} is off on ${fields.join(", ")}.`,
          whatToKnow: `Label instructions for ${drug} are based on its half-life, food interactions, and recommended course duration.`
        });
      }
    }
    if (labelIdx + 1 < correctDrugs.length) setLabelIdx((i) => i + 1);
    else finish(false);
  }
  function recordCompoundAnswer(ok, error) {
    if (ok) {
      setCompoundCorrect((n) => n + 1);
      toastScore(25, "compound OK");
    } else {
      setCompoundWrong((n) => n + 1);
      toastScore(-15, "compound error");
      errPanel.logError(error);
    }
  }
  function submitCompound(submission) {
    const data = caseData?.compound_data ?? {};
    const type = caseData?.compound_type;
    if (submission.type === "topical") {
      const baseOk = normalizeText(submission.base) === normalizeText(data.correct_base);
      const gramsOk = withinTolerance(submission.grams, Number(data.correct_drug_grams), 0.05);
      recordCompoundAnswer(baseOk, {
        errorType: "Wrong compounding base",
        wrongChoice: submission.base || "No base selected",
        correctChoice: String(data.correct_base ?? "Correct base"),
        whyWrong: "The selected base may not suit the prescribed topical dosage form, drug compatibility, or patient use site.",
        whatToKnow: "Topical compounding starts with the correct vehicle. Lotion, cream, gel, and ointment bases change spreadability, absorption, and stability."
      });
      recordCompoundAnswer(gramsOk, {
        errorType: "Wrong topical compound calculation",
        wrongChoice: `${submission.grams || 0} g`,
        correctChoice: `${data.correct_drug_grams} g`,
        whyWrong: "The active ingredient amount must match the target percent and final batch size. Too much or too little changes dose delivered to the skin.",
        whatToKnow: "Use: (target percent / 100) x total grams = grams of active drug needed."
      });
    } else if (submission.type === "iv_sterile") {
      const diluentOk = normalizeText(submission.diluent) === normalizeText(data.correct_diluent);
      const volumeOk = withinTolerance(submission.volume, Number(data.correct_volume_ml), 0.05);
      recordCompoundAnswer(diluentOk, {
        errorType: "Wrong sterile IV diluent",
        wrongChoice: submission.diluent || "No diluent selected",
        correctChoice: String(data.correct_diluent ?? "Correct diluent"),
        whyWrong: "The wrong diluent can cause incompatibility, precipitation, instability, or unsafe administration.",
        whatToKnow: "Sterile IV preparation requires correct diluent, aseptic technique, concentration check, and route-specific labeling."
      });
      recordCompoundAnswer(volumeOk, {
        errorType: "Wrong sterile IV volume calculation",
        wrongChoice: `${submission.volume || 0} mL`,
        correctChoice: `${data.correct_volume_ml} mL`,
        whyWrong: "The drawn stock volume must deliver the exact target dose. A wrong volume creates an underdose or overdose.",
        whatToKnow: "Use: target dose / stock concentration = volume needed."
      });
    } else if (submission.type === "antibiotic_dilution") {
      const volumeOk = withinTolerance(submission.volume, Number(data.correct_volume_ml), 0.05);
      const stabilityOk = normalizeText(submission.stability) === normalizeText(String(data.correct_stability_days));
      recordCompoundAnswer(volumeOk, {
        errorType: "Wrong antibiotic reconstitution volume",
        wrongChoice: `${submission.volume || 0} mL`,
        correctChoice: `${data.correct_volume_ml} mL`,
        whyWrong: "The reconstitution volume determines final concentration. Wrong concentration can break dilution instructions and dosing accuracy.",
        whatToKnow: "Check vial strength, final volume, target concentration, diluent compatibility, and infusion labeling."
      });
      recordCompoundAnswer(stabilityOk, {
        errorType: "Wrong antibiotic stability",
        wrongChoice: `${submission.stability || "No answer"} days`,
        correctChoice: `${data.correct_stability_days} days`,
        whyWrong: "Using a reconstituted antibiotic beyond its stability window can reduce potency or increase contamination risk.",
        whatToKnow: "Always label beyond-use dating after reconstitution and storage conditions."
      });
    } else {
      errPanel.logError({
        errorType: "Unknown compounding type",
        wrongChoice: String(type ?? "missing"),
        correctChoice: "topical, iv_sterile, or antibiotic_dilution",
        whyWrong: "This case is marked for compounding but does not define a supported compounding workflow.",
        whatToKnow: "Compounding cases need a compound_type and compound_data object before they can be safely simulated."
      });
    }
    setCompoundCompleted(true);
    setPhase("info");
  }
  async function finish(timedOut) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct,
      wrongDrugs: wrong + compoundWrong,
      infoRead,
      correctLabels: correctLabels + compoundCorrect,
      wrongLabels,
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
      mode: "rx",
      score,
      timeTaken: timer.taken,
      errors: wrong + wrongLabels + compoundWrong,
      correctDrugs: correct + compoundCorrect,
      totalDrugs: required.length + compoundCorrect + compoundWrong,
      errorsDetail: errPanel.errors
    });
    setResult({
      score,
      xpGain
    });
    setPhase("done");
  }
  if (phase === "done" && result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FeedbackScreen, { score: result.score, xpGain: result.xpGain, timeTaken: timer.taken, mentorTip: caseData.mentor_tip, explanation: caseData.explanation, drugs: collected.map((c) => ({
      name: c,
      correct: required.includes(c)
    })), errors: errPanel.errors, breakdown: [{
      label: "Correct drugs",
      delta: correct * 20
    }, {
      label: "Wrong drugs",
      delta: -wrong * 15
    }, {
      label: "Drug info read",
      delta: infoRead * 15
    }, {
      label: "Correct labels",
      delta: correctLabels * 25
    }, {
      label: "Wrong labels",
      delta: -wrongLabels * 10
    }, {
      label: "Compounding",
      delta: compoundCorrect * 25 - compoundWrong * 15
    }, {
      label: "Hints used",
      delta: -hints * 10
    }], onNext: next });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "Community Pharmacy", remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10 + compoundCorrect * 25 - compoundWrong * 15, onExit, onHint: () => {
      setHints((n) => n + 1);
      toastScore(-10, "hint");
      setShowClean(true);
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/30 bg-background/60 backdrop-blur px-4 py-2 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SubmodeBadge, { mode: "rx" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: caseData.title })
    ] }),
    phase === "collect" && /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityFloatingPills, { className: "opacity-35" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-primary" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Rx Cases" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowClean((s) => !s), className: "text-xs text-primary hover:underline", children: showClean ? "Show handwritten" : "Show typed" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { mode: "wait", children: showClean ? /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          opacity: 0,
          y: 4
        }, animate: {
          opacity: 1,
          y: 0
        }, exit: {
          opacity: 0,
          y: -4
        }, className: "space-y-2 rounded-lg bg-background/60 p-4 font-mono text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold", children: [
            "Patient: ",
            caseData.electronic_prescription_json?.patient
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
            "Prescriber: ",
            caseData.electronic_prescription_json?.prescriber
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-2 space-y-1", children: (caseData.electronic_prescription_json?.items ?? []).map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded border border-border/40 p-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold", children: [
              it.drug,
              " ",
              it.strength
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: it.sig })
          ] }, i)) })
        ] }, "clean") : /* @__PURE__ */ jsxRuntimeExports.jsx(SimulatedPrescription, { caseData }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg bg-muted/30 p-3 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Patient" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
            caseData.patient_info_json?.name,
            ", ",
            caseData.patient_info_json?.age,
            "y - Allergies: ",
            caseData.patient_info_json?.allergies ?? "-"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { layout: true, className: "sticky top-20 z-30 rounded-2xl border border-primary/40 bg-gradient-to-b from-card/95 to-background/90 p-3 shadow-[0_20px_55px_-22px_oklch(0.74_0.14_180/0.85),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-5 top-1 h-px bg-white/20" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ClipboardList, { className: "h-3.5 w-3.5 text-primary" }),
              " Dispensing tray"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary", children: [
              collected.length,
              " selected"
            ] })
          ] }),
          collected.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-3 text-center text-sm text-muted-foreground", children: "Tap drugs below to add" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(motion.ul, { layout: true, className: "max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-2 pr-1 shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { initial: false, children: collected.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.li, { layout: true, initial: {
            opacity: 0,
            scale: 0.78,
            y: -12
          }, animate: {
            opacity: 1,
            scale: [0.96, 1.08, 1],
            y: 0
          }, exit: {
            opacity: 0,
            scale: 0.9,
            x: 18
          }, transition: {
            type: "spring",
            stiffness: 520,
            damping: 24
          }, className: "flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm shadow-[0_10px_22px_-18px_oklch(0.74_0.14_180/0.9)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: c }),
              selectedBrands[c] && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-primary", children: selectedBrands[c] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => removeDrug(c), className: "text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
          ] }, c)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: confirmCollection, disabled: collected.length === 0, className: "mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.74_0.14_180/0.9)] transition hover:brightness-110 disabled:opacity-40", children: "Confirm collection >" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/35 bg-card/35 p-3 shadow-inner backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground", children: category ? `${category} shelf` : "Medicine categories" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: category ? "Pick a medicine, then choose its brand." : "Select a category to open the shelf." })
            ] }),
            category ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setCategory(""), className: "inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }),
              "Categories"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary", children: [
              categoryStats.length,
              " groups"
            ] })
          ] }),
          !category ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: categoryStats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { whileHover: {
            y: -4,
            boxShadow: "0 20px 44px -24px oklch(0.74 0.14 180 / 0.85)"
          }, whileTap: {
            scale: 0.97
          }, onClick: () => setCategory(c.name), className: "group rounded-2xl border border-border/40 bg-card/70 p-4 text-left transition hover:border-primary/60 hover:bg-primary/10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary/15", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pill, { className: "size-5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: [
                c.count,
                " meds"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-bold", children: c.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Open shelf and select a dispensing brand" })
          ] }, c.name)) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-3", children: [
            filtered.map((d, i) => {
              const isCollected = collected.includes(d.name);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { initial: {
                opacity: 0,
                x: 42
              }, animate: {
                opacity: 1,
                x: 0
              }, transition: {
                delay: Math.min(i * 0.025, 0.35),
                type: "spring",
                stiffness: 260,
                damping: 24
              }, whileHover: {
                y: -6,
                scale: 1.025,
                boxShadow: "0 18px 38px -20px oklch(0.74 0.14 180 / 0.95)"
              }, whileTap: {
                scale: 0.95
              }, onClick: () => openBrandSelection(d), className: `rounded-xl border p-3 text-left transition ${isCollected ? "border-primary/45 bg-primary/10 text-foreground" : "border-border/40 bg-card/70 hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"}`, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: d.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground", children: d.generic_name ?? d.category }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tags, { className: "size-3" }),
                  "choose brand"
                ] })
              ] }, d.id);
            }),
            filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground", children: "No medicines found in this category." })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: brandDrug && /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { className: "fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md", initial: {
      opacity: 0
    }, animate: {
      opacity: 1
    }, exit: {
      opacity: 0
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
      opacity: 0,
      y: 18,
      scale: 0.97
    }, animate: {
      opacity: 1,
      y: 0,
      scale: 1
    }, exit: {
      opacity: 0,
      y: 12,
      scale: 0.98
    }, className: "glass-card w-full max-w-xl p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-primary", children: "Select brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-bold", children: brandDrug.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: brandDrug.generic_name ?? brandDrug.category })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setBrandDrug(null), className: "rounded-full border border-border/50 p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary", "aria-label": "Close brand selector", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: getBrandsForDrug(brandDrug).map((brand) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { whileHover: {
        y: -2
      }, whileTap: {
        scale: 0.97
      }, onClick: () => selectBrand(brandDrug, brand), className: "rounded-xl border border-border/40 bg-card/60 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: brand }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Dispense this brand" })
      ] }, brand)) })
    ] }) }) }),
    phase === "compound" && /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundStep, { caseData, onSubmit: submitCompound }),
    phase === "info" && /* @__PURE__ */ jsxRuntimeExports.jsx(DrugInfoStep, { drug: correctDrugs[infoIdx], allDrugs: catalogDrugs, onRead: markInfo, onSkip: () => {
      if (infoIdx + 1 < correctDrugs.length) setInfoIdx((i) => i + 1);
      else setPhase("label");
    }, count: `${infoIdx + 1} / ${correctDrugs.length}` }),
    phase === "label" && /* @__PURE__ */ jsxRuntimeExports.jsx(LabelStep, { drug: correctDrugs[labelIdx], previous: labelAnswers[correctDrugs[labelIdx]], count: `${labelIdx + 1} / ${correctDrugs.length}`, onSubmit: (a) => submitLabel(correctDrugs[labelIdx], a) }),
    errPanel.panel
  ] });
}
function normalizeText(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}
function withinTolerance(value, expected, tolerance = 0.05) {
  if (!Number.isFinite(value) || !Number.isFinite(expected)) return false;
  const allowance = Math.max(Math.abs(expected) * tolerance, 0.01);
  return Math.abs(value - expected) <= allowance;
}
function compoundNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatCompoundValue(value, suffix = "") {
  if (value === null || value === void 0 || value === "") return "-";
  return `${value}${suffix}`;
}
function compoundOptions(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}
function CompoundStep({
  caseData,
  onSubmit
}) {
  const data = caseData?.compound_data ?? {};
  const type = String(caseData?.compound_type ?? "");
  const [base, setBase] = reactExports.useState("");
  const [grams, setGrams] = reactExports.useState("");
  const [diluent, setDiluent] = reactExports.useState("");
  const [volume, setVolume] = reactExports.useState("");
  const [stability, setStability] = reactExports.useState("");
  const typeLabel = type === "topical" ? "Topical compounding" : type === "iv_sterile" ? "Sterile IV preparation" : type === "antibiotic_dilution" ? "Antibiotic reconstitution" : "Compounding";
  function submit() {
    if (type === "topical") {
      onSubmit({
        type: "topical",
        base,
        grams: compoundNumber(grams)
      });
    } else if (type === "iv_sterile") {
      onSubmit({
        type: "iv_sterile",
        diluent,
        volume: compoundNumber(volume)
      });
    } else {
      onSubmit({
        type: "antibiotic_dilution",
        volume: compoundNumber(volume),
        stability
      });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative mx-auto max-w-4xl px-4 py-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityFloatingPills, { className: "opacity-25" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.section, { initial: {
      opacity: 0,
      y: 18,
      scale: 0.98
    }, animate: {
      opacity: 1,
      y: 0,
      scale: 1
    }, className: "relative z-10 overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-card/80 via-background/85 to-emerald-950/55 p-5 shadow-[0_28px_80px_-45px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-x-8 top-0 h-px bg-white/25" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-5 rounded-2xl border border-primary/25 bg-primary/10 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.28em] text-primary", children: typeLabel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-2 text-2xl font-black", children: "This strength is not commercially available." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "You'll need to compound it before moving to patient information and labeling." })
      ] }),
      type === "topical" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_1.1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundFacts, { rows: [["Target strength", formatCompoundValue(data.target_percent, "%")], ["Final quantity", formatCompoundValue(data.total_grams, " g")], ["Formula hint", "(target % / 100) x total grams = drug needed"]] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundAnswerPanel, { title: "Prepare topical base", optionsLabel: "Select base", options: compoundOptions(data.base_options), selected: base, onSelect: setBase, inputLabel: "Active drug needed (g)", inputValue: grams, onInput: setGrams, inputPlaceholder: "e.g. 2.5", onSubmit: submit })
      ] }),
      type === "iv_sterile" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_1.1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundFacts, { rows: [["Target dose", formatCompoundValue(data.target_dose_mg, " mg")], ["Stock concentration", formatCompoundValue(data.stock_concentration_mg_per_ml, " mg/mL")], ["Formula hint", "target dose / concentration = volume needed"]] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundAnswerPanel, { title: "Build sterile IV order", optionsLabel: "Select diluent", options: compoundOptions(data.diluent_options), selected: diluent, onSelect: setDiluent, inputLabel: "Volume to draw (mL)", inputValue: volume, onInput: setVolume, inputPlaceholder: "e.g. 10", onSubmit: submit })
      ] }),
      type === "antibiotic_dilution" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 lg:grid-cols-[1fr_1.1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundFacts, { rows: [["Vial strength", formatCompoundValue(data.vial_total_mg, " mg")], ["Target concentration", formatCompoundValue(data.target_concentration, " mg/mL")], ["Check", "Choose the reconstitution volume, then label stability"]] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/35 bg-card/55 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary", children: "Reconstitute vial" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundOptionGrid, { label: "Volume option", options: compoundOptions(data.volume_options), selected: volume, onSelect: setVolume, suffix: " mL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundOptionGrid, { label: "Stable after reconstitution", options: compoundOptions(data.stability_options), selected: stability, onSelect: setStability, suffix: " days" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: submit, className: "mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110", children: "Complete compound" })
        ] })
      ] }),
      !["topical", "iv_sterile", "antibiotic_dilution"].includes(type) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-destructive/35 bg-destructive/10 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-destructive", children: "This compounding case is missing a supported compound type." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: submit, className: "mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground", children: "Continue" })
      ] })
    ] })
  ] });
}
function CompoundFacts({
  rows
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/35 bg-card/45 p-4 backdrop-blur", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground", children: "Compound data" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: rows.map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/30 bg-background/35 p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground", children: label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm font-semibold", children: value })
    ] }, label)) })
  ] });
}
function CompoundAnswerPanel({
  title,
  optionsLabel,
  options,
  selected,
  onSelect,
  inputLabel,
  inputValue,
  onInput,
  inputPlaceholder,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/35 bg-card/55 p-4 backdrop-blur", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CompoundOptionGrid, { label: optionsLabel, options, selected, onSelect }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mt-4 block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-muted-foreground", children: inputLabel }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", inputMode: "decimal", value: inputValue, onChange: (event) => onInput(event.target.value), placeholder: inputPlaceholder, className: "mt-2 w-full rounded-xl border border-border/45 bg-background/50 px-4 py-3 font-mono text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onSubmit, className: "mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110", children: "Complete compound" })
  ] });
}
function CompoundOptionGrid({
  label,
  options,
  selected,
  onSelect,
  suffix = ""
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
      options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => onSelect(option), className: `rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${selected === option ? "border-primary/70 bg-primary/15 text-primary shadow-[0_14px_34px_-24px_oklch(0.74_0.14_180/0.9)]" : "border-border/40 bg-background/35 hover:border-primary/50 hover:bg-primary/10"}`, children: [
        option,
        suffix
      ] }, option)),
      options.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-dashed border-border/45 p-3 text-sm text-muted-foreground", children: "No options configured for this case." })
    ] })
  ] });
}
function OtcGame({
  caseData,
  next,
  LIMIT
}) {
  const {
    profile
  } = useAuthStore();
  const onExit = useGameExit("/modes");
  const [step, setStep] = reactExports.useState("questions");
  const [qi, setQi] = reactExports.useState(0);
  const [correct, setCorrect] = reactExports.useState(0);
  const [wrong, setWrong] = reactExports.useState(0);
  const [hints, setHints] = reactExports.useState(0);
  const [quantity, setQuantity] = reactExports.useState(1);
  const [result, setResult] = reactExports.useState(null);
  const [dialogueLog, setDialogueLog] = reactExports.useState([]);
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
    setDialogueLog([]);
  }, [caseData?.id]);
  const ans = caseData?.correct_answer_json ?? {};
  const questions = ans.questions ?? [];
  function pickQuestion(i) {
    const q = questions[qi];
    const selectedQuestion = getOtcSelectedQuestionText(q, i);
    const patientResponse = getOtcPatientResponse(q, i);
    const isCorrect = isOtcQuestionChoiceCorrect(q, i);
    setDialogueLog((log) => [...log, {
      pharmacist: selectedQuestion,
      patient: patientResponse,
      correct: isCorrect
    }]);
    if (isCorrect) {
      setCorrect((n) => n + 1);
      toastScore(20, "good question");
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, "wrong path");
      errPanel.logError({
        errorType: "Irrelevant follow-up question",
        wrongChoice: selectedQuestion,
        correctChoice: getOtcCorrectQuestionText(q),
        whyWrong: "That question does not uncover the key OTC safety information for this scenario.",
        whatToKnow: "Priority OTC questions establish who the medicine is for, symptoms, duration, prior treatment, allergies, medical conditions, and current medicines."
      });
    }
    if (qi + 1 < questions.length) setQi((x) => x + 1);
    else setStep("drug");
  }
  function pickDrug(opt) {
    const correctChoices = getOtcCorrectChoices(ans);
    if (correctChoices.includes(opt)) {
      setCorrect((n) => n + 1);
      toastScore(20, "correct drug");
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, "wrong drug");
      errPanel.logError({
        errorType: "Wrong OTC recommendation",
        wrongChoice: opt,
        correctChoice: formatOtcCorrectChoice(ans),
        whyWrong: `${opt} is not appropriate for this patient given their symptoms or contraindications.`,
        whatToKnow: "Match OTC product to symptom + screen for red flags, pregnancy, allergies, and current meds."
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
        whatToKnow: "OTC dosing depends on age, weight, renal/hepatic function, and product strength."
      });
    }
    setQuantity(getOtcCorrectQuantity(ans));
    setStep("quantity");
  }
  function submitQuantity(qty) {
    const expected = getOtcCorrectQuantity(ans);
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
        whyWrong: "That advice is incomplete or misleading for this scenario.",
        whatToKnow: "Counseling should cover how to take it, side effects to watch, and when to seek further help."
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "Community Pharmacy", remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: correct * 20 - wrong * 15, onExit, onHint: () => {
      setHints((n) => n + 1);
      toastScore(-10, "hint used");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border/30 bg-background/60 backdrop-blur px-4 py-2 flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SubmodeBadge, { mode: "otc" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: caseData.title })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityFloatingPills, { className: "opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "relative z-10 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-4 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Patient" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid size-10 place-items-center rounded-full bg-primary/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "size-5 text-primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: caseData.patient_info_json?.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "Age ",
              caseData.patient_info_json?.age ?? "-"
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
        ] }, k)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "relative z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 8
      }, animate: {
        opacity: 1,
        y: 0
      }, className: "rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur", children: [
        step === "questions" && questions[qi] && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(OtcScenarioPanel, { ans, caseData, dialogueLog }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2", children: "Your follow-up question" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: getOtcQuestionOptions(questions[qi]).map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => pickQuestion(i), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5 transition", children: c }, i)) })
        ] }),
        step === "drug" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Recommend a medication", options: ans.drug_options ?? [], onPick: pickDrug }),
        step === "dose" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Choose correct dose", options: ans.dose_options ?? [], onPick: pickDose }),
        step === "quantity" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcQuantitySlider, { value: quantity, max: getOtcQuantityMax(ans), onChange: setQuantity, onSubmit: submitQuantity }),
        step === "advice" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Counsel the patient", options: ans.advice_options ?? [], onPick: pickAdvice })
      ] }, `${step}-${qi}`) })
    ] }),
    errPanel.panel
  ] });
}
function getOtcCorrectQuantity(ans) {
  const raw = ans.correct_quantity ?? ans.quantity ?? ans.recommended_quantity ?? ans.pack_quantity ?? 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}
function getOtcQuantityMax(ans) {
  return Math.max(5, getOtcCorrectQuantity(ans) + 2);
}
function OtcQuantitySlider({
  value,
  max,
  onChange,
  onSubmit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-3 text-xs font-semibold uppercase tracking-wider text-primary", children: "Select quantity" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-primary/25 bg-primary/5 p-4", children: [
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
function OtcPicker({
  title,
  options,
  onPick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary mb-3", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2", children: options.map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onPick(o), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5 transition", children: o }, i)) })
  ] });
}
function DrugInfoStep({
  drug,
  allDrugs,
  onRead,
  onSkip,
  count
}) {
  const d = allDrugs.find((x) => x.name === drug);
  if (!d) {
    onSkip();
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-2xl px-4 py-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 text-xs uppercase tracking-wider text-muted-foreground", children: [
      "Drug info ",
      count
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold", children: d.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground", children: [
        d.generic_name,
        " · ",
        d.category
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoSection, { label: "Indications", items: d.indications }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoSection, { label: "Dosage", items: [d.dosage] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoSection, { label: "Side effects", items: d.side_effects }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(InfoSection, { label: "Contraindications", items: d.contraindications }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRead, className: "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground", children: "Mark as read (+15)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onSkip, className: "rounded-full border border-border/50 px-5 py-2 text-sm", children: "Skip" })
      ] })
    ] })
  ] });
}
function InfoSection({
  label,
  items
}) {
  if (!items?.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 list-disc pl-5 text-sm text-muted-foreground", children: items.map((i, k) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: i }, k)) })
  ] });
}
function LabelStep({
  drug,
  count,
  onSubmit,
  previous
}) {
  const [freq, setFreq] = reactExports.useState("");
  const [timing, setTiming] = reactExports.useState("");
  const [duration, setDuration] = reactExports.useState(DURATIONS[0]);
  if (previous) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "mx-auto max-w-2xl px-4 py-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm", children: [
        "Label for ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: drug }),
        ":"
      ] }),
      previous.ok ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
        " Correct"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 inline-flex items-center gap-2 rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-3" }),
          " Wrong"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
          "Correct: ",
          previous.correct?.frequency,
          " · ",
          previous.correct?.timing,
          " · ",
          previous.correct?.duration
        ] })
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-2xl px-4 py-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2 text-xs uppercase tracking-wider text-muted-foreground", children: [
      "Label ",
      count
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold", children: drug }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Choose label instructions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(OptionPicker, { label: "Frequency", options: FREQS, value: freq, onChange: setFreq }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(OptionPicker, { label: "Timing", options: TIMINGS, value: timing, onChange: setTiming }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DurationSlider, { value: duration, onChange: setDuration }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !freq || !timing, onClick: () => onSubmit({
        frequency: freq,
        timing,
        duration
      }), className: "mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Submit label" })
    ] })
  ] });
}
function DurationSlider({
  value,
  onChange
}) {
  const index = Math.max(0, DURATIONS.indexOf(value));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: "Duration" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary", children: value })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "range", min: 0, max: DURATIONS.length - 1, step: 1, value: index, onChange: (event) => onChange(DURATIONS[Number(event.target.value)]), "aria-label": "Duration", className: "mt-4 w-full accent-primary" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold text-muted-foreground", children: DURATIONS.map((durationOption) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: durationOption === value ? "text-primary" : "", children: durationOption }, durationOption)) })
  ] });
}
function OptionPicker({
  label,
  options,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(o), className: `rounded-full border px-3 py-1.5 text-xs transition ${value === o ? "border-primary bg-primary/15 text-primary" : "border-border/40 hover:bg-muted"}`, children: o }, o)) })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "rx", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CommunityGame, {}) });
export {
  SplitComponent as component
};
