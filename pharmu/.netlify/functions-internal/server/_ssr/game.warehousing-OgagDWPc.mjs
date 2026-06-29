import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { M as ModeTheme, u as useGameExit, a as useDifficultyChoice, b as useCaseLoader, c as useTimer, d as useErrorPanel, F as FeedbackScreen, G as GameHeader } from "./DifficultySelect-Dih5gLYV.mjs";
import { a as MODE_TIMERS, b as bumpCounterBadge, t as toastScore, c as computeScore, s as submitScore } from "./shared-DDCPKmqL.mjs";
import { u as useAuthStore } from "./router-CdwnHMYR.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { L as Lock, K as TriangleAlert } from "../_libs/lucide-react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
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
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const LIMIT = MODE_TIMERS.warehousing;
function buildAuditScenarios(s) {
  const shipments = Array.isArray(s.shipments) ? s.shipments : [];
  const expiring = Array.isArray(s.expiring) ? s.expiring : [];
  const reconciliation = Array.isArray(s.reconciliation) ? s.reconciliation : [];
  const excursion = shipments.find((ship) => ship.tempLog?.excursion);
  const controlled = shipments.find((ship) => ship.controlled);
  const nearExpiry = expiring[0] ?? shipments.find((ship) => ship.expiry);
  const variance = reconciliation.find((row) => row.investigate) ?? reconciliation[0];
  const scenarios = [];
  if (excursion) {
    scenarios.push({
      id: "cold-chain-deviation",
      title: "Cold-chain deviation",
      tag: `${excursion.drug} reached ${excursion.tempLog?.max ?? "unsafe"}C`,
      prompt: `${excursion.drug} batch ${excursion.batch} arrived with a temperature log outside its safe range. The delivery note is complete and the ward is asking for urgent release. What is the safest warehouse action?`,
      options: ["Release it because the paperwork is complete", "Move it to ambient stock and add a verbal note", "Quarantine affected stock and open a temperature deviation report", "Rewrite the log after checking the fridge is now stable"],
      correctAction: "Quarantine affected stock and open a temperature deviation report",
      points: 25,
      penalty: 20,
      errorType: "Cold-chain deviation released",
      whyWrong: "A temperature excursion means product quality is uncertain until the deviation is investigated and stability guidance is reviewed.",
      whatToKnow: "Cold-chain excursions require quarantine, deviation documentation, pharmacist/QA review, and manufacturer stability advice before any release."
    });
  }
  if (controlled) {
    scenarios.push({
      id: "controlled-stock-discrepancy",
      title: "Controlled stock discrepancy",
      tag: `${controlled.drug} requires secure register control`,
      prompt: `During handover, the controlled-drug count for ${controlled.drug} batch ${controlled.batch} does not match the register. The next dispatch run is waiting. What should you do?`,
      options: ["Adjust the count so the dispatch is not delayed", "Dispatch the requested stock and investigate later", "Escalate discrepancy, lock stock, and investigate the controlled register", "Ignore it until the monthly stock count"],
      correctAction: "Escalate discrepancy, lock stock, and investigate the controlled register",
      points: 25,
      penalty: 20,
      errorType: "Controlled stock discrepancy mishandled",
      whyWrong: "Controlled medicines need immediate secure investigation. Adjusting or ignoring the register can hide diversion or dispensing errors.",
      whatToKnow: "For controlled stock, stop movement, secure the stock, verify physical count against the register, and escalate according to SOP."
    });
  }
  if (nearExpiry) {
    const drug = nearExpiry.drug ?? nearExpiry.item ?? "near-expiry stock";
    const batch = nearExpiry.batch ?? "selected";
    scenarios.push({
      id: "near-expiry-recall-screen",
      title: "Recall and near-expiry screen",
      tag: `${drug} batch ${batch}`,
      prompt: `A store requests ${drug}, but the same batch is on the near-expiry watchlist while a recall email is being checked. Which action prevents avoidable patient risk?`,
      options: ["Block affected batch and notify stores before dispatch", "Send it first because FEFO says earliest expiry goes out first", "Hide the batch until someone asks for it again", "Return all stock without checking the recall details"],
      correctAction: "Block affected batch and notify stores before dispatch",
      points: 20,
      penalty: 15,
      errorType: "Recall screen missed",
      whyWrong: "FEFO does not override a possible recall or safety hold. Stock under investigation must be blocked before dispatch.",
      whatToKnow: "Recall and safety alerts take priority over dispatch. Block the affected batch, trace locations, and communicate the hold clearly."
    });
  }
  if (variance) {
    const diff = Number(variance.actual ?? 0) - Number(variance.expected ?? 0);
    scenarios.push({
      id: "reconciliation-capa",
      title: "Reconciliation CAPA",
      tag: `${variance.item ?? "Stock"} variance ${diff > 0 ? "+" : ""}${diff}`,
      prompt: `Reconciliation shows ${variance.item ?? "an item"} expected ${variance.expected ?? "?"} but actual ${variance.actual ?? "?"}. The team wants to close the count quickly. What is the correct closure step?`,
      options: ["Investigate variance, recount, and document CAPA before closing", "Change the expected quantity to match the shelf count", "Close the count and wait for the next cycle count", "Move stock from another location to balance the line"],
      correctAction: "Investigate variance, recount, and document CAPA before closing",
      points: 20,
      penalty: 15,
      errorType: "Variance closed without investigation",
      whyWrong: "Closing a variance without investigation leaves the root cause unknown and can conceal picking, receiving, theft, or system-entry errors.",
      whatToKnow: "Reconciliation needs a recount, transaction review, documented cause, and corrective/preventive action before closure."
    });
  }
  if (scenarios.length < 3) {
    scenarios.push({
      id: "segregation-audit",
      title: "Segregation audit",
      tag: "Damaged and saleable stock mixed",
      prompt: "A shelf check finds a damaged carton stored beside saleable stock, with no quarantine label. What is the correct action?",
      options: ["Leave it in place and tell the next shift", "Remove and quarantine damaged stock with documentation", "Open the carton and use undamaged packs first", "Put it behind the saleable stock until QA visits"],
      correctAction: "Remove and quarantine damaged stock with documentation",
      points: 20,
      penalty: 15,
      errorType: "Damaged stock not segregated",
      whyWrong: "Damaged stock can be accidentally supplied if it remains in the saleable area.",
      whatToKnow: "Damaged, recalled, expired, or suspect stock must be physically segregated and documented immediately."
    });
  }
  return scenarios.slice(0, 4);
}
function WarehouseGame() {
  const onExit = useGameExit("/modes");
  const {
    profile
  } = useAuthStore();
  const {
    difficulty,
    difficultyModal
  } = useDifficultyChoice("warehousing");
  const {
    caseData,
    loading,
    next
  } = useCaseLoader("warehousing", difficulty);
  const s = caseData?.shipment_json;
  const [phase, setPhase] = reactExports.useState("receiving");
  const [points, setPoints] = reactExports.useState(0);
  const [errors, setErrors] = reactExports.useState(0);
  const [placed, setPlaced] = reactExports.useState({});
  const [activeShip, setActiveShip] = reactExports.useState(null);
  const [registerOpen, setRegisterOpen] = reactExports.useState(null);
  const [registerData, setRegisterData] = reactExports.useState({
    qty: "",
    receiver: ""
  });
  const [contaminated, setContaminated] = reactExports.useState(false);
  const [hints, setHints] = reactExports.useState(0);
  const [dispatchIdx, setDispatchIdx] = reactExports.useState(0);
  const [dispatchAns, setDispatchAns] = reactExports.useState({});
  const [expiryAns, setExpiryAns] = reactExports.useState({});
  const [auditIdx, setAuditIdx] = reactExports.useState(0);
  const [auditAns, setAuditAns] = reactExports.useState({});
  const [reconChecked, setReconChecked] = reactExports.useState({});
  const [result, setResult] = reactExports.useState(null);
  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "warehousing",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused
  });
  const auditScenarios = reactExports.useMemo(() => s ? buildAuditScenarios(s) : [], [caseData?.id, s]);
  reactExports.useEffect(() => {
    setPhase("receiving");
    setPoints(0);
    setErrors(0);
    setPlaced({});
    setActiveShip(null);
    setRegisterOpen(null);
    setRegisterData({
      qty: "",
      receiver: ""
    });
    setContaminated(false);
    setHints(0);
    setDispatchIdx(0);
    setDispatchAns({});
    setExpiryAns({});
    setAuditIdx(0);
    setAuditAns({});
    setReconChecked({});
    setResult(null);
  }, [caseData?.id]);
  if (loading || !caseData || !s) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      difficultyModal,
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "grid min-h-[60vh] place-items-center text-muted-foreground", children: "Loading warehouse..." })
    ] });
  }
  function placeShipment(zoneOrQuarantine) {
    if (!activeShip) return;
    const ship = s.shipments.find((x) => x.id === activeShip);
    if (!ship) return;
    const hasExcursion = ship.tempLog?.excursion;
    if (zoneOrQuarantine === "quarantine") {
      if (hasExcursion) {
        setPoints((p) => p + 25);
        toastScore(25, "Excursion caught");
      } else {
        setErrors((e) => e + 1);
        setPoints((p) => p - 10);
        toastScore(-10, "Unnecessary quarantine");
        errPanel.logError({
          errorType: "Unnecessary quarantine",
          wrongChoice: `Quarantined ${ship.drug}`,
          correctChoice: `Place ${ship.drug} in ${ship.correctZone}`,
          whyWrong: `This shipment has no temperature excursion and meets storage requirements. Unnecessary quarantine ties up stock and delays patient supply.`,
          whatToKnow: "Only quarantine when there is a documented quality issue: temperature excursion, damaged packaging, missing paperwork, or batch recall."
        });
      }
      setPlaced((m) => ({
        ...m,
        [ship.id]: "quarantine"
      }));
      setActiveShip(null);
      return;
    }
    if (ship.controlled && zoneOrQuarantine === ship.correctZone) {
      setRegisterOpen(ship.id);
      return;
    }
    const ok = zoneOrQuarantine === ship.correctZone && !hasExcursion;
    if (hasExcursion && zoneOrQuarantine !== "quarantine") {
      setErrors((e) => e + 1);
      setContaminated(true);
      setPoints((p) => p - 40);
      toastScore(-40, "Missed cold-chain excursion");
      toast.error(`${ship.drug}: temperature excursion missed — stock compromised.`);
      errPanel.logError({
        errorType: "Cold-chain excursion missed",
        wrongChoice: `Placed ${ship.drug} (excursion to ${ship.tempLog?.max}°C) in ${zoneOrQuarantine}`,
        correctChoice: `Quarantine pending stability assessment`,
        whyWrong: `The temperature log shows an excursion to ${ship.tempLog?.max}°C, outside the safe range. Dispensing compromised cold-chain stock can harm patients.`,
        whatToKnow: "Any temperature excursion in cold-chain products mandates quarantine and investigation. Review the temp log on every receipt."
      });
    } else if (ok) {
      setPoints((p) => p + 15);
      toastScore(15, `${ship.drug} → ${zoneOrQuarantine}`);
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 10);
      toastScore(-10, `Wrong zone for ${ship.drug}`);
      toast.warning(`${ship.drug} requires: ${ship.requirement}`);
      errPanel.logError({
        errorType: "Wrong storage zone",
        wrongChoice: `Placed ${ship.drug} in ${zoneOrQuarantine}`,
        correctChoice: `${ship.correctZone} (${ship.requirement})`,
        whyWrong: `${ship.drug} requires ${ship.requirement}, not ${zoneOrQuarantine}. Wrong storage degrades the product, often within hours for biologics like insulin.`,
        whatToKnow: "Storage requirements are on the drug label and SPC. Cold chain (2–8°C), frozen (–20°C), controlled-room-temp, and controlled-drug cabinets are all distinct."
      });
    }
    setPlaced((m) => ({
      ...m,
      [ship.id]: zoneOrQuarantine
    }));
    setActiveShip(null);
  }
  function completeRegister() {
    const ship = s.shipments.find((x) => x.id === registerOpen);
    if (!ship) return;
    if (!registerData.qty || !registerData.receiver) {
      toast.warning("Fill in quantity and receiver");
      return;
    }
    setPoints((p) => p + 20 + 15);
    toastScore(20, "Controlled register OK");
    setPlaced((m) => ({
      ...m,
      [ship.id]: ship.correctZone
    }));
    setRegisterOpen(null);
    setRegisterData({
      qty: "",
      receiver: ""
    });
    setActiveShip(null);
  }
  const allReceived = s.shipments.every((sh) => placed[sh.id]);
  async function startDispatch() {
    const excursions = s.shipments.filter((sh) => sh.tempLog?.excursion);
    const allCaught = excursions.every((sh) => placed[sh.id] === "quarantine");
    if (excursions.length > 0 && allCaught && profile) {
      await bumpCounterBadge(profile.user_id, "coldchain_caught", 5, {
        name: "Cold Chain Guardian",
        description: "Correctly identify 5 temperature excursions",
        icon: "❄️"
      });
    }
    setPhase("dispatch");
  }
  function answerDispatch(batch) {
    const order = s.dispatch[dispatchIdx];
    const ok = batch === order.correctBatch;
    setDispatchAns((m) => ({
      ...m,
      [dispatchIdx]: batch
    }));
    if (ok) {
      setPoints((p) => p + 20);
      toastScore(20, "FEFO ✓");
      if (profile) {
        bumpCounterBadge(profile.user_id, "fefo_correct", 10, {
          name: "FEFO Expert",
          description: "Complete 10 correct FEFO dispatches",
          icon: "📦"
        });
      }
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 15);
      toastScore(-15, "FEFO violated");
      toast.warning("First Expired, First Out — pick the earliest expiry.");
      const correctBatchObj = order.batches.find((b) => b.batch === order.correctBatch);
      const pickedBatchObj = order.batches.find((b) => b.batch === batch);
      errPanel.logError({
        errorType: "FEFO violated",
        wrongChoice: `Batch ${batch} (expires ${pickedBatchObj?.expiry ?? "?"})`,
        correctChoice: `Batch ${order.correctBatch} (expires ${correctBatchObj?.expiry ?? "?"})`,
        whyWrong: `You dispatched a later-expiry batch while an earlier-expiring batch was still in stock. The earlier batch will likely expire on the shelf and be wasted.`,
        whatToKnow: "FEFO (First Expired, First Out) ensures medicines reach patients before they expire. Always sort batches by expiry before picking."
      });
    }
    if (dispatchIdx + 1 < s.dispatch.length) setDispatchIdx((i) => i + 1);
    else setPhase(s.expiring?.length ? "expiry" : "audit");
  }
  function answerExpiry(idx, action) {
    const item = s.expiring[idx];
    const ok = action === item.correctAction;
    setExpiryAns((m) => ({
      ...m,
      [idx]: action
    }));
    if (ok) {
      setPoints((p) => p + 15);
      toastScore(15, "Expiry handled");
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - 5);
      toastScore(-5, "Wrong action");
      errPanel.logError({
        errorType: "Wrong expiry-handling action",
        wrongChoice: `${item.drug} batch ${item.batch}: ${action}`,
        correctChoice: item.correctAction,
        whyWrong: `${action} is the wrong call for this near-expiry item. ${item.hasOrder ? "It has an active order, so priority-dispatch is correct." : "With no orders, returning to supplier prevents waste."}`,
        whatToKnow: "Near-expiry items with active orders → priority dispatch. Without orders → return to supplier for credit (if eligible) or controlled destruction."
      });
    }
  }
  const allExpiryAnswered = (s.expiring ?? []).every((_, i) => expiryAns[i]);
  function answerAudit(action) {
    const scenario = auditScenarios[auditIdx];
    if (!scenario) return;
    const ok = action === scenario.correctAction;
    setAuditAns((m) => ({
      ...m,
      [auditIdx]: action
    }));
    if (ok) {
      setPoints((p) => p + scenario.points);
      toastScore(scenario.points, "Audit decision");
    } else {
      setErrors((e) => e + 1);
      setPoints((p) => p - scenario.penalty);
      toastScore(-scenario.penalty, "Wrong audit decision");
      errPanel.logError({
        errorType: scenario.errorType,
        wrongChoice: action,
        correctChoice: scenario.correctAction,
        whyWrong: scenario.whyWrong,
        whatToKnow: scenario.whatToKnow
      });
    }
    if (auditIdx + 1 < auditScenarios.length) setAuditIdx((i) => i + 1);
    else setPhase("reconcile");
  }
  function finishReconcile() {
    s.reconciliation.forEach((r, i) => {
      const checked = !!reconChecked[i];
      if (checked === r.investigate) {
        setPoints((p) => p + 20);
      } else {
        setErrors((e) => e + 1);
        setPoints((p) => p - 10);
      }
    });
    finish(false);
  }
  async function finish(timedOut) {
    let totalPoints = points;
    if (contaminated) totalPoints -= 30;
    const score = computeScore({
      difficulty: caseData?.difficulty,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken,
      timeLimitSec: LIMIT,
      timedOut
    }) - 100 + Math.max(0, totalPoints);
    const finalScore = Math.max(0, Math.round(score));
    const {
      xpGain
    } = await submitScore({
      userId: profile.user_id,
      caseId: caseData.id,
      mode: "warehousing",
      score: finalScore,
      timeTaken: timer.taken,
      errors,
      correctDrugs: 0,
      totalDrugs: 0,
      errorsDetail: errPanel.errors
    });
    setResult({
      score: finalScore,
      xpGain
    });
    setPhase("done");
  }
  if (phase === "done" && result) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(FeedbackScreen, { score: result.score, xpGain: result.xpGain, timeTaken: timer.taken, mentorTip: caseData.mentor_tip, explanation: caseData.explanation, breakdown: [{
      label: "Points earned",
      delta: Math.max(0, points)
    }, {
      label: "Errors",
      delta: -errors * 5
    }, {
      label: "Contaminated stock",
      delta: contaminated ? -30 : 0
    }], errors: errPanel.errors, onNext: next });
  }
  const phaseLabel = {
    receiving: "Receiving stock",
    dispatch: "Dispatch (FEFO)",
    expiry: "Expiry management",
    audit: "Operations audit",
    reconcile: "Reconciliation",
    done: "Done"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    difficultyModal,
    /* @__PURE__ */ jsxRuntimeExports.jsx(GameHeader, { title: `Warehouse · ${phaseLabel[phase]}`, remaining: timer.remaining, pct: timer.pct, paused: timer.paused, togglePause: timer.togglePause, score: points, onExit, onHint: () => {
      setHints((n) => n + 1);
      toast("Read each label carefully — storage requirements matter.");
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-7xl px-4 py-4", children: [
      phase === "receiving" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-4 lg:grid-cols-[1fr_1.3fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Incoming shipments" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: s.shipments.map((sh) => {
            const done = !!placed[sh.id];
            const active = activeShip === sh.id;
            return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: done, onClick: () => setActiveShip(sh.id), className: `w-full rounded-xl border p-3 text-left text-sm transition ${active ? "border-primary bg-primary/10" : done ? "border-primary/30 bg-muted/20 opacity-60" : "border-border/40 hover:border-primary/40"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: sh.drug }),
                sh.controlled && /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3 text-amber-400" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
                "Batch ",
                sh.batch,
                " · exp ",
                sh.expiry
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-primary", children: sh.requirement }),
              sh.tempLog && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 rounded bg-background/40 p-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TempLogChart, { log: sh.tempLog }) }),
              done && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-[10px] text-muted-foreground", children: [
                "→ ",
                placed[sh.id]
              ] })
            ] }) }, sh.id);
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !allReceived, onClick: startDispatch, className: "mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Proceed to dispatch →" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Warehouse zones" }),
          !activeShip && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Select a shipment, then choose a zone." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 grid gap-2 sm:grid-cols-2", children: [
            s.zones.map((z) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: !activeShip, onClick: () => placeShipment(z), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 disabled:opacity-40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: z }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Drop the selected shipment here." })
            ] }, z)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: !activeShip, onClick: () => placeShipment("quarantine"), className: "rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm hover:bg-amber-500/15 disabled:opacity-40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1 font-semibold text-amber-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-3.5" }),
                " Quarantine — temperature excursion"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Use if the shipment's temp log shows an excursion." })
            ] })
          ] })
        ] })
      ] }),
      phase === "dispatch" && s.dispatch[dispatchIdx] && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
          "Dispatch order ",
          dispatchIdx + 1,
          " / ",
          s.dispatch.length
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mt-1 text-lg font-bold", children: [
          "Pick a batch of ",
          s.dispatch[dispatchIdx].drug
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Use FEFO — first expired, first out." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 grid gap-2 sm:grid-cols-2", children: s.dispatch[dispatchIdx].batches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => answerDispatch(b.batch), className: "rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: b.batch }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Expires ",
            b.expiry
          ] })
        ] }, b.batch)) })
      ] }),
      phase === "expiry" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Expiry management" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Items approaching expiry" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: s.expiring.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: it.drug }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "Batch ",
              it.batch,
              " · expires ",
              it.expiry,
              " ",
              it.hasOrder ? "· has active order" : "· no orders"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1", children: ["Mark for Priority Dispatch", "Mark for Return to Supplier"].map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !!expiryAns[i], onClick: () => answerExpiry(i, a), className: `rounded-full px-3 py-1 text-xs ${expiryAns[i] === a ? "bg-primary text-primary-foreground" : "border border-border/40"}`, children: a.replace("Mark for ", "") }, a)) })
        ] }) }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: !allExpiryAnswered, onClick: () => setPhase("audit"), className: "mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40", children: "Continue to operations audit →" })
      ] }),
      phase === "audit" && auditScenarios[auditIdx] && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "grid gap-4 lg:grid-cols-[0.9fr_1.1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Operations audit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Deviation dashboard" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-2", children: auditScenarios.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border px-3 py-2 text-xs ${i === auditIdx ? "border-primary/50 bg-primary/10" : auditAns[i] ? "border-primary/25 bg-primary/5" : "border-border/35 bg-muted/20"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: item.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground", children: auditAns[i] ? "Done" : i === auditIdx ? "Active" : "Pending" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-muted-foreground", children: item.tag })
          ] }, item.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: [
            "Audit decision ",
            auditIdx + 1,
            " / ",
            auditScenarios.length
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-xl font-bold", children: auditScenarios[auditIdx].title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm leading-relaxed text-muted-foreground", children: auditScenarios[auditIdx].prompt }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid gap-2", children: auditScenarios[auditIdx].options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => answerAudit(option), className: "rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm transition hover:border-primary/45 hover:bg-primary/5", children: option }, option)) })
        ] })
      ] }),
      phase === "reconcile" && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Inventory reconciliation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: "Check items needing investigation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "mt-3 w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-xs uppercase text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 text-left", children: "Item" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 text-right", children: "Expected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 text-right", children: "Actual" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2 text-center", children: "Investigate?" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: s.reconciliation.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.item }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: r.expected }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-right tabular-nums", children: r.actual }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: !!reconChecked[i], onChange: (e) => setReconChecked((m) => ({
              ...m,
              [i]: e.target.checked
            })) }) })
          ] }, i)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: finishReconcile, className: "mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground", children: "Finalize and submit" })
      ] }),
      registerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur", onClick: () => setRegisterOpen(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
        scale: 0.9,
        opacity: 0
      }, animate: {
        scale: 1,
        opacity: 1
      }, className: "w-full max-w-md rounded-2xl border border-border/40 bg-card p-6", onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "size-3.5" }),
          " Controlled substances register"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-1 text-lg font-bold", children: s.shipments.find((x) => x.id === registerOpen)?.drug }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Quantity received" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: registerData.qty, onChange: (e) => setRegisterData({
              ...registerData,
              qty: e.target.value
            }), className: "mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2", placeholder: "e.g. 50 ampoules" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Received by" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: registerData.receiver, onChange: (e) => setRegisterData({
              ...registerData,
              receiver: e.target.value
            }), className: "mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2", placeholder: "Pharmacist name" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: completeRegister, className: "mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground", children: "Sign and place in secure zone" })
      ] }) })
    ] }),
    errPanel.panel
  ] });
}
function TempLogChart({
  log
}) {
  const pts = Array.from({
    length: 12
  }, (_, i) => {
    const t = i / 11;
    const v = log.min + (log.max - log.min) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    return v;
  });
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = Math.max(1, hi - lo);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-0.5", children: [
    pts.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-1.5 rounded-t ${v > 8 || v < 2 ? "bg-destructive" : "bg-primary"}`, style: {
      height: `${10 + (v - lo) / span * 22}px`
    } }, i)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 text-[10px] text-muted-foreground", children: [
      log.min,
      "–",
      log.max,
      "°C"
    ] })
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(ModeTheme, { mode: "warehousing", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WarehouseGame, {}) });
export {
  SplitComponent as component
};
