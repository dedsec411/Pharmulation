import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameHeader } from "@/components/game/GameHeader";
import { FeedbackScreen } from "@/components/game/FeedbackScreen";
import { useCaseLoader } from "@/components/game/useCaseLoader";
import { useDifficultyChoice } from "@/components/game/DifficultySelect";
import { ModeTheme } from "@/components/game/ModeTheme";
import { SimulatedPrescription as PrescriptionSheet } from "@/components/game/SimulatedPrescription";
import { useTimer } from "@/lib/game/useTimer";
import { computeScore, submitScore, toastScore } from "@/lib/game/shared";
import { useGameExit } from "@/lib/game/useGameExit";
import { useAuthStore } from "@/lib/auth-store";
import { RX_DRUG_CATEGORIES, getBrandsForDrug, prepareDrugCatalog } from "@/lib/drug-catalog";
import { supabase } from "@/integrations/supabase/client";
import { useErrorPanel } from "@/components/game/useErrorPanel";
import {
  OtcScenarioPanel,
  formatOtcCorrectChoice,
  getOtcCorrectChoices,
  getOtcCorrectQuestionText,
  getOtcPatientResponse,
  getOtcQuestionOptions,
  getOtcSelectedQuestionText,
  isOtcQuestionChoiceCorrect,
  type OtcDialogueTurn,
} from "@/components/game/OtcScenarioPanel";
import { toast } from "sonner";

