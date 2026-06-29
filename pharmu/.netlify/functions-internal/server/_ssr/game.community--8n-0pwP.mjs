import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { M as ModeTheme, a as useDifficultyChoice, b as useCaseLoader, u as useGameExit, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-BPfPvWlH.mjs";
import { S as SimulatedPrescription } from "./SimulatedPrescription-BtzF8rKo.mjs";
import { c as computeScore, s as submitScore, t as toastScore } from "./shared-DDCPKmqL.mjs";
import { u as useAuthStore } from "./router-xkoTwkF_.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import { w as FileText, ae as ShoppingBag, g as ClipboardList, R as Trash2, I as User, P as Pill, V as Check, X } from "../_libs/lucide-react.mjs";
import "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
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
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
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
const DRUG_CATEGORIES = ["All", "Antibiotic", "Cardiovascular", "OTC Analgesic", "Antidiabetic", "GI", "Respiratory"];
const LIMIT_RX = 180;
const LIMIT_OTC = 120;
const FREQS = ["once daily", "twice daily", "three times daily", "as needed"];
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
  const [hints, setHints] = reactExports.useState(0);
  const [showClean, setShowClean] = reactExports.useState(false);
  const [category, setCategory] = reactExports.useState("All");
  const [drugs, setDrugs] = reactExports.useState([]);
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
    setHints(0);
    setShowClean(false);
    setInfoIdx(0);
    setLabelIdx(0);
    setLabelAnswers({});
    setResult(null);
  }, [caseData?.id]);
  const required = caseData?.drugs_required ?? [];
  const filtered = reactExports.useMemo(() => drugs.filter((d) => category === "All" || d.category === category), [drugs, category]);
  function addDrug(name) {
    if (collected.includes(name)) return;
    setCollected((c) => [...c, name]);
    if (required.includes(name)) {
      setCorrect((n) => n + 1);
      toastScore(20, name);
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, `wrong: ${name}`);
      const d = drugs.find((x) => x.name === name);
      errPanel.logError({
        errorType: "Wrong drug selected",
        wrongChoice: name,
        correctChoice: required.join(", "),
        whyWrong: `${name} is not indicated for this prescription.${d?.indications?.length ? ` It is used for ${d.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: "Think about the class of drug that treats the condition in this prescription."
      });
    }
  }
  function confirmCollection() {
    if (required.some((r) => !collected.includes(r))) {
      toast.warning("Some required drugs still missing");
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
  async function finish(timedOut) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct,
      wrongDrugs: wrong,
      infoRead,
      correctLabels,
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
      errors: wrong + wrongLabels,
      correctDrugs: correct,
      totalDrugs: required.length,
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
      label: "Hints used",
      delta: -hints * 10
    }], onNext: next });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "Community Pharmacy", remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10, onExit, onHint: () => {
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
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCollected((x) => x.filter((n) => n !== c)), className: "text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
          ] }, c)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: confirmCollection, disabled: collected.length === 0, className: "mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.74_0.14_180/0.9)] transition hover:brightness-110 disabled:opacity-40", children: "Confirm collection >" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-card/50 p-2 backdrop-blur", children: DRUG_CATEGORIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCategory(c), className: `rounded-full px-3 py-1 text-xs transition ${category === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`, children: c }, c)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/35 bg-card/35 p-3 shadow-inner backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground", children: "Drug shelf" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary", children: [
              filtered.length,
              " items"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-3", children: filtered.map((d, i) => {
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
            }, onClick: () => addDrug(d.name), className: `rounded-xl border p-3 text-left transition ${isCollected ? "border-primary/45 bg-primary/10 text-foreground" : "border-border/40 bg-card/70 hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground", children: d.category })
            ] }, d.id);
          }) })
        ] })
      ] })
    ] }),
    phase === "info" && /* @__PURE__ */ jsxRuntimeExports.jsx(DrugInfoStep, { drug: correctDrugs[infoIdx], allDrugs: drugs, onRead: markInfo, onSkip: () => {
      if (infoIdx + 1 < correctDrugs.length) setInfoIdx((i) => i + 1);
      else setPhase("label");
    }, count: `${infoIdx + 1} / ${correctDrugs.length}` }),
    phase === "label" && /* @__PURE__ */ jsxRuntimeExports.jsx(LabelStep, { drug: correctDrugs[labelIdx], previous: labelAnswers[correctDrugs[labelIdx]], count: `${labelIdx + 1} / ${correctDrugs.length}`, onSubmit: (a) => submitLabel(correctDrugs[labelIdx], a) }),
    errPanel.panel
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
    setResult(null);
  }, [caseData?.id]);
  const ans = caseData?.correct_answer_json ?? {};
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
        whyWrong: "That question doesn't help narrow down the diagnosis here.",
        whatToKnow: "Priority OTC questions establish duration, severity, symptoms, current medications, and red flag signs."
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
      totalDrugs: questions.length + 3,
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
      info: ans.correct_dose
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg bg-primary/10 p-3 mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Pill, { className: "h-3.5 w-3.5 text-primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-primary uppercase tracking-wider", children: "Patient says" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm italic text-foreground/90", children: [
              '"',
              qi === 0 ? ans.complaint : questions[qi].q,
              '"'
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2", children: "Your follow-up question" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: questions[qi].choices.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => pickQuestion(i), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5 transition", children: c }, i)) })
        ] }),
        step === "drug" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Recommend a medication", options: ans.drug_options ?? [], onPick: pickDrug }),
        step === "dose" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Choose correct dose", options: ans.dose_options ?? [], onPick: pickDose }),
        step === "advice" && /* @__PURE__ */ jsxRuntimeExports.jsx(OtcPicker, { title: "Counsel the patient", options: ans.advice_options ?? [], onPick: pickAdvice })
      ] }, `${step}-${qi}`) })
    ] }),
    errPanel.panel
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
  const [duration, setDuration] = reactExports.useState("");
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(OptionPicker, { label: "Duration", options: DURATIONS, value: duration, onChange: setDuration }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !freq || !timing || !duration, onClick: () => onSubmit({
        frequency: freq,
        timing,
        duration
      }), className: "mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Submit label" })
    ] })
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
