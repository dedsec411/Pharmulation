import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";
import { ModeTheme } from "@/components/game/ModeTheme";
import { ModeAmbientLayer } from "@/components/game/ModeAmbientLayer";
import { useTimer } from "@/lib/game/useTimer";
import {
  computeScore, submitScore, MODE_TIMERS, toastScore, bumpCounterBadge,
} from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { AlertTriangle, Barcode, Flag, Lock, Package, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";

export const Route = createFileRoute("/_authenticated/game/warehousing")({
  head: () => ({ meta: [{ title: "Warehousing - Pharmulation" }] }),
  component: () => <ModeTheme mode="warehousing"><WarehouseGame /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const LIMIT = MODE_TIMERS.warehousing;
type Phase = "receiving" | "dispatch" | "expiry" | "audit" | "reconcile" | "done";

type AuditScenario = {
  id: string;
  title: string;
  tag: string;
  prompt: string;
  options: string[];
  correctAction: string;
  points: number;
  penalty: number;
  errorType: string;
  whyWrong: string;
  whatToKnow: string;
};

function buildAuditScenarios(s: any): AuditScenario[] {
  const shipments = Array.isArray(s.shipments) ? s.shipments : [];
  const expiring = Array.isArray(s.expiring) ? s.expiring : [];
  const reconciliation = Array.isArray(s.reconciliation) ? s.reconciliation : [];
  const excursion = shipments.find((ship: any) => ship.tempLog?.excursion);
  const controlled = shipments.find((ship: any) => ship.controlled);
  const nearExpiry = expiring[0] ?? shipments.find((ship: any) => ship.expiry);
  const variance = reconciliation.find((row: any) => row.investigate) ?? reconciliation[0];

  const scenarios: AuditScenario[] = [];

  if (excursion) {
    scenarios.push({
      id: "cold-chain-deviation",
      title: "Cold-chain deviation",
      tag: `${excursion.drug} reached ${excursion.tempLog?.max ?? "unsafe"}C`,
      prompt: `${excursion.drug} batch ${excursion.batch} arrived with a temperature log outside its safe range. The delivery note is complete and the ward is asking for urgent release. What is the safest warehouse action?`,
      options: [
        "Release it because the paperwork is complete",
        "Move it to ambient stock and add a verbal note",
        "Quarantine affected stock and open a temperature deviation report",
        "Rewrite the log after checking the fridge is now stable",
      ],
      correctAction: "Quarantine affected stock and open a temperature deviation report",
      points: 25,
      penalty: 20,
      errorType: "Cold-chain deviation released",
      whyWrong: "A temperature excursion means product quality is uncertain until the deviation is investigated and stability guidance is reviewed.",
      whatToKnow: "Cold-chain excursions require quarantine, deviation documentation, pharmacist/QA review, and manufacturer stability advice before any release.",
    });
  }

  if (controlled) {
    scenarios.push({
      id: "controlled-stock-discrepancy",
      title: "Controlled stock discrepancy",
      tag: `${controlled.drug} requires secure register control`,
      prompt: `During handover, the controlled-drug count for ${controlled.drug} batch ${controlled.batch} does not match the register. The next dispatch run is waiting. What should you do?`,
      options: [
        "Adjust the count so the dispatch is not delayed",
        "Dispatch the requested stock and investigate later",
        "Escalate discrepancy, lock stock, and investigate the controlled register",
        "Ignore it until the monthly stock count",
      ],
      correctAction: "Escalate discrepancy, lock stock, and investigate the controlled register",
      points: 25,
      penalty: 20,
      errorType: "Controlled stock discrepancy mishandled",
      whyWrong: "Controlled medicines need immediate secure investigation. Adjusting or ignoring the register can hide diversion or dispensing errors.",
      whatToKnow: "For controlled stock, stop movement, secure the stock, verify physical count against the register, and escalate according to SOP.",
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
      options: [
        "Block affected batch and notify stores before dispatch",
        "Send it first because FEFO says earliest expiry goes out first",
        "Hide the batch until someone asks for it again",
        "Return all stock without checking the recall details",
      ],
      correctAction: "Block affected batch and notify stores before dispatch",
      points: 20,
      penalty: 15,
      errorType: "Recall screen missed",
      whyWrong: "FEFO does not override a possible recall or safety hold. Stock under investigation must be blocked before dispatch.",
      whatToKnow: "Recall and safety alerts take priority over dispatch. Block the affected batch, trace locations, and communicate the hold clearly.",
    });
  }

  if (variance) {
    const diff = Number(variance.actual ?? 0) - Number(variance.expected ?? 0);
    scenarios.push({
      id: "reconciliation-capa",
      title: "Reconciliation CAPA",
      tag: `${variance.item ?? "Stock"} variance ${diff > 0 ? "+" : ""}${diff}`,
      prompt: `Reconciliation shows ${variance.item ?? "an item"} expected ${variance.expected ?? "?"} but actual ${variance.actual ?? "?"}. The team wants to close the count quickly. What is the correct closure step?`,
      options: [
        "Investigate variance, recount, and document CAPA before closing",
        "Change the expected quantity to match the shelf count",
        "Close the count and wait for the next cycle count",
        "Move stock from another location to balance the line",
      ],
      correctAction: "Investigate variance, recount, and document CAPA before closing",
      points: 20,
      penalty: 15,
      errorType: "Variance closed without investigation",
      whyWrong: "Closing a variance without investigation leaves the root cause unknown and can conceal picking, receiving, theft, or system-entry errors.",
      whatToKnow: "Reconciliation needs a recount, transaction review, documented cause, and corrective/preventive action before closure.",
    });
  }

  if (scenarios.length < 3) {
    scenarios.push({
      id: "segregation-audit",
      title: "Segregation audit",
      tag: "Damaged and saleable stock mixed",
      prompt: "A shelf check finds a damaged carton stored beside saleable stock, with no quarantine label. What is the correct action?",
      options: [
        "Leave it in place and tell the next shift",
        "Remove and quarantine damaged stock with documentation",
        "Open the carton and use undamaged packs first",
        "Put it behind the saleable stock until QA visits",
      ],
      correctAction: "Remove and quarantine damaged stock with documentation",
      points: 20,
      penalty: 15,
      errorType: "Damaged stock not segregated",
      whyWrong: "Damaged stock can be accidentally supplied if it remains in the saleable area.",
      whatToKnow: "Damaged, recalled, expired, or suspect stock must be physically segregated and documented immediately.",
    });
  }

  return scenarios.slice(0, 4);
}

function WarehouseGame() {
  const onExit = useGameExit("/modes");
  const { profile } = useAuthStore();
  const { difficulty, difficultyModal } = useDifficultyChoice("warehousing");
  const { caseData, loading, next } = useCaseLoader("warehousing", difficulty);
  const s = caseData?.shipment_json;
  const [phase, setPhase] = useState<Phase>("receiving");

  const [points, setPoints] = useState(0);
  const [errors, setErrors] = useState(0);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // shipment id -> zone or "quarantine"
  const [activeShip, setActiveShip] = useState<string | null>(null);
  const [landedShip, setLandedShip] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState({ qty: "", receiver: "" });
  const [contaminated, setContaminated] = useState(false);
  const [hints, setHints] = useState(0);

  // dispatch
  const [dispatchIdx, setDispatchIdx] = useState(0);
  const [dispatchAns, setDispatchAns] = useState<Record<number, string>>({});

  // expiring
  const [expiryAns, setExpiryAns] = useState<Record<number, string>>({});

  // operations audit
  const [auditIdx, setAuditIdx] = useState(0);
  const [auditAns, setAuditAns] = useState<Record<number, string>>({});

  // reconciliation
  const [reconChecked, setReconChecked] = useState<Record<number, boolean>>({});

  const [result, setResult] = useState<any>(null);
  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "warehousing",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });
  const auditScenarios = useMemo(() => s ? buildAuditScenarios(s) : [], [caseData?.id, s]);

  useEffect(() => {
    setPhase("receiving"); setPoints(0); setErrors(0); setPlaced({});
    setActiveShip(null); setLandedShip(null); setRegisterOpen(null); setRegisterData({ qty: "", receiver: "" });
    setContaminated(false); setHints(0); setDispatchIdx(0); setDispatchAns({});
    setExpiryAns({}); setAuditIdx(0); setAuditAns({}); setReconChecked({}); setResult(null);
  }, [caseData?.id]);

  if (loading || !caseData || !s) {
    return (
      <>
        {difficultyModal}
        <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading warehouse...</main>
      </>
    );
  }

  function placeShipment(zoneOrQuarantine: string) {
    if (!activeShip) return;
    const ship = s.shipments.find((x: any) => x.id === activeShip);
    if (!ship) return;
    const hasExcursion = ship.tempLog?.excursion;

    if (zoneOrQuarantine === "quarantine") {
      if (hasExcursion) { setPoints((p) => p + 25); toastScore(25, "Excursion caught"); }
      else {
        setErrors((e) => e + 1); setPoints((p) => p - 10); toastScore(-10, "Unnecessary quarantine");
        errPanel.logError({
          errorType: "Unnecessary quarantine",
          wrongChoice: `Quarantined ${ship.drug}`,
          correctChoice: `Place ${ship.drug} in ${ship.correctZone}`,
          whyWrong: `This shipment has no temperature excursion and meets storage requirements. Unnecessary quarantine ties up stock and delays patient supply.`,
          whatToKnow: "Only quarantine when there is a documented quality issue: temperature excursion, damaged packaging, missing paperwork, or batch recall.",
        });
      }
      setPlaced((m) => ({ ...m, [ship.id]: "quarantine" }));
      setLandedShip(ship.id);
      window.setTimeout(() => setLandedShip((id) => (id === ship.id ? null : id)), 650);
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
        whatToKnow: "Any temperature excursion in cold-chain products mandates quarantine and investigation. Review the temp log on every receipt.",
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
        whatToKnow: "Storage requirements are on the drug label and SPC. Cold chain (2–8°C), frozen (–20°C), controlled-room-temp, and controlled-drug cabinets are all distinct.",
      });
    }
    setPlaced((m) => ({ ...m, [ship.id]: zoneOrQuarantine }));
    setLandedShip(ship.id);
    window.setTimeout(() => setLandedShip((id) => (id === ship.id ? null : id)), 650);
    setActiveShip(null);
  }

  function completeRegister() {
    const ship = s.shipments.find((x: any) => x.id === registerOpen);
    if (!ship) return;
    if (!registerData.qty || !registerData.receiver) {
      toast.warning("Fill in quantity and receiver"); return;
    }
    setPoints((p) => p + 20 + 15);
    toastScore(20, "Controlled register OK");
    setPlaced((m) => ({ ...m, [ship.id]: ship.correctZone }));
    setRegisterOpen(null);
    setRegisterData({ qty: "", receiver: "" });
    setActiveShip(null);
  }

  const allReceived = s.shipments.every((sh: any) => placed[sh.id]);

  async function startDispatch() {
    // Award cold-chain badge if all excursions correctly quarantined
    const excursions = s.shipments.filter((sh: any) => sh.tempLog?.excursion);
    const allCaught = excursions.every((sh: any) => placed[sh.id] === "quarantine");
    if (excursions.length > 0 && allCaught && profile) {
      await bumpCounterBadge(profile.user_id, "coldchain_caught", 5, {
        name: "Cold Chain Guardian", description: "Correctly identify 5 temperature excursions", icon: "❄️",
      });
    }
    setPhase("dispatch");
  }

  function answerDispatch(batch: string) {
    const order = s.dispatch[dispatchIdx];
    const ok = batch === order.correctBatch;
    setDispatchAns((m) => ({ ...m, [dispatchIdx]: batch }));
    if (ok) {
      setPoints((p) => p + 20); toastScore(20, "FEFO ✓");
      if (profile) {
        bumpCounterBadge(profile.user_id, "fefo_correct", 10, {
          name: "FEFO Expert", description: "Complete 10 correct FEFO dispatches", icon: "📦",
        });
      }
    } else {
      setErrors((e) => e + 1); setPoints((p) => p - 15);
      toastScore(-15, "FEFO violated");
      toast.warning("First Expired, First Out — pick the earliest expiry.");
      const correctBatchObj = order.batches.find((b: any) => b.batch === order.correctBatch);
      const pickedBatchObj = order.batches.find((b: any) => b.batch === batch);
      errPanel.logError({
        errorType: "FEFO violated",
        wrongChoice: `Batch ${batch} (expires ${pickedBatchObj?.expiry ?? "?"})`,
        correctChoice: `Batch ${order.correctBatch} (expires ${correctBatchObj?.expiry ?? "?"})`,
        whyWrong: `You dispatched a later-expiry batch while an earlier-expiring batch was still in stock. The earlier batch will likely expire on the shelf and be wasted.`,
        whatToKnow: "FEFO (First Expired, First Out) ensures medicines reach patients before they expire. Always sort batches by expiry before picking.",
      });
    }
    if (dispatchIdx + 1 < s.dispatch.length) setDispatchIdx((i) => i + 1);
    else setPhase(s.expiring?.length ? "expiry" : "audit");
  }

  function answerExpiry(idx: number, action: string) {
    const item = s.expiring[idx];
    const ok = action === item.correctAction;
    setExpiryAns((m) => ({ ...m, [idx]: action }));
    if (ok) { setPoints((p) => p + 15); toastScore(15, "Expiry handled"); }
    else {
      setErrors((e) => e + 1); setPoints((p) => p - 5); toastScore(-5, "Wrong action");
      errPanel.logError({
        errorType: "Wrong expiry-handling action",
        wrongChoice: `${item.drug} batch ${item.batch}: ${action}`,
        correctChoice: item.correctAction,
        whyWrong: `${action} is the wrong call for this near-expiry item. ${item.hasOrder ? "It has an active order, so priority-dispatch is correct." : "With no orders, returning to supplier prevents waste."}`,
        whatToKnow: "Near-expiry items with active orders → priority dispatch. Without orders → return to supplier for credit (if eligible) or controlled destruction.",
      });
    }
  }
  const allExpiryAnswered = (s.expiring ?? []).every((_: any, i: number) => expiryAns[i]);

  function answerAudit(action: string) {
    const scenario = auditScenarios[auditIdx];
    if (!scenario) return;
    const ok = action === scenario.correctAction;
    setAuditAns((m) => ({ ...m, [auditIdx]: action }));
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
        whatToKnow: scenario.whatToKnow,
      });
    }
    if (auditIdx + 1 < auditScenarios.length) setAuditIdx((i) => i + 1);
    else setPhase("reconcile");
  }

  function finishReconcile() {
    s.reconciliation.forEach((r: any, i: number) => {
      const checked = !!reconChecked[i];
      if (checked === r.investigate) { setPoints((p) => p + 20); }
      else { setErrors((e) => e + 1); setPoints((p) => p - 10); }
    });
    finish(false);
  }

  async function finish(timedOut: boolean) {
    let totalPoints = points;
    if (contaminated) totalPoints -= 30;
    const score = computeScore({
      difficulty: caseData?.difficulty,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    }) - 100 + Math.max(0, totalPoints);
    const finalScore = Math.max(0, Math.round(score));
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "warehousing",
      score: finalScore, timeTaken: timer.taken, errors,
      correctDrugs: 0, totalDrugs: 0,
      errorsDetail: errPanel.errors,
    });
    setResult({ score: finalScore, xpGain });
    setPhase("done");
  }

  if (phase === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        breakdown={[
          { label: "Points earned", delta: Math.max(0, points) },
          { label: "Errors", delta: -errors * 5 },
          { label: "Contaminated stock", delta: contaminated ? -30 : 0 },
        ]}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  const phaseLabel: Record<Phase, string> = {
    receiving: "Receiving stock", dispatch: "Dispatch (FEFO)", expiry: "Expiry management",
    audit: "Operations audit", reconcile: "Reconciliation", done: "Done",
  };

  return (
    <>
      {difficultyModal}
      <GameHeader
        title={`Warehouse · ${phaseLabel[phase]}`}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={points}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toast("Read each label carefully — storage requirements matter."); }}
      />

      <main className="relative mx-auto max-w-7xl overflow-hidden px-4 py-4">
        <ModeAmbientLayer mode="warehousing" intensity="screen" />
        {phase === "receiving" && (
          <section className="relative z-10 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-2xl border border-sky-300/20 bg-slate-950/55 p-4 shadow-[0_24px_80px_-48px_rgba(56,189,248,0.8)] backdrop-blur-xl">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-200/80"><Package className="size-3.5" /> Incoming manifests</p>
              <ul className="mt-3 space-y-2">
                {s.shipments.map((sh: any) => {
                  const done = !!placed[sh.id];
                  const active = activeShip === sh.id;
                  const excursion = !!sh.tempLog?.excursion;
                  return (
                    <li key={sh.id}>
                      <motion.button disabled={done} onClick={() => setActiveShip(sh.id)}
                        initial={{ x: 34, opacity: 0 }}
                        animate={{ x: 0, y: landedShip === sh.id ? [-18, 7, 0] : 0, scale: landedShip === sh.id ? [1, 1.035, 1] : 1, opacity: 1 }}
                        transition={{ duration: landedShip === sh.id ? 0.42 : 0.35, ease: "easeOut" }}
                        className={`group relative w-full overflow-hidden rounded-xl border p-3 pl-7 text-left text-sm transition ${active ? "border-sky-300/70 bg-sky-400/15 shadow-[0_18px_48px_-28px_rgba(56,189,248,0.95)]" : done ? "border-sky-300/25 bg-slate-900/35 opacity-65" : "border-sky-300/20 bg-slate-900/45 hover:-translate-y-0.5 hover:border-sky-300/50 hover:bg-sky-400/10 hover:shadow-[0_18px_44px_-30px_rgba(56,189,248,0.9)]"}`}>
                        <span className="absolute inset-y-3 left-2 flex w-2 items-center justify-center rounded-full bg-slate-950/80">
                          <Barcode className="h-12 w-4 text-sky-200/70" />
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-50">{sh.drug}</span>
                          <span className="flex items-center gap-2">
                            {excursion && <Thermometer className="size-4 animate-pulse text-red-400" />}
                            {sh.controlled && <Lock className="size-3.5 text-amber-300" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Batch {sh.batch} · exp {sh.expiry}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] text-sky-200">{sh.requirement}</p>
                          <span className="rotate-[-4deg] rounded border border-sky-200/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-sky-100/80">arrived</span>
                        </div>
                        {sh.tempLog && (
                          <div className="mt-3 rounded-lg border border-sky-200/15 bg-slate-950/45 p-2">
                            <TempLogChart log={sh.tempLog} />
                          </div>
                        )}
                        {done && <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-sky-200/70">Landed in {placed[sh.id]}</p>}
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
              <button disabled={!allReceived} onClick={startDispatch}
                className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                Proceed to dispatch →
              </button>
            </div>

            <div className="rounded-2xl border border-sky-300/20 bg-slate-950/55 p-4 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.7)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Warehouse zones</p>
              {!activeShip && <p className="mt-3 text-sm text-slate-400">Select a manifest, then choose a zone.</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {s.zones.map((z: string) => (
                  <motion.button key={z} disabled={!activeShip} onClick={() => placeShipment(z)}
                    whileTap={activeShip ? { y: [0, 8, 0], scale: [1, 0.98, 1] } : undefined}
                    className="rounded-xl border border-sky-300/20 bg-sky-400/5 p-3 text-left text-sm transition hover:border-sky-300/45 hover:bg-sky-400/10 disabled:opacity-40">
                    <p className="font-semibold">{z}</p>
                    <p className="text-[11px] text-slate-400">Drop the selected shipment here.</p>
                  </motion.button>
                ))}
                <motion.button disabled={!activeShip} onClick={() => placeShipment("quarantine")}
                  whileTap={activeShip ? { y: [0, 8, 0], scale: [1, 0.98, 1] } : undefined}
                  className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-3 text-left text-sm shadow-[0_0_34px_-22px_rgba(251,191,36,0.9)] transition hover:bg-amber-400/15 disabled:opacity-40"
                  style={{ borderImage: "repeating-linear-gradient(45deg, rgba(251,191,36,0.95) 0 10px, rgba(15,23,42,0.95) 10px 20px) 1" }}>
                  <p className="flex items-center gap-1 font-semibold text-amber-300"><AlertTriangle className="size-3.5 animate-pulse" /> Quarantine - temperature excursion</p>
                  <p className="text-[11px] text-slate-400">Use if the shipment's temp log shows an excursion.</p>
                </motion.button>
              </div>
            </div>
          </section>
        )}

        {phase === "dispatch" && s.dispatch[dispatchIdx] && (
          <section className="relative z-10 rounded-2xl border border-sky-300/20 bg-slate-950/55 p-6 shadow-[0_24px_80px_-50px_rgba(56,189,248,0.85)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">FEFO dispatch {dispatchIdx + 1} / {s.dispatch.length}</p>
            <h3 className="mt-1 text-lg font-bold">Pick a batch of {s.dispatch[dispatchIdx].drug}</h3>
            <p className="text-sm text-slate-400">Use FEFO - the earliest expiry sits at the front of the shelf.</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-900/35 p-4">
              <div className="mb-3 h-2 rounded-full bg-gradient-to-r from-sky-300/50 via-slate-700 to-sky-300/30" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...s.dispatch[dispatchIdx].batches]
                  .sort((a: any, b: any) => String(a.expiry).localeCompare(String(b.expiry)))
                  .map((b: any, i: number) => (
                    <motion.button
                      key={b.batch}
                      onClick={() => answerDispatch(b.batch)}
                      whileTap={{ y: 8, scale: 0.98 }}
                      className={`relative min-h-28 rounded-lg border p-3 text-left text-sm shadow-[0_16px_36px_-28px_rgba(56,189,248,0.9)] transition hover:-translate-y-1 hover:border-sky-300/60 hover:bg-sky-400/10 ${
                        i === 0 ? "border-sky-300/55 bg-sky-400/15" : "border-sky-300/20 bg-slate-950/55"
                      }`}
                    >
                      <span className="absolute right-3 top-3 rounded border border-sky-200/30 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-sky-100/70">
                        {i === 0 ? "front" : `row ${i + 1}`}
                      </span>
                      <Package className="mb-3 size-7 text-sky-200/80" />
                      <p className="font-semibold">{b.batch}</p>
                      <p className="text-xs text-slate-400">Expires {b.expiry}</p>
                    </motion.button>
                  ))}
              </div>
            </div>
          </section>
        )}

        {phase === "expiry" && (
          <section className="relative z-10 rounded-2xl border border-sky-300/20 bg-slate-950/55 p-6 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.7)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Expiry management</p>
            <h3 className="mt-1 text-lg font-bold">Items approaching expiry</h3>
            <ul className="mt-3 space-y-2">
              {s.expiring.map((it: any, i: number) => (
                <li key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{it.drug}</p>
                      <p className="text-xs text-muted-foreground">Batch {it.batch} · expires {it.expiry} {it.hasOrder ? "· has active order" : "· no orders"}</p>
                    </div>
                    <div className="flex gap-1">
                      {["Mark for Priority Dispatch", "Mark for Return to Supplier"].map((a) => (
                        <button key={a} disabled={!!expiryAns[i]} onClick={() => answerExpiry(i, a)}
                          className={`rounded-full px-3 py-1 text-xs ${expiryAns[i] === a ? "bg-primary text-primary-foreground" : "border border-border/40"}`}>
                          {a.replace("Mark for ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button disabled={!allExpiryAnswered} onClick={() => setPhase("audit")}
              className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              Continue to operations audit →
            </button>
          </section>
        )}

        {phase === "audit" && auditScenarios[auditIdx] && (
          <section className="relative z-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-2xl border border-sky-300/20 bg-slate-950/55 p-5 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.7)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Operations audit</p>
              <h3 className="mt-1 text-lg font-bold">Deviation dashboard</h3>
              <div className="mt-4 space-y-2">
                {auditScenarios.map((item, i) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      i === auditIdx
                        ? "border-primary/50 bg-primary/10"
                        : auditAns[i]
                          ? "border-primary/25 bg-primary/5"
                          : "border-border/35 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{item.title}</span>
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {auditAns[i] ? "Done" : i === auditIdx ? "Active" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.tag}</p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="rounded-2xl border border-sky-300/20 bg-slate-950/55 p-6 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.7)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Audit decision {auditIdx + 1} / {auditScenarios.length}
              </p>
              <h3 className="mt-1 text-xl font-bold">{auditScenarios[auditIdx].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{auditScenarios[auditIdx].prompt}</p>
              <div className="mt-5 grid gap-2">
                {auditScenarios[auditIdx].options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => answerAudit(option)}
                    className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm transition hover:border-primary/45 hover:bg-primary/5"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {phase === "reconcile" && (
          <section className="relative z-10 rounded-2xl border border-sky-300/20 bg-slate-950/55 p-6 shadow-[0_24px_80px_-52px_rgba(56,189,248,0.75)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Printed stocktake sheet</p>
            <h3 className="mt-1 text-lg font-bold">Check items needing investigation</h3>
            <table className="mt-4 w-full overflow-hidden rounded-xl border border-sky-300/20 bg-slate-900/40 text-sm">
              <thead className="border-b border-sky-300/20 bg-sky-400/10 text-xs uppercase text-sky-100/75">
                <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Expected</th><th className="p-2 text-right">Actual</th><th className="p-2 text-center">Investigate?</th></tr>
              </thead>
              <tbody>
                {s.reconciliation.map((r: any, i: number) => {
                  const discrepancy = Number(r.expected) !== Number(r.actual);
                  return (
                  <tr key={i} className={`border-t border-sky-300/10 ${discrepancy ? "bg-red-500/10 text-red-50" : ""}`}>
                    <td className="p-2">
                      <span className="inline-flex items-center gap-2">
                        {discrepancy && <Flag className="size-3.5 text-red-300" />}
                        {r.item}
                      </span>
                    </td>
                    <td className="p-2 text-right tabular-nums">{r.expected}</td>
                    <td className="p-2 text-right tabular-nums">{r.actual}</td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={!!reconChecked[i]} onChange={(e) => setReconChecked((m) => ({ ...m, [i]: e.target.checked }))} />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <button onClick={finishReconcile} className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
              Finalize and submit
            </button>
          </section>
        )}

        {/* Controlled substance register modal */}
        {registerOpen && (
          <div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur" onClick={() => setRegisterOpen(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-400"><Lock className="size-3.5" /> Controlled substances register</p>
              <h3 className="mt-1 text-lg font-bold">{s.shipments.find((x: any) => x.id === registerOpen)?.drug}</h3>
              <div className="mt-3 space-y-2 text-sm">
                <label className="block">
                  <span className="text-muted-foreground">Quantity received</span>
                  <input value={registerData.qty} onChange={(e) => setRegisterData({ ...registerData, qty: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2" placeholder="e.g. 50 ampoules" />
                </label>
                <label className="block">
                  <span className="text-muted-foreground">Received by</span>
                  <input value={registerData.receiver} onChange={(e) => setRegisterData({ ...registerData, receiver: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2" placeholder="Pharmacist name" />
                </label>
              </div>
              <button onClick={completeRegister} className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground">
                Sign and place in secure zone
              </button>
            </motion.div>
          </div>
        )}
      </main>
      {errPanel.panel}
    </>
  );
}

function TempLogChart({ log }: { log: { min: number; max: number; excursion: boolean } }) {
  const pts = Array.from({ length: 18 }, (_, i) => {
    const t = i / 11;
    const v = log.min + (log.max - log.min) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    return v;
  });
  const lo = Math.min(0, ...pts), hi = Math.max(10, ...pts);
  const span = Math.max(1, hi - lo);
  const yFor = (v: number) => 54 - ((v - lo) / span) * 42;
  const points = pts.map((v, i) => `${6 + i * (188 / (pts.length - 1))},${yFor(v)}`).join(" ");
  const redZoneY = yFor(8);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em]">
        <span className={log.excursion ? "text-red-300" : "text-sky-200/80"}>Temp log</span>
        <span className="text-slate-400">{log.min}-{log.max}C</span>
      </div>
      <svg viewBox="0 0 208 62" className="h-20 w-full overflow-visible rounded-md bg-slate-950/55">
        <defs>
          <linearGradient id="warehouseTempLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(56 189 248)" />
            <stop offset="100%" stopColor={log.excursion ? "rgb(248 113 113)" : "rgb(125 211 252)"} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="208" height="62" rx="8" fill="rgba(15, 23, 42, 0.45)" />
        <path d={`M 0 ${redZoneY} H 208`} stroke="rgb(248 113 113)" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="166" y={Math.max(10, redZoneY - 4)} className="fill-red-300 text-[8px] font-bold">8C red zone</text>
        <polyline points={points} fill="none" stroke="url(#warehouseTempLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((v, i) => (
          <circle key={i} cx={6 + i * (188 / (pts.length - 1))} cy={yFor(v)} r={v > 8 || v < 2 ? 2.5 : 1.7} className={v > 8 || v < 2 ? "fill-red-400" : "fill-sky-200"} />
        ))}
      </svg>
    </div>
  );
}