import {
  ArrowLeft, FileText, Pill, Check, X as XIcon,
  Tags, Trash2, User, ShoppingBag, ClipboardList,
} from "lucide-react";

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/game/community")({
  head: () => ({ meta: [{ title: "Community Pharmacy - PharmaVerse" }] }),
  component: () => (
    <ModeTheme mode="rx">
      <CommunityGame />
    </ModeTheme>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const LIMIT_RX  = 180;
const LIMIT_OTC = 120;
const FREQS     = ["once daily", "twice daily", "three times daily", "four times daily", "as needed"];
const TIMINGS   = ["morning", "with food", "before sleep", "as needed"];
const DURATIONS = ["7 days", "14 days", "4 weeks", "ongoing"];

function CommunityFloatingPills({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <span className="floating-pill absolute left-[5%] top-[14%] h-3 w-12 rounded-full bg-gradient-to-r from-primary to-white/80 shadow-[0_0_22px_oklch(0.74_0.14_180/0.4)]" />
      <span className="floating-pill absolute right-[10%] top-[22%] h-4 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-primary [animation-delay:-2.5s]" />
      <span className="floating-pill absolute bottom-[18%] left-[16%] h-3 w-10 rounded-full bg-gradient-to-r from-white/85 to-emerald-300 [animation-delay:-5s]" />
      <span className="floating-pill absolute bottom-[10%] right-[28%] h-3.5 w-12 rounded-full bg-gradient-to-r from-primary to-sky-200 [animation-delay:-7s]" />
      <span className="floating-pill absolute left-[52%] top-[44%] h-3 w-9 rounded-full bg-gradient-to-r from-emerald-300 to-white/75 [animation-delay:-9s]" />
    </div>
  );
}

function SimulatedPrescription({ caseData }: { caseData: any }) {
  const rx = caseData.electronic_prescription_json ?? {};
  const patient = caseData.patient_info_json ?? {};
  const items = rx.items ?? [];
  const patientName = rx.patient ?? patient.name ?? "Training Patient";
  const prescriber = rx.prescriber ?? "Simulation Prescriber";
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  const caseId = String(caseData.id ?? "").slice(0, 8);
  const complaint = patient.complaint ?? patient.symptoms ?? caseData.title ?? "";
  const diagnosis = patient.diagnosis ?? caseData.diagnosis ?? "";
  const handwriting = {
    fontFamily: '"Comic Sans MS", "Segoe Print", cursive',
    letterSpacing: "0.01em",
  };
  const itemText = items.length
    ? items.map((it: any) => `${it.drug ?? "Medication"} ${it.strength ?? ""} ${it.sig ?? ""}`.trim())
    : ["Medication as prescribed"];
  const lineClass = "relative min-h-[18px] border-b border-slate-300";
  const labelClass = "shrink-0 text-[10px] font-bold";
  const valueClass = "min-h-[14px] flex-1 truncate text-[10px]";

  function InfoRow({
    label,
    value,
    unit,
  }: {
    label: string;
    value?: any;
    unit?: string;
  }) {
    return (
      <div className="mb-1 flex items-end gap-1 border-b border-slate-950 pb-0.5">
        <span className={labelClass}>{label}</span>
        <span className={valueClass}>{value ?? ""}</span>
        {unit && <span className="text-[9px] text-slate-700">{unit}</span>}
      </div>
    );
  }

  function WriteLines({
    count,
    children,
  }: {
    count: number;
    children?: ReactNode;
  }) {
    return (
      <div className="relative">
        {children}
        {Array.from({ length: count }).map((_, i) => (
          <span key={i} className={lineClass} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      key="template-prescription"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-center rounded-lg border border-border/40 bg-slate-950/30 px-2 py-5 sm:px-5"
    >
      <div className="relative w-full max-w-[680px] -rotate-[0.6deg] bg-white px-5 py-4 text-slate-950 shadow-[0_24px_55px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          <div className="-rotate-12 border-2 border-red-500/15 px-8 py-2 text-center text-3xl font-black uppercase tracking-[0.24em] text-red-500/10">
            Training Only
          </div>
        </div>
        <div className="relative">
          <div className="border-b-2 border-slate-950 pb-1 text-center">
            <span className="mr-2 inline-block align-middle">
              <svg width="36" height="22" viewBox="0 0 36 22" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="34" height="20" rx="10" ry="10" fill="none" stroke="#000" strokeWidth="1.8" />
                <line x1="18" y1="1" x2="18" y2="21" stroke="#000" strokeWidth="1.5" />
                <rect x="1" y="1" width="17" height="20" rx="10" ry="10" fill="#222" />
                <rect x="18" y="1" width="17" height="20" rx="10" ry="10" fill="white" />
                <rect x="1" y="1" width="34" height="20" rx="10" ry="10" fill="none" stroke="#000" strokeWidth="1.8" />
                <line x1="18" y1="1" x2="18" y2="21" stroke="#000" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="align-middle text-[22px] font-black uppercase tracking-[0.08em]">Pharmulation</span>
            <span className="ml-2 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-slate-950 align-middle text-[10px] font-bold">
              24hr
            </span>
            <p className="mt-1 text-[9px] font-bold uppercase text-red-600">Simulation template - not valid for dispensing</p>
          </div>

          <div className="my-2 text-center text-sm font-bold underline">
            Department: Community Pharmacy Training
          </div>

          <div className="mb-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
            <div>
              <InfoRow label="Patient Name:" value={patientName} />
              <InfoRow label="Age:" value={patient.age} />
              <div className="flex gap-2">
                <div className="flex-1"><InfoRow label="Gender:" value={patient.gender} /></div>
                <div className="flex-1"><InfoRow label="Weight:" value={patient.weight} unit="kg" /></div>
              </div>
              <InfoRow label="BMI:" value={patient.bmi} unit="kg/m2" />
              <InfoRow label="Doctor Name:" value={prescriber} />
            </div>
            <div>
              <InfoRow label="M.R. No.:" value={`TR-${caseId}`} />
              <InfoRow label="Slip No.:" value={caseId} />
              <InfoRow label="Arrival Date/Time:" value={date} />
              <InfoRow label="Contact:" value={patient.contact} />
              <div className="mt-1 flex gap-4">
                {["Smoker", "Non-Smoker"].map((label) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] font-bold">
                    <span className="inline-block h-[11px] w-[11px] border border-slate-950" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase">Presenting Complaint:-</div>
              <WriteLines count={3}>
                <p className="absolute left-1 top-0 max-w-[95%] truncate text-[15px] text-slate-800" style={handwriting}>
                  {complaint}
                </p>
              </WriteLines>
              <div className="mb-1 mt-2 text-[11px] font-bold uppercase">Examination / Injuries:-</div>
              <WriteLines count={4}>
                <p className="absolute left-1 top-0 max-w-[95%] truncate text-[14px] text-slate-800" style={handwriting}>
                  Allergies: {patient.allergies ?? "N/A"}
                </p>
              </WriteLines>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold underline">VITALS</div>
              {[
                ["B.P.", "bp", "mmHg"],
                ["PULSE", "pulse", "/min"],
                ["SP O2", "spo2", "%"],
                ["Res.R", "resp_rate", "/min"],
                ["TEMP.", "temp", "F"],
                ["GCS", "gcs", "/15"],
                ["RBS", "rbs", "mg/dl"],
              ].map(([label, key, unit]) => (
                <div key={key} className="mb-1 flex items-center gap-1">
                  <span className="w-12 shrink-0 text-[10px] font-bold">{label}</span>
                  <span className="min-h-[14px] flex-1 border-b border-slate-950 text-[10px]">{patient[key] ?? ""}</span>
                  <span className="text-[9px] text-slate-700">{unit}</span>
                </div>
              ))}
              <div className="mb-1 mt-2 text-[11px] font-bold underline">PROVISIONAL DIAGNOSIS</div>
              <WriteLines count={3}>
                <p className="absolute left-1 top-0 max-w-[95%] truncate text-[14px] text-slate-800" style={handwriting}>
                  {diagnosis}
                </p>
              </WriteLines>
              <div className="mb-1 mt-2 text-[11px] font-bold underline">REFER TO</div>
              <WriteLines count={2} />
            </div>
          </div>

          <div className="mt-1 border-t-2 border-slate-950 pt-1">
            <div className="mb-1 text-[11px] font-bold uppercase">Treatment Given:-</div>
            <div className="relative min-h-[150px]">
              <div className="pointer-events-none absolute inset-x-2 top-1 z-10 space-y-2 text-slate-800" style={handwriting}>
                <p className="text-3xl font-serif font-bold leading-none text-slate-950">Rx</p>
                {itemText.slice(0, 5).map((line: string, i: number) => (
                  <p
                    key={`${line}-${i}`}
                    className="ml-8 max-w-[92%] break-words text-[18px] leading-tight"
                    style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.45}deg)` }}
                  >
                    {line}
                  </p>
                ))}
              </div>
              <WriteLines count={8} />
            </div>
          </div>

          <div className="mt-2 grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase">Test Advised</div>
              <WriteLines count={3} />
            </div>
            <div className="text-center">
              <div className="mb-1 text-[11px] font-bold uppercase">Sign &amp; Stamp</div>
              <div className="grid h-10 place-items-center border border-slate-950 text-[10px] font-bold text-red-600">
                Simulation only
              </div>
            </div>
          </div>

          <div className="mt-2 flex gap-1 border-t-2 border-slate-950 pt-1">
            <span className="shrink-0 text-[10px] font-bold">Advise / Follow-Up:-</span>
            <div className="flex-1">
              <WriteLines count={2} />
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
      {mode === "rx" ? "Rx Cases" : "OTC Consultation"}
    </span>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
function CommunityGame() {
  // We randomly pick from BOTH rx and otc cases

  // Choose which loader to use — alternate or random per session
  const [activeMode, setActiveMode] = useState<"rx" | "otc" | null>(null);

  if (!activeMode) {
    return <CommunityModePicker onPick={setActiveMode} />;
  }

  return <CommunityRun activeMode={activeMode} />;
}

function CommunityModePicker({ onPick }: { onPick: (mode: "rx" | "otc") => void }) {
  return (
    <main className="relative mx-auto grid min-h-[70vh] max-w-5xl place-items-center px-4 py-10">
      <CommunityFloatingPills className="opacity-45" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full rounded-3xl border border-border/40 bg-card/60 p-6 shadow-2xl shadow-primary/5 backdrop-blur md:p-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Community Pharmacy</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Choose your training type</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick whether you want to practice prescription dispensing or OTC patient consultation.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={() => onPick("rx")}
            className="group rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-400/60 hover:bg-blue-500/15"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                <FileText className="size-6" />
              </span>
              <span className="rounded-full border border-blue-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200">
                Rx
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold">Rx Cases</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Read a simulated prescription, collect the required medicines, review drug info, and create labels.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-blue-200 transition group-hover:translate-x-1">
              Play Rx Cases &rarr;
            </span>
          </button>

          <button
            onClick={() => onPick("otc")}
            className="group rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-500/15"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <ShoppingBag className="size-6" />
              </span>
              <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200">
                OTC
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold">OTC Consultation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask follow-up questions, choose the safest medicine, pick the dose, and counsel the patient.
            </p>
            <span className="mt-5 inline-flex text-sm font-semibold text-emerald-200 transition group-hover:translate-x-1">
              Play OTC &rarr;
            </span>
          </button>
        </div>
      </motion.div>
    </main>
  );
}

function CommunityRun({ activeMode }: { activeMode: "rx" | "otc" }) {
  const { difficulty, difficultyModal } = useDifficultyChoice(activeMode);
  const rxLoader = useCaseLoader("rx", difficulty);
  const otcLoader = useCaseLoader("otc", difficulty);

  const loader = activeMode === "rx" ? rxLoader : otcLoader;
  const LIMIT  = activeMode === "rx" ? LIMIT_RX : LIMIT_OTC;

  if (loader.loading || !loader.caseData) {
    return (
      <>
        {difficultyModal}
        <main className="grid min-h-[60vh] place-items-center">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-pulse">Rx</div>
            <p className="text-muted-foreground text-sm">Loading community case...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {difficultyModal}
      {activeMode === "rx" ? (
        <RxGame caseData={loader.caseData} next={loader.next} LIMIT={LIMIT} />
      ) : (
        <OtcGame caseData={loader.caseData} next={loader.next} LIMIT={LIMIT} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RX GAME
// ═══════════════════════════════════════════════════════════════════════════════
type RxPhase = "collect" | "compound" | "info" | "label" | "done";
type CompoundSubmission =
  | { type: "topical"; base: string; grams: number }
  | { type: "iv_sterile"; diluent: string; volume: number }
  | { type: "antibiotic_dilution"; volume: number; stability: string };

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
  const [compoundCorrect, setCompoundCorrect] = useState(0);
  const [compoundWrong, setCompoundWrong] = useState(0);
  const [compoundCompleted, setCompoundCompleted] = useState(false);
  const [hints, setHints]               = useState(0);
  const [showClean, setShowClean]       = useState(false);
  const [category, setCategory]         = useState("");
  const [drugs, setDrugs]               = useState<any[]>([]);
  const [brandDrug, setBrandDrug]       = useState<any | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({});
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
    setInfoRead(0); setCorrectLabels(0); setWrongLabels(0);
    setCompoundCorrect(0); setCompoundWrong(0); setCompoundCompleted(false); setHints(0);
    setCategory(""); setBrandDrug(null); setSelectedBrands({});
    setShowClean(false); setInfoIdx(0); setLabelIdx(0); setLabelAnswers({});
    setResult(null);
  }, [caseData?.id]);

  const required: string[] = caseData?.drugs_required ?? [];
  const catalogDrugs = useMemo(() => prepareDrugCatalog(drugs), [drugs]);
  const filtered = useMemo(
    () => catalogDrugs.filter((d) => d.category === category),
    [catalogDrugs, category]
  );
  const categoryStats = useMemo(
    () => RX_DRUG_CATEGORIES.map((name) => ({
      name,
      count: catalogDrugs.filter((d) => d.category === name).length,
    })),
    [catalogDrugs],
  );
  const compoundTriggerDrug = String(caseData?.correct_answer_json?.compound_trigger_drug ?? "").trim();
  const hasCompoundTrigger = !!caseData?.requires_compounding && !!compoundTriggerDrug;

  function matchesCompoundTrigger(name: string) {
    return hasCompoundTrigger && normalizeText(name) === normalizeText(compoundTriggerDrug);
  }

  function maybeStartCompound(name: string) {
    if (matchesCompoundTrigger(name) && !compoundCompleted) {
      setPhase("compound");
    }
  }

  function openBrandSelection(drug: any) {
    const name = drug.name;
    if (collected.includes(name)) return;
    if (!required.includes(name)) {
      setWrong((n) => n + 1); toastScore(-15, `wrong: ${name}`);
      errPanel.logError({
        errorType: "Wrong drug selected",
        wrongChoice: name,
        correctChoice: required.join(", "),
        whyWrong: `${name} is not indicated for this prescription.${drug?.indications?.length ? ` It is used for ${drug.indications.join(", ")}.` : ""} This Rx calls for a different drug.`,
        whatToKnow: "Always match the drug to the diagnosed condition. Check the drug class and indication before dispensing.",
        hint: "Think about the class of drug that treats the condition in this prescription.",
      });
      return;
    }
    setBrandDrug(drug);
  }

  function addDrug(name: string, brand?: string) {
    if (collected.includes(name)) return;
    setCollected((c) => [...c, name]);
    if (brand) setSelectedBrands((m) => ({ ...m, [name]: brand }));
    setCorrect((n) => n + 1);
    toastScore(20, brand ? `${name} - ${brand}` : name);
    maybeStartCompound(name);
  }

  function removeDrug(name: string) {
    setCollected((x) => x.filter((n) => n !== name));
    setSelectedBrands((m) => {
      const nextBrands = { ...m };
      delete nextBrands[name];
      return nextBrands;
    });
  }

  function selectBrand(drug: any, brand: string) {
    addDrug(drug.name, brand);
    setBrandDrug(null);
  }

  function confirmCollection() {
    if (required.some((r) => !collected.includes(r))) {
      toast.warning("Some required drugs still missing"); return;
    }
    if (hasCompoundTrigger && !compoundCompleted && collected.some(matchesCompoundTrigger)) {
      setPhase("compound");
      return;
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

  function recordCompoundAnswer(ok: boolean, error: {
    errorType: string;
    wrongChoice: string;
    correctChoice: string;
    whyWrong: string;
    whatToKnow: string;
  }) {
    if (ok) {
      setCompoundCorrect((n) => n + 1);
      toastScore(25, "compound OK");
    } else {
      setCompoundWrong((n) => n + 1);
      toastScore(-15, "compound error");
      errPanel.logError(error);
    }
  }

  function submitCompound(submission: CompoundSubmission) {
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
        whatToKnow: "Topical compounding starts with the correct vehicle. Lotion, cream, gel, and ointment bases change spreadability, absorption, and stability.",
      });
      recordCompoundAnswer(gramsOk, {
        errorType: "Wrong topical compound calculation",
        wrongChoice: `${submission.grams || 0} g`,
        correctChoice: `${data.correct_drug_grams} g`,
        whyWrong: "The active ingredient amount must match the target percent and final batch size. Too much or too little changes dose delivered to the skin.",
        whatToKnow: "Use: (target percent / 100) x total grams = grams of active drug needed.",
      });
    } else if (submission.type === "iv_sterile") {
      const diluentOk = normalizeText(submission.diluent) === normalizeText(data.correct_diluent);
      const volumeOk = withinTolerance(submission.volume, Number(data.correct_volume_ml), 0.05);
      recordCompoundAnswer(diluentOk, {
        errorType: "Wrong sterile IV diluent",
        wrongChoice: submission.diluent || "No diluent selected",
        correctChoice: String(data.correct_diluent ?? "Correct diluent"),
        whyWrong: "The wrong diluent can cause incompatibility, precipitation, instability, or unsafe administration.",
        whatToKnow: "Sterile IV preparation requires correct diluent, aseptic technique, concentration check, and route-specific labeling.",
      });
      recordCompoundAnswer(volumeOk, {
        errorType: "Wrong sterile IV volume calculation",
        wrongChoice: `${submission.volume || 0} mL`,
        correctChoice: `${data.correct_volume_ml} mL`,
        whyWrong: "The drawn stock volume must deliver the exact target dose. A wrong volume creates an underdose or overdose.",
        whatToKnow: "Use: target dose / stock concentration = volume needed.",
      });
    } else if (submission.type === "antibiotic_dilution") {
      const volumeOk = withinTolerance(submission.volume, Number(data.correct_volume_ml), 0.05);
      const stabilityOk = normalizeText(submission.stability) === normalizeText(String(data.correct_stability_days));
      recordCompoundAnswer(volumeOk, {
        errorType: "Wrong antibiotic reconstitution volume",
        wrongChoice: `${submission.volume || 0} mL`,
        correctChoice: `${data.correct_volume_ml} mL`,
        whyWrong: "The reconstitution volume determines final concentration. Wrong concentration can break dilution instructions and dosing accuracy.",
        whatToKnow: "Check vial strength, final volume, target concentration, diluent compatibility, and infusion labeling.",
      });
      recordCompoundAnswer(stabilityOk, {
        errorType: "Wrong antibiotic stability",
        wrongChoice: `${submission.stability || "No answer"} days`,
        correctChoice: `${data.correct_stability_days} days`,
        whyWrong: "Using a reconstituted antibiotic beyond its stability window can reduce potency or increase contamination risk.",
        whatToKnow: "Always label beyond-use dating after reconstitution and storage conditions.",
      });
    } else {
      errPanel.logError({
        errorType: "Unknown compounding type",
        wrongChoice: String(type ?? "missing"),
        correctChoice: "topical, iv_sterile, or antibiotic_dilution",
        whyWrong: "This case is marked for compounding but does not define a supported compounding workflow.",
        whatToKnow: "Compounding cases need a compound_type and compound_data object before they can be safely simulated.",
      });
    }
    setCompoundCompleted(true);
    setPhase("info");
  }

  async function finish(timedOut: boolean) {
    const score = computeScore({
      difficulty: caseData?.difficulty,
      correctDrugs: correct, wrongDrugs: wrong + compoundWrong, infoRead,
      correctLabels: correctLabels + compoundCorrect,
      wrongLabels,
      hintsUsed: hints,
      pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "rx",
      score, timeTaken: timer.taken, errors: wrong + wrongLabels + compoundWrong,
      correctDrugs: correct + compoundCorrect, totalDrugs: required.length + compoundCorrect + compoundWrong,
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
          { label: "Compounding",      delta: compoundCorrect * 25 - compoundWrong * 15 },
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
        score={correct * 20 - wrong * 15 + infoRead * 15 + correctLabels * 25 - wrongLabels * 10 + compoundCorrect * 25 - compoundWrong * 15}
        onExit={onExit}
        onHint={() => { setHints((n) => n + 1); toastScore(-10, "hint"); setShowClean(true); }}
      />

      {/* Sub-mode badge strip */}
      <div className="border-b border-border/30 bg-background/60 backdrop-blur px-4 py-2 flex items-center gap-3">
        <SubmodeBadge mode="rx" />
        <span className="text-xs text-muted-foreground">{caseData.title}</span>
      </div>

      {phase === "collect" && (
        <main className="relative mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_1.2fr]">
          <CommunityFloatingPills className="opacity-35" />
          {/* Prescription panel */}
          <div className="relative z-10 rounded-xl border border-border/40 bg-card/50 p-4 backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Rx Cases</p>
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
                <PrescriptionSheet caseData={caseData} />
              )}
            </AnimatePresence>

            <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs">
              <p className="font-semibold">Patient</p>
              <p className="text-muted-foreground">
                {caseData.patient_info_json?.name}, {caseData.patient_info_json?.age}y -
                Allergies: {caseData.patient_info_json?.allergies ?? "-"}
              </p>
            </div>
          </div>

          {/* Drug shelf + tray */}
          <div className="relative z-10 space-y-3">
            {/* Dispensing tray */}
            <motion.div
              layout
              className="sticky top-20 z-30 rounded-2xl border border-primary/40 bg-gradient-to-b from-card/95 to-background/90 p-3 shadow-[0_20px_55px_-22px_oklch(0.74_0.14_180/0.85),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-x-5 top-1 h-px bg-white/20" />
              <p className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" /> Dispensing tray
                </span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {collected.length} selected
                </span>
              </p>
              {collected.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">Tap drugs below to add</p>
              ) : (
                <motion.ul layout className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-black/15 p-2 pr-1 shadow-inner">
                  <AnimatePresence initial={false}>
                  {collected.map((c) => (
                    <motion.li
                      layout
                      key={c}
                      initial={{ opacity: 0, scale: 0.78, y: -12 }}
                      animate={{ opacity: 1, scale: [0.96, 1.08, 1], y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 18 }}
                      transition={{ type: "spring", stiffness: 520, damping: 24 }}
                      className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm shadow-[0_10px_22px_-18px_oklch(0.74_0.14_180/0.9)]"
                    >
                      <span>
                        <span className="font-semibold">{c}</span>
                        {selectedBrands[c] && <span className="ml-2 text-xs text-primary">{selectedBrands[c]}</span>}
                      </span>
                      <button onClick={() => removeDrug(c)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </motion.li>
                  ))}
                  </AnimatePresence>
                </motion.ul>
              )}
              <button onClick={confirmCollection} disabled={collected.length === 0}
                className="mt-3 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-15px_oklch(0.74_0.14_180/0.9)] transition hover:brightness-110 disabled:opacity-40">
                Confirm collection &gt;
              </button>
            </motion.div>

            <div className="rounded-2xl border border-border/35 bg-card/35 p-3 shadow-inner backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {category ? `${category} shelf` : "Medicine categories"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {category ? "Pick a medicine, then choose its brand." : "Select a category to open the shelf."}
                  </p>
                </div>
                {category ? (
                  <button
                    onClick={() => setCategory("")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  >
                    <ArrowLeft className="size-3.5" />
                    Categories
                  </button>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {categoryStats.length} groups
                  </span>
                )}
              </div>
              {!category ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryStats.map((c) => (
                    <motion.button
                      key={c.name}
                      whileHover={{ y: -4, boxShadow: "0 20px 44px -24px oklch(0.74 0.14 180 / 0.85)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCategory(c.name)}
                      className="group rounded-2xl border border-border/40 bg-card/70 p-4 text-left transition hover:border-primary/60 hover:bg-primary/10"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                          <Pill className="size-5" />
                        </span>
                        <span className="rounded-full border border-border/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {c.count} meds
                        </span>
                      </div>
                      <p className="text-base font-bold">{c.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open shelf and select a dispensing brand</p>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filtered.map((d, i) => {
                    const isCollected = collected.includes(d.name);
                    return (
                      <motion.button
                        key={d.id}
                        initial={{ opacity: 0, x: 42 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.35), type: "spring", stiffness: 260, damping: 24 }}
                        whileHover={{ y: -6, scale: 1.025, boxShadow: "0 18px 38px -20px oklch(0.74 0.14 180 / 0.95)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openBrandSelection(d)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isCollected
                            ? "border-primary/45 bg-primary/10 text-foreground"
                            : "border-border/40 bg-card/70 hover:border-primary/70 hover:bg-primary/10 hover:text-foreground"
                        }`}
                      >
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{d.generic_name ?? d.category}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          <Tags className="size-3" />
                          choose brand
                        </p>
                      </motion.button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                      No medicines found in this category.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </main>
      )}

      <AnimatePresence>
        {brandDrug && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="glass-card w-full max-w-xl p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-primary">Select brand</p>
                  <h2 className="mt-1 text-2xl font-bold">{brandDrug.name}</h2>
                  <p className="text-sm text-muted-foreground">{brandDrug.generic_name ?? brandDrug.category}</p>
                </div>
                <button
                  onClick={() => setBrandDrug(null)}
                  className="rounded-full border border-border/50 p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                  aria-label="Close brand selector"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {getBrandsForDrug(brandDrug).map((brand) => (
                  <motion.button
                    key={brand}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectBrand(brandDrug, brand)}
                    className="rounded-xl border border-border/40 bg-card/60 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    <p className="font-semibold">{brand}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Dispense this brand</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "compound" && (
        <CompoundStep caseData={caseData} onSubmit={submitCompound} />
      )}

      {phase === "info" && (
        <DrugInfoStep
          drug={correctDrugs[infoIdx]} allDrugs={catalogDrugs}
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
function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function withinTolerance(value: number, expected: number, tolerance = 0.05) {
  if (!Number.isFinite(value) || !Number.isFinite(expected)) return false;
  const allowance = Math.max(Math.abs(expected) * tolerance, 0.01);
  return Math.abs(value - expected) <= allowance;
}

function compoundNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompoundValue(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${value}${suffix}`;
}

function compoundOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function CompoundStep({
  caseData,
  onSubmit,
}: {
  caseData: any;
  onSubmit: (submission: CompoundSubmission) => void;
}) {
  const data = caseData?.compound_data ?? {};
  const type = String(caseData?.compound_type ?? "");
  const [base, setBase] = useState("");
  const [grams, setGrams] = useState("");
  const [diluent, setDiluent] = useState("");
  const [volume, setVolume] = useState("");
  const [stability, setStability] = useState("");

  const typeLabel =
    type === "topical" ? "Topical compounding" :
    type === "iv_sterile" ? "Sterile IV preparation" :
    type === "antibiotic_dilution" ? "Antibiotic reconstitution" :
    "Compounding";

  function submit() {
    if (type === "topical") {
      onSubmit({ type: "topical", base, grams: compoundNumber(grams) });
    } else if (type === "iv_sterile") {
      onSubmit({ type: "iv_sterile", diluent, volume: compoundNumber(volume) });
    } else {
      onSubmit({ type: "antibiotic_dilution", volume: compoundNumber(volume), stability });
    }
  }

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-6">
      <CommunityFloatingPills className="opacity-25" />
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-card/80 via-background/85 to-emerald-950/55 p-5 shadow-[0_28px_80px_-45px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/25" />
        <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary">{typeLabel}</p>
          <h2 className="mt-2 text-2xl font-black">This strength is not commercially available.</h2>
          <p className="mt-1 text-sm text-muted-foreground">You'll need to compound it before moving to patient information and labeling.</p>
        </div>

        {type === "topical" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <CompoundFacts
              rows={[
                ["Target strength", formatCompoundValue(data.target_percent, "%")],
                ["Final quantity", formatCompoundValue(data.total_grams, " g")],
                ["Formula hint", "(target % / 100) x total grams = drug needed"],
              ]}
            />
            <CompoundAnswerPanel
              title="Prepare topical base"
              optionsLabel="Select base"
              options={compoundOptions(data.base_options)}
              selected={base}
              onSelect={setBase}
              inputLabel="Active drug needed (g)"
              inputValue={grams}
              onInput={setGrams}
              inputPlaceholder="e.g. 2.5"
              onSubmit={submit}
            />
          </div>
        )}

        {type === "iv_sterile" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <CompoundFacts
              rows={[
                ["Target dose", formatCompoundValue(data.target_dose_mg, " mg")],
                ["Stock concentration", formatCompoundValue(data.stock_concentration_mg_per_ml, " mg/mL")],
                ["Formula hint", "target dose / concentration = volume needed"],
              ]}
            />
            <CompoundAnswerPanel
              title="Build sterile IV order"
              optionsLabel="Select diluent"
              options={compoundOptions(data.diluent_options)}
              selected={diluent}
              onSelect={setDiluent}
              inputLabel="Volume to draw (mL)"
              inputValue={volume}
              onInput={setVolume}
              inputPlaceholder="e.g. 10"
              onSubmit={submit}
            />
          </div>
        )}

        {type === "antibiotic_dilution" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <CompoundFacts
              rows={[
                ["Vial strength", formatCompoundValue(data.vial_total_mg, " mg")],
                ["Target concentration", formatCompoundValue(data.target_concentration, " mg/mL")],
                ["Check", "Choose the reconstitution volume, then label stability"],
              ]}
            />
            <div className="rounded-2xl border border-border/35 bg-card/55 p-4 backdrop-blur">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">Reconstitute vial</p>
              <CompoundOptionGrid
                label="Volume option"
                options={compoundOptions(data.volume_options)}
                selected={volume}
                onSelect={setVolume}
                suffix=" mL"
              />
              <div className="mt-4">
                <CompoundOptionGrid
                  label="Stable after reconstitution"
                  options={compoundOptions(data.stability_options)}
                  selected={stability}
                  onSelect={setStability}
                  suffix=" days"
                />
              </div>
              <button
                onClick={submit}
                className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110"
              >
                Complete compound
              </button>
            </div>
          </div>
        )}

        {!["topical", "iv_sterile", "antibiotic_dilution"].includes(type) && (
          <div className="rounded-2xl border border-destructive/35 bg-destructive/10 p-4">
            <p className="font-semibold text-destructive">This compounding case is missing a supported compound type.</p>
            <button onClick={submit} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Continue
            </button>
          </div>
        )}
      </motion.section>
    </main>
  );
}

function CompoundFacts({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-border/35 bg-card/45 p-4 backdrop-blur">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Compound data</p>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/30 bg-background/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
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
  onSubmit,
}: {
  title: string;
  optionsLabel: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  inputLabel: string;
  inputValue: string;
  onInput: (value: string) => void;
  inputPlaceholder: string;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/35 bg-card/55 p-4 backdrop-blur">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">{title}</p>
      <CompoundOptionGrid label={optionsLabel} options={options} selected={selected} onSelect={onSelect} />
      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{inputLabel}</span>
        <input
          type="number"
          inputMode="decimal"
          value={inputValue}
          onChange={(event) => onInput(event.target.value)}
          placeholder={inputPlaceholder}
          className="mt-2 w-full rounded-xl border border-border/45 bg-background/50 px-4 py-3 font-mono text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <button
        onClick={onSubmit}
        className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110"
      >
        Complete compound
      </button>
    </div>
  );
}

function CompoundOptionGrid({
  label,
  options,
  selected,
  onSelect,
  suffix = "",
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
              selected === option
                ? "border-primary/70 bg-primary/15 text-primary shadow-[0_14px_34px_-24px_oklch(0.74_0.14_180/0.9)]"
                : "border-border/40 bg-background/35 hover:border-primary/50 hover:bg-primary/10"
            }`}
          >
            {option}{suffix}
          </button>
        ))}
        {options.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/45 p-3 text-sm text-muted-foreground">
            No options configured for this case.
          </div>
        )}
      </div>
    </div>
  );
}

