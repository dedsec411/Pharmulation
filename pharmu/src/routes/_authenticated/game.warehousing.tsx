import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import {
  computeScore, submitScore, MODE_TIMERS, toastScore, bumpCounterBadge,
} from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { Snowflake, Lock, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";

export const Route = createFileRoute("/_authenticated/game/warehousing")({
  head: () => ({ meta: [{ title: "Warehousing — PharmaVerse" }] }),
  component: () => <ModeTheme mode="warehousing"><WarehouseGame /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const LIMIT = MODE_TIMERS.warehousing;
type Phase = "receiving" | "dispatch" | "expiry" | "reconcile" | "done";

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
  const [registerOpen, setRegisterOpen] = useState<string | null>(null);
  const [registerData, setRegisterData] = useState({ qty: "", receiver: "" });
  const [contaminated, setContaminated] = useState(false);
  const [hints, setHints] = useState(0);

  // dispatch
  const [dispatchIdx, setDispatchIdx] = useState(0);
  const [dispatchAns, setDispatchAns] = useState<Record<number, string>>({});

  // expiring
  const [expiryAns, setExpiryAns] = useState<Record<number, string>>({});

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

  useEffect(() => {
    setPhase("receiving"); setPoints(0); setErrors(0); setPlaced({});
    setActiveShip(null); setRegisterOpen(null); setRegisterData({ qty: "", receiver: "" });
    setContaminated(false); setHints(0); setDispatchIdx(0); setDispatchAns({});
    setExpiryAns({}); setReconChecked({}); setResult(null);
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
    else setPhase(s.expiring?.length ? "expiry" : "reconcile");
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
    reconcile: "Reconciliation", done: "Done",
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

      <main className="mx-auto max-w-7xl px-4 py-4">
        {phase === "receiving" && (
          <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Incoming shipments</p>
              <ul className="mt-3 space-y-2">
                {s.shipments.map((sh: any) => {
                  const done = !!placed[sh.id];
                  const active = activeShip === sh.id;
                  return (
                    <li key={sh.id}>
                      <button disabled={done} onClick={() => setActiveShip(sh.id)}
                        className={`w-full rounded-xl border p-3 text-left text-sm transition ${active ? "border-primary bg-primary/10" : done ? "border-primary/30 bg-muted/20 opacity-60" : "border-border/40 hover:border-primary/40"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{sh.drug}</span>
                          {sh.controlled && <Lock className="size-3 text-amber-400" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Batch {sh.batch} · exp {sh.expiry}</p>
                        <p className="mt-1 text-[11px] text-primary">{sh.requirement}</p>
                        {sh.tempLog && (
                          <div className="mt-2 rounded bg-background/40 p-1.5">
                            <TempLogChart log={sh.tempLog} />
                          </div>
                        )}
                        {done && <p className="mt-1 text-[10px] text-muted-foreground">→ {placed[sh.id]}</p>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button disabled={!allReceived} onClick={startDispatch}
                className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                Proceed to dispatch →
              </button>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Warehouse zones</p>
              {!activeShip && <p className="mt-3 text-sm text-muted-foreground">Select a shipment, then choose a zone.</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {s.zones.map((z: string) => (
                  <button key={z} disabled={!activeShip} onClick={() => placeShipment(z)}
                    className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 disabled:opacity-40">
                    <p className="font-semibold">{z}</p>
                    <p className="text-[11px] text-muted-foreground">Drop the selected shipment here.</p>
                  </button>
                ))}
                <button disabled={!activeShip} onClick={() => placeShipment("quarantine")}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm hover:bg-amber-500/15 disabled:opacity-40">
                  <p className="flex items-center gap-1 font-semibold text-amber-400"><AlertTriangle className="size-3.5" /> Quarantine — temperature excursion</p>
                  <p className="text-[11px] text-muted-foreground">Use if the shipment's temp log shows an excursion.</p>
                </button>
              </div>
            </div>
          </section>
        )}

        {phase === "dispatch" && s.dispatch[dispatchIdx] && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Dispatch order {dispatchIdx + 1} / {s.dispatch.length}</p>
            <h3 className="mt-1 text-lg font-bold">Pick a batch of {s.dispatch[dispatchIdx].drug}</h3>
            <p className="text-sm text-muted-foreground">Use FEFO — first expired, first out.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {s.dispatch[dispatchIdx].batches.map((b: any) => (
                <button key={b.batch} onClick={() => answerDispatch(b.batch)}
                  className="rounded-xl border border-border/40 p-3 text-left text-sm hover:border-primary/40">
                  <p className="font-semibold">{b.batch}</p>
                  <p className="text-xs text-muted-foreground">Expires {b.expiry}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {phase === "expiry" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
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
            <button disabled={!allExpiryAnswered} onClick={() => setPhase("reconcile")}
              className="mt-4 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              Continue to reconciliation →
            </button>
          </section>
        )}

        {phase === "reconcile" && (
          <section className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inventory reconciliation</p>
            <h3 className="mt-1 text-lg font-bold">Check items needing investigation</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Expected</th><th className="p-2 text-right">Actual</th><th className="p-2 text-center">Investigate?</th></tr>
              </thead>
              <tbody>
                {s.reconciliation.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-border/30">
                    <td className="p-2">{r.item}</td>
                    <td className="p-2 text-right tabular-nums">{r.expected}</td>
                    <td className="p-2 text-right tabular-nums">{r.actual}</td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={!!reconChecked[i]} onChange={(e) => setReconChecked((m) => ({ ...m, [i]: e.target.checked }))} />
                    </td>
                  </tr>
                ))}
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
  // Simple sparkline of 12 points oscillating between min and max
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const v = log.min + (log.max - log.min) * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
    return v;
  });
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = Math.max(1, hi - lo);
  return (
    <div className="flex items-end gap-0.5">
      {pts.map((v, i) => (
        <div key={i}
          className={`w-1.5 rounded-t ${v > 8 || v < 2 ? "bg-destructive" : "bg-primary"}`}
          style={{ height: `${10 + ((v - lo) / span) * 22}px` }}
        />
      ))}
      <span className="ml-1 text-[10px] text-muted-foreground">{log.min}–{log.max}°C</span>
    </div>
  );
}

