import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-BEVgRkEv.mjs";
import { M as ModeTheme } from "./ModeTheme-Dcsp8zjD.mjs";
import { M as MODE_TIMERS, t as toastScore, c as computeScore, s as submitScore } from "./shared-Bfopko4w.mjs";
import { u as useAuthStore } from "./router-D8H_Rjl1.mjs";
import { p as prepareDrugCatalog, R as RX_DRUG_CATEGORIES, g as getBrandsForDrug } from "./drug-catalog-DKPW6qki.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { w as FileText, R as ArrowLeft, P as Pill, V as Tags, W as Trash2, X, Y as Check } from "../_libs/lucide-react.mjs";
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
import "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "./vendor-tanstack-Cnrvb9Cp.mjs";
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
const LIMIT = MODE_TIMERS.rx;
function RxGame() {
  const onExit = useGameExit("/modes");
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice("rx");
  const {
    profile
  } = useAuthStore();
  const {
    caseData,
    loading,
    next
  } = useCaseLoader("rx", difficulty);
  const [phase, setPhase] = reactExports.useState("collect");
  const [collected, setCollected] = reactExports.useState([]);
  const [wrong, setWrong] = reactExports.useState(0);
  const [correct, setCorrect] = reactExports.useState(0);
  const [infoRead, setInfoRead] = reactExports.useState(0);
  const [correctLabels, setCorrectLabels] = reactExports.useState(0);
  const [wrongLabels, setWrongLabels] = reactExports.useState(0);
  const [hints, setHints] = reactExports.useState(0);
  const [showHint, setShowHint] = reactExports.useState(false);
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
    setHints(0);
    setShowHint(false);
    setCategory("");
    setBrandDrug(null);
    setSelectedBrands({});
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
        whyWrong: `${name} is not indicated for this prescription. ${drug?.indications?.length ? `It is used for ${drug.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: `Think about the class of drug that treats the condition in this prescription.`
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
  }
  function removeDrug(name) {
    setCollected((c) => c.filter((x) => x !== name));
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
    setPhase("info");
  }
  function markInfo() {
    setInfoRead((n) => n + 1);
    toastScore(15, "info read");
    advanceInfo();
  }
  function advanceInfo() {
    const correctDrugs = collected.filter((c) => required.includes(c));
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
        if (ans.frequency !== correctAns.frequency) fields.push(`frequency (${ans.frequency} vs ${correctAns.frequency})`);
        if (ans.timing !== correctAns.timing) fields.push(`timing (${ans.timing} vs ${correctAns.timing})`);
        if (ans.duration !== correctAns.duration) fields.push(`duration (${ans.duration} vs ${correctAns.duration})`);
        errPanel.logError({
          errorType: "Wrong label",
          wrongChoice: `${drug}: ${ans.frequency} · ${ans.timing} · ${ans.duration}`,
          correctChoice: `${correctAns.frequency} · ${correctAns.timing} · ${correctAns.duration}`,
          whyWrong: `Your label for ${drug} is off on ${fields.join(", ")}. Incorrect dosing instructions can cause subtherapeutic effect, toxicity, or treatment failure.`,
          whatToKnow: `Label instructions for ${drug} are based on its half-life, food interactions, and recommended course duration. Always cross-check against the BNF/formulary entry.`,
          hint: `Re-read the prescription Sig and the drug monograph carefully.`
        });
      }
    }
    const correctDrugs = collected.filter((c) => required.includes(c));
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
  function useHint() {
    setHints((n) => n + 1);
    setShowHint(true);
    toastScore(-10, "hint used");
  }
  if (loading || !caseData) return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, {})
  ] });
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
  const required_for_steps = collected.filter((c) => required.includes(c));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "Rx Case", remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10, onExit, onHint: useHint }),
    phase === "collect" && /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Rx Cases" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowHint((s) => !s), className: "text-xs text-primary hover:underline", children: showHint ? "Show handwritten" : "Show clean prescription" })
        ] }),
        showHint ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-lg bg-background/60 p-4 font-mono text-sm", children: [
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
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border/50 bg-gradient-to-br from-amber-50/5 to-amber-100/5 font-handwriting", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "-rotate-2 p-6 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "mx-auto mb-2 size-8 opacity-40" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm italic text-muted-foreground", children: "Handwritten Rx — squint!" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 font-serif text-lg italic", children: [
            "℞ ",
            (caseData.electronic_prescription_json?.items ?? []).map((i) => i.drug).join(", ")
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg bg-muted/30 p-3 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: "Patient" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-muted-foreground", children: [
            caseData.patient_info_json?.name,
            ", ",
            caseData.patient_info_json?.age,
            "y · Allergies: ",
            caseData.patient_info_json?.allergies ?? "—"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Medicine categories" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: category ? `Viewing ${category}` : "Pick a category first, then choose the medicine brand." })
            ] }),
            category && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setCategory(""), className: "inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "size-3.5" }),
              "Categories"
            ] })
          ] }),
          !category ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2", children: categoryStats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { whileHover: {
            y: -3
          }, whileTap: {
            scale: 0.97
          }, onClick: () => setCategory(c.name), className: "group rounded-2xl border border-border/40 bg-card/60 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_18px_46px_-34px_oklch(0.74_0.14_180/0.9)]", children: [
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
            filtered.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.button, { whileTap: {
              scale: 0.95
            }, onClick: () => openBrandSelection(d), className: "rounded-xl border border-border/40 bg-card/60 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground", children: d.generic_name ?? d.category }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Tags, { className: "size-3" }),
                "choose brand"
              ] })
            ] }, d.id)),
            filtered.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-full rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground", children: "No medicines found in this category." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-card/50 p-3 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-xs uppercase tracking-wider text-muted-foreground", children: "Dispensing tray" }),
          collected.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-4 text-center text-sm text-muted-foreground", children: "Tap drugs to add" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: collected.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: c }),
              selectedBrands[c] && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-primary", children: selectedBrands[c] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => removeDrug(c), className: "text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "size-3.5" }) })
          ] }, c)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: confirmCollection, disabled: collected.length === 0, className: "mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Confirm collection" })
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
    phase === "info" && /* @__PURE__ */ jsxRuntimeExports.jsx(DrugInfoStep, { drug: required_for_steps[infoIdx], allDrugs: catalogDrugs, onRead: markInfo, onSkip: advanceInfo, count: `${infoIdx + 1} / ${required_for_steps.length}` }),
    phase === "label" && /* @__PURE__ */ jsxRuntimeExports.jsx(LabelStep, { drug: required_for_steps[labelIdx], previous: labelAnswers[required_for_steps[labelIdx]], count: `${labelIdx + 1} / ${required_for_steps.length}`, onSubmit: (a) => submitLabel(required_for_steps[labelIdx], a) }),
    errPanel.panel
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { label: "Indications", items: d.indications }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { label: "Dosage", items: [d.dosage] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { label: "Side effects", items: d.side_effects }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { label: "Contraindications", items: d.contraindications }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onRead, className: "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground", children: "Mark as read (+15)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onSkip, className: "rounded-full border border-border/50 px-5 py-2 text-sm", children: "Skip" })
      ] })
    ] })
  ] });
}
function Section({
  label,
  items
}) {
  if (!items || items.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 list-disc pl-5 text-sm text-muted-foreground", children: items.map((i, k) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: i }, k)) })
  ] });
}
const FREQS = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];
const TIMINGS = ["morning", "with food", "before sleep", "as needed"];
const DURATIONS = ["7 days", "14 days", "4 weeks", "ongoing"];
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
        drug,
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { label: "Frequency", options: FREQS, value: freq, onChange: setFreq }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { label: "Timing", options: TIMINGS, value: timing, onChange: setTiming }),
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
function Picker({
  label,
  options,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(o), className: `rounded-full border px-3 py-1.5 text-xs ${value === o ? "border-primary bg-primary/15 text-primary" : "border-border/40 hover:bg-muted"}`, children: o }, o)) })
  ] });
}
function Loading() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading case…" });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "rx", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RxGame, {}) });
export {
  SplitComponent as component
};
