import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-DJSijQm6.mjs";
import { M as ModeTheme } from "./ModeTheme-Dcsp8zjD.mjs";
import { a as MODE_TIMERS, c as computeScore, s as submitScore, t as toastScore } from "./shared-CP2LLHvv.mjs";
import { u as useAuthStore } from "./router-DEiKTBt8.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { L as Lock, S as Siren } from "../_libs/lucide-react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import "../_libs/tanstack__query-core.mjs";
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
import "./vendor-tanstack-Z7Fi8gb-.mjs";
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
function EmergencyGate() {
  useGameExit("/modes");
  const {
    profile
  } = useAuthStore();
  const {
    data: count = 0,
    isLoading
  } = useQuery({
    queryKey: ["emergency-gate", profile?.user_id],
    queryFn: async () => {
      if (!profile) return 0;
      const {
        count: count2
      } = await supabase.from("scores").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", profile.user_id);
      return count2 ?? 0;
    },
    enabled: !!profile
  });
  if (isLoading) return /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "…" });
  if (count < 10) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-xl px-6 py-16 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "mx-auto size-10 text-amber-500" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-4 text-2xl font-bold", children: "Emergency mode locked" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-muted-foreground", children: [
        "Complete 10 cases in any mode to unlock. You have ",
        count,
        " / 10."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: "/dashboard" }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(EmergencyGame, {});
}
const LIMIT = MODE_TIMERS.emergency;
function EmergencyGame() {
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice("emergency");
  const {
    profile
  } = useAuthStore();
  const {
    caseData,
    loading,
    next
  } = useCaseLoader("emergency", difficulty);
  const [step, setStep] = reactExports.useState("drug");
  const [correct, setCorrect] = reactExports.useState(0);
  const [wrong, setWrong] = reactExports.useState(0);
  const [result, setResult] = reactExports.useState(null);
  const timer = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "emergency",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  reactExports.useEffect(() => {
    setStep("drug");
    setCorrect(0);
    setWrong(0);
    setResult(null);
  }, [caseData?.id]);
  if (loading || !caseData) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      difficultyModal,
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading..." })
    ] });
  }
  const ans = caseData.correct_answer_json ?? {};
  const patient = caseData.patient_info_json ?? {};
  function pick(opt, target, nextStep, points, kind) {
    if (opt === target) {
      setCorrect((n) => n + 1);
      toastScore(points, "correct");
    } else {
      setWrong((n) => n + 1);
      toastScore(-15, "wrong");
      const messages = {
        drug: {
          type: "Wrong emergency drug",
          why: `${opt} is not the first-line treatment for ${ans.emergency}. Delay or substitution here is life-threatening.`,
          what: `First-line for ${ans.emergency} is ${target} because it directly reverses the underlying pathophysiology.`
        },
        dose: {
          type: "Wrong emergency dose",
          why: `${opt} is the wrong dose for ${ans.emergency}. Under-dosing fails to reverse the emergency; over-dosing risks toxicity.`,
          what: `Correct dose for ${ans.emergency} is ${target}. Memorize emergency doses — there is no time to look them up.`
        },
        route: {
          type: "Wrong route",
          why: `${opt} is too slow or unavailable in this emergency. The route changes onset of action dramatically.`,
          what: `Correct route is ${target} for fastest onset and reliable absorption in a crashing patient.`
        }
      };
      const m = messages[kind];
      errPanel.logError({
        errorType: m.type,
        wrongChoice: opt,
        correctChoice: target,
        whyWrong: m.why,
        whatToKnow: m.what,
        forceShowCorrect: true
      });
    }
    if (nextStep === "done") finish(false);
    else setStep(nextStep);
  }
  async function finish(timedOut) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct,
      wrongDrugs: wrong,
      timeTakenSec: timer.taken,
      timeLimitSec: LIMIT,
      timedOut,
      emergencyMultiplier: true
    });
    const {
      xpGain
    } = await submitScore({
      userId: profile.user_id,
      caseId: caseData.id,
      mode: "emergency",
      score,
      timeTaken: timer.taken,
      errors: wrong,
      correctDrugs: correct,
      totalDrugs: 3,
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
      info: `${ans.correct_dose} ${ans.correct_route}`
    }], errors: errPanel.errors, onNext: next });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-gradient-to-b from-red-950/40 to-background", children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: caseData.title ?? "EMERGENCY", onExit, remaining: timer.remaining, pct: timer.pct, paused: false, togglePause: () => {
    }, score: correct * 30 - wrong * 15, hidePause: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-3xl px-4 py-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        scale: 0.95
      }, animate: {
        scale: 1
      }, className: "flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Siren, { className: "size-6 animate-pulse text-red-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs uppercase tracking-wider text-red-300", children: [
            "CODE — ",
            ans.emergency
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: patient.symptoms }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Cause: ",
            patient.cause
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        opacity: 0,
        y: 10
      }, animate: {
        opacity: 1,
        y: 0
      }, className: "mt-4 rounded-2xl border border-border/40 bg-card/70 p-5 backdrop-blur", children: [
        step === "drug" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Emergency drug — NOW", options: ans.drug_options, onPick: (o) => pick(o, ans.correct_drug, "dose", 30, "drug") }),
        step === "dose" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Correct dose", options: ans.dose_options, onPick: (o) => pick(o, ans.correct_dose, "route", 30, "dose") }),
        step === "route" && /* @__PURE__ */ jsxRuntimeExports.jsx(Picker, { title: "Route of administration", options: ans.route_options, onPick: (o) => pick(o, ans.correct_route, "done", 30, "route") })
      ] }, step),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-center text-xs text-red-300/80", children: "⚡ 3× XP multiplier · No pause" })
    ] }),
    errPanel.panel
  ] });
}
function Picker({
  title,
  options,
  onPick
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-red-300", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid gap-2", children: (options ?? []).map((o, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onPick(o), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-red-400/40 hover:bg-red-500/10", children: o }, i)) })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "emergency", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EmergencyGate, {}) });
export {
  SplitComponent as component
};