type OtcStep = "questions" | "drug" | "dose" | "quantity" | "advice" | "done";

function OtcGame({ caseData, next, LIMIT }: { caseData: any; next: () => void; LIMIT: number }) {
  const { profile } = useAuthStore();
  const onExit = useGameExit("/modes");

  const [step, setStep]     = useState<OtcStep>("questions");
  const [qi, setQi]         = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong]   = useState(0);
  const [hints, setHints]   = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [dialogueLog, setDialogueLog] = useState<OtcDialogueTurn[]>([]);

  const timer   = useTimer(LIMIT, () => step !== "done" && finish(true));
  const errPanel = useErrorPanel({
    mode: "otc",
    difficulty: caseData?.difficulty,
    mentorTip: caseData?.mentor_tip,
    setExternalPaused: timer.setExternalPaused,
  });

  useEffect(() => {
    setStep("questions"); setQi(0); setCorrect(0); setWrong(0); setHints(0); setQuantity(1); setResult(null); setDialogueLog([]);
  }, [caseData?.id]);

  const ans: any       = caseData?.correct_answer_json ?? {};
  const questions: any[] = ans.questions ?? [];

  function pickQuestion(i: number) {
    const q = questions[qi];
    const selectedQuestion = getOtcSelectedQuestionText(q, i);
    const patientResponse = getOtcPatientResponse(q, i);
    const isCorrect = isOtcQuestionChoiceCorrect(q, i);
    setDialogueLog((log) => [...log, { pharmacist: selectedQuestion, patient: patientResponse, correct: isCorrect }]);
    if (isCorrect) { setCorrect((n) => n + 1); toastScore(20, "good question"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong path");
      errPanel.logError({
        errorType: "Irrelevant follow-up question",
        wrongChoice: selectedQuestion,
        correctChoice: getOtcCorrectQuestionText(q),
        whyWrong: "That question does not uncover the key OTC safety information for this scenario.",
        whatToKnow: "Priority OTC questions establish who the medicine is for, symptoms, duration, prior treatment, allergies, medical conditions, and current medicines.",
      });
    }
    if (qi + 1 < questions.length) setQi((x) => x + 1);
    else setStep("drug");
  }

  function pickDrug(opt: string) {
    const correctChoices = getOtcCorrectChoices(ans);
    if (correctChoices.includes(opt)) { setCorrect((n) => n + 1); toastScore(20, "correct drug"); }
    else {
      setWrong((n) => n + 1); toastScore(-15, "wrong drug");
      errPanel.logError({
        errorType: "Wrong OTC recommendation",
        wrongChoice: opt, correctChoice: formatOtcCorrectChoice(ans),
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
    setQuantity(getOtcCorrectQuantity(ans));
    setStep("quantity");
  }

  function submitQuantity(qty: number) {
    const expected = getOtcCorrectQuantity(ans);
    if (qty === expected) { setCorrect((n) => n + 1); toastScore(10, "correct quantity"); }
    else {
      setWrong((n) => n + 1); toastScore(-5, "quantity off");
      errPanel.logError({
        errorType: "Wrong OTC quantity",
        wrongChoice: `${qty} pack${qty === 1 ? "" : "s"}`,
        correctChoice: `${expected} pack${expected === 1 ? "" : "s"}`,
        whyWrong: "The quantity should match the recommended OTC course without oversupplying or leaving the patient short.",
        whatToKnow: "OTC quantity should follow dose, duration, pack size, safety limits, and referral advice.",
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
      difficulty: caseData?.difficulty,
      correctDrugs: correct, wrongDrugs: wrong, correctLabels: cl, wrongLabels: wl,
      hintsUsed: hints, pauseUsed: timer.pauseUsed,
      timeTakenSec: timer.taken, timeLimitSec: LIMIT, timedOut,
    });
    const { xpGain } = await submitScore({
      userId: profile!.user_id, caseId: caseData.id, mode: "otc",
      score, timeTaken: timer.taken, errors: wrong + wl,
      correctDrugs: correct, totalDrugs: questions.length + 4,
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
        drugs={[{ name: ans.correct_drug, correct: true, info: `${ans.correct_dose} · Qty ${quantity}` }]}
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

      <main className="relative mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr]">
        <CommunityFloatingPills className="opacity-30" />
        {/* Patient panel */}
        <aside className="relative z-10 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur">
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
              <p className="text-xs text-muted-foreground">Age {caseData.patient_info_json?.age ?? "-"}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {Object.entries(caseData.patient_info_json ?? {}).map(([k, v]) => (
              <li key={k}><span className="font-medium text-foreground">{k}:</span> {String(v)}</li>
            ))}
          </ul>
        </aside>

        {/* Question / answer area */}
        <section className="relative z-10">
          <motion.div key={`${step}-${qi}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 p-5 backdrop-blur">

            {step === "questions" && questions[qi] && (
              <>
                <OtcScenarioPanel ans={ans} caseData={caseData} dialogueLog={dialogueLog} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your follow-up question</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {getOtcQuestionOptions(questions[qi]).map((c: string, i: number) => (
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
            {step === "quantity" && (
              <OtcQuantitySlider value={quantity} max={getOtcQuantityMax(ans)} onChange={setQuantity} onSubmit={submitQuantity} />
            )}
            {step === "advice" && <OtcPicker title="Counsel the patient"    options={ans.advice_options ?? []} onPick={pickAdvice} />}
          </motion.div>
        </section>
      </main>
      {errPanel.panel}
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function getOtcCorrectQuantity(ans: any) {
  const raw = ans.correct_quantity ?? ans.quantity ?? ans.recommended_quantity ?? ans.pack_quantity ?? 1;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}

function getOtcQuantityMax(ans: any) {
  return Math.max(5, getOtcCorrectQuantity(ans) + 2);
}

function OtcQuantitySlider({
  value,
  max,
  onChange,
  onSubmit,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  onSubmit: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Select quantity</p>
      <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Dispense quantity</p>
            <p className="mt-1 font-mono text-4xl font-black tabular-nums text-primary">{value}</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {value === 1 ? "1 pack" : `${value} packs`}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-5 w-full accent-primary"
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>1</span>
          <span>{max}</span>
        </div>
        <button
          onClick={() => onSubmit(value)}
          className="mt-4 w-full rounded-full bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-primary-foreground shadow-[0_0_32px_-14px_oklch(0.74_0.14_180/0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90"
        >
          Confirm quantity
        </button>
      </div>
    </div>
  );
}

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
  const [duration, setDuration] = useState(DURATIONS[0]);

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
        <DurationSlider value={duration} onChange={setDuration} />
        <button
          disabled={!freq || !timing}
          onClick={() => onSubmit({ frequency: freq, timing, duration })}
          className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          Submit label
        </button>
      </div>
    </main>
  );
}

function DurationSlider({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const index = Math.max(0, DURATIONS.indexOf(value));

  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Duration</p>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={DURATIONS.length - 1}
        step={1}
        value={index}
        onChange={(event) => onChange(DURATIONS[Number(event.target.value)])}
        aria-label="Duration"
        className="mt-4 w-full accent-primary"
      />
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {DURATIONS.map((durationOption) => (
          <span key={durationOption} className={durationOption === value ? "text-primary" : ""}>
            {durationOption}
          </span>
        ))}
      </div>
    </div>
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
