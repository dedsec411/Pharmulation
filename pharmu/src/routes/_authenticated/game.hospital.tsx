import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, MODE_TIMERS, toastScore, type Mode } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";

export const Route = createFileRoute("/_authenticated/game/hospital")({
  head: () => ({ meta: [{ title: "Hospital — PharmaVerse" }] }),
  component: () => <ModeTheme mode="hospital"><HospitalGame mode="hospital" /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const ROUTES = ["oral", "IV", "IM", "SC"];
const FREQS = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];

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
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader(mode);
  const [allDrugs, setAllDrugs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [done, setDone] = useState(false);

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
  useEffect(() => { setOrders([]); setHints(0); setResult(null); setDone(false); setSearch(""); }, [caseData?.id]);

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
      toast.warning(`⚠️ Interaction: ${d.name} + ${ints.join(", ")}`, { duration: 5000 });
      errPanel.logError({
        errorType: "Drug interaction risk",
        wrongChoice: `${d.name} + ${ints.join(", ")}`,
        correctChoice: `Remove ${d.name} or replace with a non-interacting alternative; add monitoring if combination is unavoidable.`,
        whyWrong: `${d.name} interacts with ${ints.join(", ")}, increasing risk of toxicity, reduced efficacy, or serious adverse events.`,
        whatToKnow: "Always run an interaction check before submitting hospital orders. Major interactions require substitution or close monitoring.",
        hint: "Check the patient's current med list before adding a new drug.",
      });
    }
    // renal alert
    const eGFR = caseData?.patient_info_json?.labs?.eGFR;
    if (eGFR && eGFR < 60 && d.contraindications?.some((c: string) => /renal/i.test(c))) {
      toast.warning(`⚠️ Renal caution: eGFR ${eGFR}, dose-adjust ${d.name}`, { duration: 5000 });
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
        whatToKnow: "Hospital orders must match the indication on the physician order. Cross-check allergies, current meds, and labs before adding any drug.",
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

  if (loading || !caseData) return <Loading />;
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
  return (
    <>
      <GameHeader title={caseData.title ?? "Hospital"}onExit={onExit} remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause} score={orders.length * 5}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint used"); toast.info(`Hint: ${caseData.mentor_tip}`); }} />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.3fr]">
        <aside className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient file</p>
          <h2 className="mt-1 text-lg font-bold">{patient.name}</h2>
          <p className="text-sm text-muted-foreground">Age {patient.age} · {patient.diagnosis ?? patient.condition}</p>
          {patient.allergies && <Row label="Allergies" value={patient.allergies} />}
          {currentMeds.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Current meds</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                {currentMeds.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {patient.labs && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Labs</p>
              <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
                {Object.entries(patient.labs).map(([k, v]) => (
                  <div key={k} className="rounded bg-muted/30 px-2 py-1 text-xs"><b>{k}:</b> {String(v)}</div>
                ))}
              </div>
            </div>
          )}
          {patient.order && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Physician order</p>
              <p className="mt-1">{patient.order}</p>
            </div>
          )}
        </aside>

        <section className="space-y-3">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Add medication</p>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drug…"
              className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {search && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/30">
                {filtered.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => addOrder(d)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted">
                      <span>{d.name} <span className="text-xs text-muted-foreground">{d.category}</span></span>
                      <Plus className="size-4 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Order builder</p>
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {orders.map((o, i) => (
                  <li key={i} className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{o.drug}</p>
                      <button onClick={() => removeOrder(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <input placeholder="Dose (mg)" value={o.dose} onChange={(e) => updateOrder(i, { dose: e.target.value })}
                        className="rounded border border-border/40 bg-background/60 px-2 py-1" />
                      <select value={o.route} onChange={(e) => updateOrder(i, { route: e.target.value })}
                        className="rounded border border-border/40 bg-background/60 px-2 py-1">
                        {ROUTES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <select value={o.frequency} onChange={(e) => updateOrder(i, { frequency: e.target.value })}
                        className="rounded border border-border/40 bg-background/60 px-2 py-1">
                        {FREQS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
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
  return <p className="mt-2 text-sm"><span className="text-xs uppercase tracking-wider text-primary">{label}:</span> {String(value)}</p>;
}
function Loading() {
  return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading case…</main>;
}
