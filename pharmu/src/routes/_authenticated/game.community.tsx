import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { ModeTheme } from "@/components/game/ModeTheme";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, toastScore } from "@/lib/game/shared";
import { useGameExit } from "@/lib/game/useGameExit";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import { toast } from "sonner";

import {
  FileText, Pill, Check, X as XIcon,
  Trash2, User, ShoppingBag, ClipboardList,
} from "lucide-react";

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/game/community")({
  head: () => ({ meta: [{ title: "Community Pharmacy — PharmaVerse" }] }),
  component: () => (
    <ModeTheme mode="rx">
      <CommunityGame />
    </ModeTheme>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const DRUG_CATEGORIES = ["All", "Antibiotic", "Cardiovascular", "OTC Analgesic", "Antidiabetic", "GI", "Respiratory"];
const LIMIT_RX  = 180;
const LIMIT_OTC = 120;
const FREQS     = ["once daily", "twice daily", "three times daily", "as needed"];
const TIMINGS   = ["morning", "with food", "before sleep", "as needed"];
const DURATIONS = ["7 days", "14 days", "4 weeks", "ongoing"];

function SimulatedPrescription({ caseData }: { caseData: any }) {
  const rx = caseData.electronic_prescription_json ?? {};
  const patient = caseData.patient_info_json ?? {};
  const items = rx.items ?? [];
  const patientName = rx.patient ?? patient.name ?? "Training Patient";
  const prescriber = rx.prescriber ?? "Simulation Prescriber";
  const today = new Date();
  const date = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`;
  const handwriting = {
    fontFamily: '"Comic Sans MS", "Segoe Print", cursive',
    letterSpacing: "0.01em",
  };
  const visibleItems = items.slice(0, 4);

  return (
    <motion.div
      key="handwritten"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-center rounded-lg border border-border/40 bg-slate-950/30 px-2 py-5 sm:px-5"
    >
      <div
        className="relative w-full max-w-[430px] -rotate-[1.2deg] overflow-hidden bg-[#f6f2e8] text-slate-900 shadow-[0_24px_55px_rgba(0,0,0,0.45)]"
        style={{
          aspectRatio: "0.71",
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.45), transparent 22%, transparent 82%, rgba(0,0,0,0.06)), radial-gradient(circle at 35% 18%, rgba(255,255,255,0.5), transparent 32%), linear-gradient(#fbf8ef, #eee8dc)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="-rotate-12 text-center text-3xl font-black uppercase tracking-[0.28em] text-red-500/[0.08]">
            Training Only
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,rgba(0,0,0,0.035)_1px,transparent_2px)] bg-[length:100%_38px] opacity-40" />
        <div className="relative m-5 h-[calc(100%-2.5rem)] border border-slate-500/70 bg-white/35">
          <div className="grid grid-cols-[1fr_1.05fr] border-b border-slate-500/70 text-[9px] leading-tight">
            <div className="flex min-h-[92px] flex-col items-center justify-center border-r border-slate-500/70 p-2 text-center">
              <div className="mb-1 grid h-8 w-8 place-items-center rounded-full border border-slate-600/70 text-[10px] font-bold">Rx</div>
              <p className="font-bold uppercase">Pharmulation</p>
              <p className="font-bold uppercase">Community Pharmacy Simulator</p>
              <p className="mt-1 text-[8px] font-bold text-red-600">Training document - not valid for dispensing</p>
            </div>
            <div>
              <div className="border-b border-slate-500/70 p-2">
                <p className="text-[8px] font-semibold">Patient Name</p>
                <p
                  className="mt-1 truncate text-2xl text-slate-800"
                  style={{ ...handwriting, transform: "rotate(-2deg)" }}
                >
                  {patientName}
                </p>
              </div>
              <div className="grid grid-cols-2 text-[8px]">
                <div className="border-r border-slate-500/70 p-2">
                  <span className="font-semibold">Training Case ID</span>
                  <span className="ml-1 font-mono">{String(caseData.id ?? "").slice(0, 8)}</span>
                </div>
                <div className="p-2">
                  <span className="font-semibold">Date</span>
                  <span className="ml-2 text-base" style={handwriting}>{date}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-500/70 py-1 text-center text-[11px] font-bold uppercase tracking-wide">
            Simulated Prescription
          </div>
          <div className="grid grid-cols-4 border-b border-slate-500/70 text-[8px]">
            <div className="border-r border-slate-500/70 px-2 py-1">Diagnosis</div>
            <div className="border-r border-slate-500/70 px-2 py-1">Allergies: {patient.allergies ?? "N/A"}</div>
            <div className="border-r border-slate-500/70 px-2 py-1">Weight</div>
            <div className="px-2 py-1">Age: {patient.age ?? ""}</div>
          </div>

          <div className="relative h-[270px] overflow-hidden px-7 py-6">
            <p className="absolute left-5 top-5 text-3xl font-serif font-bold leading-none">Rx</p>
            <div className="ml-12 mt-6 space-y-3 text-slate-800" style={handwriting}>
              {visibleItems.map((it: any, i: number) => (
                <div
                  key={`${it.drug}-${i}`}
                  className="max-w-[260px] text-[17px] leading-tight"
                  style={{
                    transform: `rotate(${i % 2 === 0 ? -0.7 : 0.6}deg)`,
                    marginLeft: `${Math.min(i * 8, 18)}px`,
                  }}
                >
                  <p className="break-words">{it.drug} {it.strength}</p>
                  <p className="ml-5 break-words text-[15px] leading-tight">{it.sig}</p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-[17px]" style={{ transform: "rotate(-1deg)" }}>
                  Medication as prescribed
                </p>
              )}
              {items.length > visibleItems.length && (
                <p className="ml-3 text-[13px] text-slate-600">+ additional items on typed view</p>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 grid h-[82px] grid-cols-2 border-t border-slate-500/70 text-[8px]">
            <div>
              <div className="h-[27px] truncate border-b border-slate-500/70 px-2 py-1">Prescriber: {prescriber}</div>
              <div className="h-[27px] border-b border-slate-500/70 px-2 py-1">Checked By:</div>
              <div className="h-[27px] px-2 py-1 font-bold text-red-600">Simulation only</div>
            </div>
            <div className="border-l border-slate-500/70">
              <div className="h-[27px] border-b border-slate-500/70 px-2 py-1">Training Signature:</div>
              <div className="h-[27px] border-b border-slate-500/70 px-2 py-1">Pharmacist's Notes:</div>
              <div className="h-[27px] px-2 py-1 text-center">Not a legal prescription</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sub-mode badge ───────────────────────────────────────────────────────────
function SubmodeBadge({ mode }: { mode: "rx" | "otc" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
      mode === "rx"
        ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
    }`}>
      {mode === "rx" ? <FileText className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
      {mode === "rx" ? "Prescription" : "OTC Consultation"}
    </span>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
function CommunityGame() {
  // We randomly pick from BOTH rx and otc cases
  const rxLoader  = useCaseLoader("rx");
  const otcLoader = useCaseLoader("otc");

  // Choose which loader to use — alternate or random per session
  const [activeMode] = useState<"rx" | "otc">(() =>
    Math.random() < 0.5 ? "rx" : "otc"
  );

  const loader = activeMode === "rx" ? rxLoader : otcLoader;
  const LIMIT  = activeMode === "rx" ? LIMIT_RX : LIMIT_OTC;

  if (loader.loading || !loader.caseData) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">💊</div>
          <p className="text-muted-foreground text-sm">Loading community case…</p>
        </div>
      </main>
    );
  }

  return activeMode === "rx" ? (
    <RxGame caseData={loader.caseData} next={loader.next} LIMIT={LIMIT} />
  ) : (
    <OtcGame caseData={loader.caseData} next={loader.next} LIMIT={LIMIT} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RX GAME
// ═══════════════════════════════════════════════════════════════════════════════
type RxPhase = "collect" | "info" | "label" | "done";

function RxGame({ caseData, next, LIMIT }: { caseData: any; next: () => void; LIMIT: number }) {
  const { profile } = useAuthStore();
  const onExit = useGameExit("/modes");

  const [phase, setPhase]               = useState<RxPhase>("collect");
  const [collected, setCollected]       = useState<string[]>([]);
  const [wrong, setWrong]               = useState(0);
  const [correct, setCorrect]           = useState(0);
  const [infoRead, setInfoRead]         = useState(0);
  const [correctLabels, setCorrectLabels] = useState(0);
  const [wrongLabels, setWrongLabels]   = useState(0);
  const [hints, setHints]               = useState(0);
  const [showClean, setShowClean]       = useState(false);
  const [category, setCategory]         = useState("All");
  const [drugs, setDrugs]               = useState<any[]>([]);
  const [infoIdx, setInfoIdx]           = useState(0);
  const [labelIdx, setLabelIdx]         = useState(0);
  const [labelAnswers, setLabelAnswers] = useState<Record<string, any>>({});
  const [result, setResult]             = useState<any>(null);

  const timer   = useTimer(LIMIT, () => phase !== "done" && finish(true));
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
    setPhase("collect"); setCollected([]); setWrong(0); setCorrect(0);
    setInfoRead(0); setCorrectLabels(0); setWrongLabels(0); setHints(0);
    setShowClean(false); setInfoIdx(0); setLabelIdx(0); setLabelAnswers({});
    setResult(null);
  }, [caseData?.id]);

  const required: string[] = caseData?.drugs_required ?? [];
  const filtered = useMemo(
    () => drugs.filter((d) => category === "All" || d.category === category),
    [drugs, category]
  );

  function addDrug(name: string) {
    if (collected.includes(name)) return;
    setCollected((c) => [...c, name]);
    if (required.includes(name)) {
      setCorrect((n) => n + 1); toastScore(20, name);
    } else {
      setWrong((n) => n + 1); toastScore(-15, `wrong: ${name}`);
      const d = drugs.find((x) => x.name === name);
      errPanel.logError({
        errorType: "Wrong drug selected",
        wrongChoice: name,
        correctChoice: required.join(", "),
        whyWrong: `${name} is not indicated for this prescription.${d?.indications?.length ? ` It is used for ${d.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: "Think about the class of drug that treats the condition in this prescription.",
      });
    }
  }

  function confirmCollection() {
    if (required.some((r) => !collected.includes(r))) {
      toast.warning("Some required drugs still missing"); return;
    }
    setPhase("info");
  }

  const correctDrugs = collected.filter((c) => required.includes(c));

  function markInfo() {
    setInfoRead((n) => n + 1); toastScore(15, "info read");
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
        if (ans.frequency !== correctAns.frequency) fields.push(`frequency`);
        if (ans.timing    !== correctAns.timing)    fields.push(`timing`);
        if (ans.duration  !== correctAns.duration)  fields.push(`duration`);
        errPanel.logError({
          errorType: "Wrong label",
          wrongChoice: `${drug}: ${ans.frequency} · ${ans.timing} · ${ans.duration}`,
          correctChoice: `${correctAns.frequency} · ${correctAns.timing} · ${correctAns.duration}`,
          whyWrong: `Your label for ${drug} is off on ${fields.join(", ")}.`,
          whatToKnow: `Label instructions for ${drug} are based on its half-life, food interactions, and recommended course duration.`,
        });
      }
    }
    if (labelIdx + 1 < correctDrugs.length) setLabelIdx((i) => i + 1);
    else finish(false);
  }

  async function finish(timedOut: boolean) {
    const score = computeScore({
      correctDrugs: correct, wrongDrugs: wrong, infoRead,
      correctLabels, wrongLabels, hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
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

  if (phase === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={collected.map((c) => ({ name: c, correct: required.includes(c) }))}
        errors={errPanel.errors}
        breakdown={[
          { label: "Correct drugs",   delta: correct * 20 },
          { label: "Wrong drugs",     delta: -wrong * 15 },
          { label: "Drug info read",  delta: infoRead * 15 },
          { label: "Correct labels",  delta: correctLabels * 25 },
          { label: "Wrong labels",    delta: -wrongLabels * 10 },
          { label: "Hints used",      delta: -hints * 10 },
        ]}
        onNext={next}
      />
    );
  }

  return (
    <>
      <GameHeader
        title={caseData.title ?? "Community Pharmacy"}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint"); setShowClean(true); }}
      />

      {/* Sub-mode badge strip */}
      <div className="border-b border-border/30 bg-background/60 backdrop-blur px-4 py-2 flex items-center gap-3">
        <SubmodeBadge mode="rx" />
        <span className="text-xs text-muted-foreground">{caseData.title}</span>
      </div>

      {phase === "collect" && (
        <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr]">
          {/* Prescription panel */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Prescription</p>
              </div>
              <button onClick={() => setShowClean((s) => !s)} className="text-xs text-primary hover:underline">
                {showClean ? "Show handwritten" : "Show typed"}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {showClean ? (
                <motion.div key="clean"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="space-y-2 rounded-lg bg-background/60 p-4 font-mono text-sm">
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
                </motion.div>
              ) : (
                <SimulatedPrescription caseData={caseData} />
              )}
            </AnimatePresence>

            <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs">
              <p className="font-semibold">Patient</p>
              <p className="text-muted-foreground">
                {caseData.patient_info_json?.name}, {caseData.patient_info_json?.age}y ·
                Allergies: {caseData.patient_info_json?.allergies ?? "—"}
              </p>
            </div>
          </div>

          {/* Drug shelf + tray */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/40 bg-card/50 p-2 backdrop-blur">
              {DRUG_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs transition ${category === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((d) => (
                <motion.button key={d.id} whileTap={{ scale: 0.95 }}
                  onClick={() => addDrug(d.name)}
                  className="rounded-xl border border-border/40 bg-card/60 p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{d.category}</p>
                </motion.button>
              ))}
            </div>

            {/* Dispensing tray */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-3 backdrop-blur">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Dispensing tray
              </p>
              {collected.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Tap drugs above to add</p>
              ) : (
                <ul className="space-y-1.5">
                  {collected.map((c) => (
                    <li key={c} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm">
                      <span>{c}</span>
                      <button onClick={() => setCollected((x) => x.filter((n) => n !== c))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={confirmCollection} disabled={collected.length === 0}
                className="mt-3 w-full rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40 transition">
                Confirm collection →
              </button>
            </div>
          </div>
        </main>
      )}

      {phase === "info" && (
        <DrugInfoStep
          drug={correctDrugs[infoIdx]} allDrugs={drugs}
          onRead={markInfo}
          onSkip={() => {
            if (infoIdx + 1 < correctDrugs.length) setInfoIdx((i) => i + 1);
            else setPhase("label");
          }}
          count={`${infoIdx + 1} / ${correctDrugs.length}`}
        />
      )}

      {phase === "label" && (
        <LabelStep
          drug={correctDrugs[labelIdx]}
          previous={labelAnswers[correctDrugs[labelIdx]]}
          count={`${labelIdx + 1} / ${correctDrugs.length}`}
          onSubmit={(a) => submitLabel(correctDrugs[labelIdx], a)}
        />
      )}
      {errPanel.panel}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTC GAME
// ═══════════════════════════════════════════════════════════════════════════════
type OtcStep = "questions" | "drug" | "dose" | "advice" | "done";

function OtcGame({ caseData, next, LIMIT }: { caseData: any; next: () => void; LIMIT: number }) {
  const { profile } = useAuthStore();
  const onExit = useGameExit("/modes");

  const [step, setStep]     = useState<OtcStep>("questions");
  const [qi, setQi]         = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong]   = useState(0);
  const [hints, setHints]   = useState(0);
  const [result, setResult] = useState<any>(null);

  const timer   = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "otc",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    setStep("questions"); setQi(0); setCorrect(0); setWrong(0); setHints(0); setResult(null);
  }, [caseData?.id]);

  const ans: any       = caseData?.correct_answer_json ?? {};
  const questions: any[] = ans.questions ?? [];

  function pickQuestion(i: number) {
    const q = questions[qi];
    if (i === q.correct) { setCorrect((n) => n + 1); toastScore(20, "good question"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong path");
      errPanel.logError({
        errorType: "Irrelevant follow-up question",
        wrongChoice: q.choices?.[i] ?? "",
        correctChoice: q.choices?.[q.correct],
        whyWrong: "That question doesn't help narrow down the diagnosis here.",
        whatToKnow: "Priority OTC questions establish duration, severity, symptoms, current medications, and red flag signs.",
      });
    }
    if (qi + 1 < questions.length) setQi((x) => x + 1);
    else setStep("drug");
  }

  function pickDrug(opt: string) {
    if (opt === ans.correct_drug) { setCorrect((n) => n + 1); toastScore(20, "correct drug"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong drug");
      errPanel.logError({
        errorType: "Wrong OTC recommendation",
        wrongChoice: opt, correctChoice: ans.correct_drug,
        whyWrong: `${opt} is not appropriate for this patient given their symptoms or contraindications.`,
        whatToKnow: "Match OTC product to symptom + screen for red flags, pregnancy, allergies, and current meds.",
      });
    }
    setStep("dose");
  }

  function pickDose(opt: string) {
    if (opt === ans.correct_dose) { setCorrect((n) => n + 1); toastScore(25, "correct dose"); }
    else {
      setWrong((n) => n + 1); toastScore(-10, "wrong dose");
      errPanel.logError({
        errorType: "Wrong dose",
        wrongChoice: opt, correctChoice: ans.correct_dose,
        whyWrong: `${opt} is outside the safe/effective range for this patient.`,
        whatToKnow: "OTC dosing depends on age, weight, renal/hepatic function, and product strength.",
      });
    }
    setStep("advice");
  }

  async function pickAdvice(opt: string) {
    let cl = 0, wl = 0;
    if (opt === ans.correct_advice) { cl = 1; toastScore(25, "good counseling"); }
    else {
      wl = 1; toastScore(-10, "off counseling");
      errPanel.logError({
        errorType: "Wrong counseling advice",
        wrongChoice: opt, correctChoice: ans.correct_advice,
        whyWrong: "That advice is incomplete or misleading for this scenario.",
        whatToKnow: "Counseling should cover how to take it, side effects to watch, and when to seek further help.",
      });
    }
    finish(false, cl, wl);
  }

  async function finish(timedOut: boolean, cl = 0, wl = 0) {
    const score = computeScore({
      correctDrugs: correct, wrongDrugs: wrong, correctLabels: cl, wrongLabels: wl,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "otc",
      score, timeTaken: timer.taken, errors: wrong + wl,
      correctDrugs: correct, totalDrugs: questions.length + 3,
      errorsDetail: errPanel.errors,
    });
    setResult({ score, xpGain });
    setStep("done");
  }

  if (step === "done" && result) {
    return (
      <FeedbackScreen
        score={result.score} xpGain={result.xpGain} timeTaken={timer.taken}
        mentorTip={caseData.mentor_tip} explanation={caseData.explanation}
        drugs={[{ name: ans.correct_drug, correct: true, info: ans.correct_dose }]}
        errors={errPanel.errors}
        onNext={next}
      />
    );
  }

  return (
    <>
      <GameHeader
        title={caseData.title ?? "Community Pharmacy"}
        remaining={timer.remaining} pct={timer.pct}
        paused={timer.paused} togglePause={timer.togglePause}
        score={correct * 20 - wrong * 15}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint used"); }}
      />

      {/* Sub-mode badge */}
      <div className="border-b border-border/30 bg-background/60 backdrop-blur px-4 py-2 flex items-center gap-3">
        <SubmodeBadge mode="otc" />
        <span className="text-xs text-muted-foreground">{caseData.title}</span>
      </div>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr]">
        {/* Patient panel */}
        <aside className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <User className="size-4 text-primary" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/20">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{caseData.patient_info_json?.name}</p>
              <p className="text-xs text-muted-foreground">Age {caseData.patient_info_json?.age ?? "—"}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {Object.entries(caseData.patient_info_json ?? {}).map(([k, v]) => (
              <li key={k}><span className="font-medium text-foreground">{k}:</span> {String(v)}</li>
            ))}
          </ul>
        </aside>

        {/* Question / answer area */}
        <section>
          <motion.div key={`${step}-${qi}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">

            {step === "questions" && questions[qi] && (
              <>
                <div className="rounded-lg bg-primary/10 p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Patient says</span>
                  </div>
                  <p className="text-sm italic text-foreground/90">
                    "{qi === 0 ? ans.complaint : questions[qi].q}"
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your follow-up question</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {questions[qi].choices.map((c: string, i: number) => (
                    <button key={i} onClick={() => pickQuestion(i)}
                      className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5 transition">
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "drug"   && <OtcPicker title="Recommend a medication" options={ans.drug_options ?? []} onPick={pickDrug} />}
            {step === "dose"   && <OtcPicker title="Choose correct dose"    options={ans.dose_options ?? []} onPick={pickDose} />}
            {step === "advice" && <OtcPicker title="Counsel the patient"    options={ans.advice_options ?? []} onPick={pickAdvice} />}
          </motion.div>
        </section>
      </main>
      {errPanel.panel}
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function OtcPicker({ title, options, onPick }: { title: string; options: string[]; onPick: (s: string) => void }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{title}</p>
      <div className="grid gap-2">
        {options.map((o, i) => (
          <button key={i} onClick={() => onPick(o)}
            className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left text-sm hover:border-primary/40 hover:bg-primary/5 transition">
            {o}
          </button>
        ))}
      </div>
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
        <InfoSection label="Indications"      items={d.indications} />
        <InfoSection label="Dosage"           items={[d.dosage]} />
        <InfoSection label="Side effects"     items={d.side_effects} />
        <InfoSection label="Contraindications" items={d.contraindications} />
        <div className="mt-5 flex gap-3">
          <button onClick={onRead}  className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Mark as read (+15)</button>
          <button onClick={onSkip} className="rounded-full border border-border/50 px-5 py-2 text-sm">Skip</button>
        </div>
      </div>
    </main>
  );
}

function InfoSection({ label, items }: { label: string; items?: string[] | null }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
        {items.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}

function LabelStep({ drug, count, onSubmit, previous }: any) {
  const [freq, setFreq]       = useState("");
  const [timing, setTiming]   = useState("");
  const [duration, setDuration] = useState("");

  if (previous) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-6">
          <p className="text-sm">Label for <strong>{drug}</strong>:</p>
          {previous.ok ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
              <Check className="size-3" /> Correct
            </p>
          ) : (
            <>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive">
                <XIcon className="size-3" /> Wrong
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Correct: {previous.correct?.frequency} · {previous.correct?.timing} · {previous.correct?.duration}
              </p>
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
        <OptionPicker label="Frequency" options={FREQS}     value={freq}     onChange={setFreq} />
        <OptionPicker label="Timing"    options={TIMINGS}   value={timing}   onChange={setTiming} />
        <OptionPicker label="Duration"  options={DURATIONS} value={duration} onChange={setDuration} />
        <button
          disabled={!freq || !timing || !duration}
          onClick={() => onSubmit({ frequency: freq, timing, duration })}
          className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          Submit label
        </button>
      </div>
    </main>
  );
}

function OptionPicker({ label, options, value, onChange }: any) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o: string) => (
          <button key={o} onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              value === o ? "border-primary bg-primary/15 text-primary" : "border-border/40 hover:bg-muted"
            }`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
