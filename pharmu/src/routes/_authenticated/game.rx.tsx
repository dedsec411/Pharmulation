import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, MODE_TIMERS, toastScore } from "@/lib/game/shared";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { Check, X as XIcon, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { useGameExit } from "@/lib/game/useGameExit";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";

export const Route = createFileRoute("/_authenticated/game/rx")({
  head: () => ({ meta: [{ title: "Rx Cases — PharmaVerse" }] }),
  component: () => <ModeTheme mode="rx"><RxGame /></ModeTheme>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const CATEGORIES = ["All", "Antibiotic", "Cardiovascular", "OTC Analgesic", "Antidiabetic", "Oncology", "GI", "Respiratory"];

type Phase = "collect" | "info" | "label" | "done";
const LIMIT = MODE_TIMERS.rx;

function RxGame() {
  const onExit = useGameExit("/modes");
  const { difficulty, difficultyModal } = useDifficultyChoice("rx");
  const { profile } = useAuthStore();
  const { caseData, loading, next } = useCaseLoader("rx", difficulty);
  const [phase, setPhase] = useState<Phase>("collect");
  const [collected, setCollected] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [infoRead, setInfoRead] = useState(0);
  const [correctLabels, setCorrectLabels] = useState(0);
  const [wrongLabels, setWrongLabels] = useState(0);
  const [hints, setHints] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [category, setCategory] = useState("All");
  const [drugs, setDrugs] = useState<any[]>([]);
  const [infoIdx, setInfoIdx] = useState(0);
  const [labelIdx, setLabelIdx] = useState(0);
  const [labelAnswers, setLabelAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);

  const timer = useTimer(LIMIT, () => phase !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "rx",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    supabase.from("drugs").select("*").then(({ data }) => setDrugs(data ?? []));
  }, []);

  useEffect(() => {
    setPhase("collect");
    setCollected([]); setWrong(0); setCorrect(0); setInfoRead(0);
    setCorrectLabels(0); setWrongLabels(0); setHints(0); setShowHint(false);
    setInfoIdx(0); setLabelIdx(0); setLabelAnswers({}); setResult(null);
  }, [caseData?.id]);

  const required: string[] = caseData?.drugs_required ?? [];
  const filtered = useMemo(
    () => drugs.filter((d) => category === "All" || d.category === category),
    [drugs, category]
  );

  function addDrug(name: string) {
    if (collected.includes(name)) return;
    setCollected((c) => [...c, name]);
    if (required.includes(name)) { setCorrect((n) => n + 1); toastScore(20, name); }
    else {
      setWrong((n) => n + 1); toastScore(-15, `wrong: ${name}`);
      const d = drugs.find((x) => x.name === name);
      errPanel.logError({
        errorType: "Wrong drug selected",
        wrongChoice: name,
        correctChoice: required.join(", "),
        whyWrong: `${name} is not indicated for this prescription. ${d?.indications?.length ? `It is used for ${d.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: `Think about the class of drug that treats the condition in this prescription.`,
      });
    }
  }
  function removeDrug(name: string) {
    setCollected((c) => c.filter((x) => x !== name));
  }
  function confirmCollection() {
    if (required.some((r) => !collected.includes(r))) {
      toast.warning("Some required drugs still missing");
      return;
    }
    setPhase("info");
  }
  function markInfo() {
    setInfoRead((n) => n + 1); toastScore(15, "info read");
    advanceInfo();
  }
  function advanceInfo() {
    const correctDrugs = collected.filter((c) => required.includes(c));
    if (infoIdx + 1 < correctDrugs.length) setInfoIdx((i) => i + 1);
    else setPhase("label");
  }
  function submitLabel(drug: string, ans: { frequency: string; timing: string; duration: string }) {
    const correctAns = caseData?.correct_answer_json?.labels?.[drug];
    const ok = correctAns &&
      ans.frequency === correctAns.frequency &&
      ans.timing === correctAns.timing &&
      ans.duration === correctAns.duration;
    setLabelAnswers((m) => ({ ...m, [drug]: { ans, ok, correct: correctAns } }));
    if (ok) { setCorrectLabels((n) => n + 1); toastScore(25, "label OK"); }
    else {
      setWrongLabels((n) => n + 1); toastScore(-10, "label off");
      if (correctAns) {
        const fields: string[] = [];
        if (ans.frequency !== correctAns.frequency) fields.push(`frequency (${ans.frequency} vs ${correctAns.frequency})`);
        if (ans.timing !== correctAns.timing) fields.push(`timing (${ans.timing} vs ${correctAns.timing})`);
        if (ans.duration !== correctAns.duration) fields.push(`duration (${ans.duration} vs ${correctAns.duration})`);
        errPanel.logError({
          errorType: "Wrong label",
          wrongChoice: `${drug}: ${ans.frequency} · ${ans.timing} · ${ans.duration}`,
          correctChoice: `${correctAns.frequency} · ${correctAns.timing} · ${correctAns.duration}`,
          whyWrong: `Your label for ${drug} is off on ${fields.join(", ")}. Incorrect dosing instructions can cause subtherapeutic effect, toxicity, or treatment failure.`,
          whatToKnow: `Label instructions for ${drug} are based on its half-life, food interactions, and recommended course duration. Always cross-check against the BNF/formulary entry.`,
          hint: `Re-read the prescription Sig and the drug monograph carefully.`,
        });
      }
    }
    const correctDrugs = collected.filter((c) => required.includes(c));
    if (labelIdx + 1 < correctDrugs.length) setLabelIdx((i) => i + 1);
    else finish(false);
  }

  async function finish(timedOut: boolean) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct, wrongDrugs: wrong, infoRead, correctLabels, wrongLabels,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "rx",
      score, timeTaken: timer.taken, errors: wrong + wrongLabels,
      correctDrugs: correct, totalDrugs: required.length,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain });
    setPhase("done");
  }

  function useHint() {
    setHints((n) => n + 1); setShowHint(true); toastScore(-10, "hint used");
  }

  if (loading || !caseData) return <>{difficultyModal}<Loading /></>;
  if (phase === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={collected.map((c) => ({ name: c, correct: required.includes(c) }))}
        errors={errPanel.errors}
        breakdown={[
          { label: "Correct drugs", delta: correct * 20 },
          { label: "Wrong drugs", delta: -wrong * 15 },
          { label: "Drug info read", delta: infoRead * 15 },
          { label: "Correct labels", delta: correctLabels * 25 },
          { label: "Wrong labels", delta: -wrongLabels * 10 },
          { label: "Hints used", delta: -hints * 10 },
        ]}
        onNext={next}
      />
    );
  }

  const required_for_steps = collected.filter((c) => required.includes(c));

  return (
    <>
      {difficultyModal}
      <GameHeader
        title={caseData.title ?? "Rx Case"}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10}
        onExit={onExit}
        onHint={useHint}
      />
      {phase === "collect" && (
        <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr]">
          {/* Prescription */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Prescription</p>
              <button onClick={() => setShowHint((s) => !s)} className="text-xs text-primary hover:underline">
                {showHint ? "Show handwritten" : "Show clean prescription"}
              </button>
            </div>
            {showHint ? (
              <div className="space-y-2 rounded-lg bg-background/60 p-4 font-mono text-sm">
                <p className="font-semibold">Patient: {caseData.electronic_prescription_json?.patient}</p>
                <p className="text-muted-foreground">Prescriber: {caseData.electronic_prescription_json?.prescriber}</p>
                <ul className="mt-2 space-y-1">
                  {(caseData.electronic_prescription_json?.items ?? []).map((it: any, i: number) => (
                    <li key={i} className="rounded border border-border/40 p-2">
                      <p className="font-semibold">{it.drug} {it.strength}</p>
                      <p className="text-xs text-muted-foreground">{it.sig}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border/50 bg-gradient-to-br from-amber-50/5 to-amber-100/5 font-handwriting">
                <div className="-rotate-2 p-6 text-center">
                  <FileText className="mx-auto mb-2 size-8 opacity-40" />
                  <p className="text-sm italic text-muted-foreground">Handwritten Rx — squint!</p>
                  <p className="mt-3 font-serif text-lg italic">℞ {(caseData.electronic_prescription_json?.items ?? []).map((i: any) => i.drug).join(", ")}</p>
                </div>
              </div>
            )}
            <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs">
              <p className="font-semibold">Patient</p>
              <p className="text-muted-foreground">
                {caseData.patient_info_json?.name}, {caseData.patient_info_json?.age}y · Allergies: {caseData.patient_info_json?.allergies ?? "—"}
              </p>
            </div>
          </div>

          {/* Shelf + Tray */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-card/50 p-2 backdrop-blur">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs ${category === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((d) => (
                <motion.button
                  key={d.id} whileTap={{ scale: 0.95 }}
                  onClick={() => addDrug(d.name)}
                  className="rounded-xl border border-border/40 bg-card/60 p-3 text-left hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{d.category}</p>
                </motion.button>
              ))}
            </div>
            <div className="rounded-xl border border-border/40 bg-card/50 p-3 backdrop-blur">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Dispensing tray</p>
              {collected.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Tap drugs to add</p>
              ) : (
                <ul className="space-y-1.5">
                  {collected.map((c) => (
                    <li key={c} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm">
                      <span>{c}</span>
                      <button onClick={() => removeDrug(c)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={confirmCollection}
                disabled={collected.length === 0}
                className="mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Confirm collection
              </button>
            </div>
          </div>
        </main>
      )}

      {phase === "info" && (
        <DrugInfoStep
          drug={required_for_steps[infoIdx]}
          allDrugs={drugs}
          onRead={markInfo}
          onSkip={advanceInfo}
          count={`${infoIdx + 1} / ${required_for_steps.length}`}
        />
      )}

      {phase === "label" && (
        <LabelStep
          drug={required_for_steps[labelIdx]}
          previous={labelAnswers[required_for_steps[labelIdx]]}
          count={`${labelIdx + 1} / ${required_for_steps.length}`}
          onSubmit={(a: { frequency: string; timing: string; duration: string }) => submitLabel(required_for_steps[labelIdx], a)}
        />
      )}
      {errPanel.panel}
    </>
  );
}

function DrugInfoStep({ drug, allDrugs, onRead, onSkip, count }: any) {
  const d = allDrugs.find((x: any) => x.name === drug);
  if (!d) { onSkip(); return null; }
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Drug info {count}</p>
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
        <h2 className="text-2xl font-bold">{d.name}</h2>
        <p className="text-sm text-muted-foreground">{d.generic_name} · {d.category}</p>
        <Section label="Indications" items={d.indications} />
        <Section label="Dosage" items={[d.dosage]} />
        <Section label="Side effects" items={d.side_effects} />
        <Section label="Contraindications" items={d.contraindications} />
        <div className="mt-5 flex gap-3">
          <button onClick={onRead} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Mark as read (+15)</button>
          <button onClick={onSkip} className="rounded-full border border-border/50 px-5 py-2 text-sm">Skip</button>
        </div>
      </div>
    </main>
  );
}

function Section({ label, items }: { label: string; items?: string[] | null }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}

const FREQS = ["once daily", "twice daily", "three times daily", "as needed"];
const TIMINGS = ["morning", "with food", "before sleep", "as needed"];
const DURATIONS = ["7 days", "14 days", "4 weeks", "ongoing"];

function LabelStep({ drug, count, onSubmit, previous }: any) {
  const [freq, setFreq] = useState("");
  const [timing, setTiming] = useState("");
  const [duration, setDuration] = useState("");
  if (previous) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-6">
          <p className="text-sm">Label for {drug}:</p>
          {previous.ok ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary"><Check className="size-3" /> Correct</p>
          ) : (
            <>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive"><XIcon className="size-3" /> Wrong</p>
              <p className="mt-2 text-xs text-muted-foreground">Correct: {previous.correct?.frequency} · {previous.correct?.timing} · {previous.correct?.duration}</p>
            </>
          )}
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Label {count}</p>
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur">
        <h2 className="text-xl font-bold">{drug}</h2>
        <p className="text-sm text-muted-foreground">Choose label instructions</p>
        <Picker label="Frequency" options={FREQS} value={freq} onChange={setFreq} />
        <Picker label="Timing" options={TIMINGS} value={timing} onChange={setTiming} />
        <Picker label="Duration" options={DURATIONS} value={duration} onChange={setDuration} />
        <button
          disabled={!freq || !timing || !duration}
          onClick={() => onSubmit({ frequency: freq, timing, duration })}
          className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Submit label
        </button>
      </div>
    </main>
  );
}

function Picker({ label, options, value, onChange }: any) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o: string) => (
          <button key={o} onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-xs ${value === o ? "border-primary bg-primary/15 text-primary" : "border-border/40 hover:bg-muted"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Loading() {
  return <main className="grid min-h-[60vh] place-items-center text-muted-foreground">Loading case…</main>;
}
