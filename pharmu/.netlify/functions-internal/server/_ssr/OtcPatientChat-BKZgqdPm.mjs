import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { s as sendChatMessage } from "./router-3YGERiUv.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import { d as Stethoscope, a6 as MessageCircle, m as Send, a7 as ArrowRight } from "../_libs/lucide-react.mjs";
const DEFAULT_VITALS = {
  bp: "118/76",
  pulse: "82",
  spo2: "98",
  resp_rate: "16",
  temp: "98.6",
  gcs: "15",
  rbs: "104"
};
function valueFrom(patient, keys, fallback = "") {
  for (const key of keys) {
    const value = patient?.[key];
    if (value !== void 0 && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}
function buildMedicationLines(caseData) {
  const rx = caseData?.electronic_prescription_json ?? {};
  const ans = caseData?.correct_answer_json ?? {};
  const items = Array.isArray(rx.items) ? rx.items : [];
  if (items.length) {
    return items.map(
      (it) => [it.drug ?? "Medication", it.strength, it.sig].filter(Boolean).join(" ").trim()
    );
  }
  const otcLine = [ans.correct_drug, ans.correct_dose].filter(Boolean).join(" ");
  if (otcLine) return [otcLine, ans.correct_advice].filter(Boolean);
  return ["Medication as prescribed"];
}
function InfoRow({ label, value, unit }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex min-w-0 items-end gap-1 border-b border-slate-950 pb-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] font-bold", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-h-[15px] min-w-0 flex-1 break-words text-[10px] leading-tight", children: value ?? "" }),
    unit && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[9px] text-slate-700", children: unit })
  ] });
}
function WritingBox({
  minHeight,
  children,
  className = ""
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `relative overflow-hidden text-slate-800 ${className}`,
      style: {
        minHeight,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 21px, rgb(203 213 225) 21px 22px)"
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-10 px-1 py-0.5", children })
    }
  );
}
function VitalRow({ label, value, unit }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center gap-1", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-12 shrink-0 text-[10px] font-bold", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-h-[15px] flex-1 border-b border-slate-950 px-1 text-[10px] leading-tight", children: value }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[9px] text-slate-700", children: unit })
  ] });
}
function SimulatedPrescription({
  caseData,
  department = "Community Pharmacy Training"
}) {
  const rx = caseData?.electronic_prescription_json ?? {};
  const patient = caseData?.patient_info_json ?? {};
  const patientName = rx.patient ?? patient.name ?? "Training Patient";
  const prescriber = rx.prescriber ?? patient.doctor ?? "Dr. Singh";
  const now = /* @__PURE__ */ new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const caseId = String(caseData?.id ?? "training").slice(0, 8);
  const complaint = valueFrom(patient, ["complaint", "symptoms", "presenting_complaint"], caseData?.title ?? "Patient presenting complaint");
  const examination = valueFrom(patient, ["examination", "injuries"], `Allergies: ${patient.allergies ?? "N/A"}`);
  const diagnosis = valueFrom(patient, ["diagnosis", "provisional_diagnosis"], caseData?.diagnosis ?? caseData?.title ?? "Minor ailment assessment");
  const tests = valueFrom(patient, ["test_advised", "tests"], "CBC if symptoms persist; follow up if fever or red flags develop");
  const medicationLines = buildMedicationLines(caseData);
  const handwriting = {
    fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
    letterSpacing: "0.01em"
  };
  const vitals = {
    bp: valueFrom(patient, ["bp", "blood_pressure"], DEFAULT_VITALS.bp),
    pulse: valueFrom(patient, ["pulse", "heart_rate"], DEFAULT_VITALS.pulse),
    spo2: valueFrom(patient, ["spo2", "sp_o2"], DEFAULT_VITALS.spo2),
    resp_rate: valueFrom(patient, ["resp_rate", "respiratory_rate"], DEFAULT_VITALS.resp_rate),
    temp: valueFrom(patient, ["temp", "temperature"], DEFAULT_VITALS.temp),
    gcs: valueFrom(patient, ["gcs"], DEFAULT_VITALS.gcs),
    rbs: valueFrom(patient, ["rbs", "blood_glucose"], DEFAULT_VITALS.rbs)
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
      className: "flex justify-center rounded-lg border border-border/40 bg-slate-950/30 px-2 py-5 sm:px-5",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-[680px] -rotate-[0.35deg] bg-white px-5 py-4 text-slate-950 shadow-[0_24px_55px_rgba(0,0,0,0.45)]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 grid place-items-center overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "-rotate-12 border-2 border-red-500/15 px-8 py-2 text-center text-3xl font-black uppercase tracking-[0.24em] text-red-500/10", children: "Training Only" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b-2 border-slate-950 pb-1 text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-2 inline-block align-middle", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "36", height: "22", viewBox: "0 0 36 22", xmlns: "http://www.w3.org/2000/svg", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "1", y: "1", width: "34", height: "20", rx: "10", ry: "10", fill: "none", stroke: "#000", strokeWidth: "1.8" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "18", y1: "1", x2: "18", y2: "21", stroke: "#000", strokeWidth: "1.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "1", y: "1", width: "17", height: "20", rx: "10", ry: "10", fill: "#222" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "18", y: "1", width: "17", height: "20", rx: "10", ry: "10", fill: "white" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "1", y: "1", width: "34", height: "20", rx: "10", ry: "10", fill: "none", stroke: "#000", strokeWidth: "1.8" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "18", y1: "1", x2: "18", y2: "21", stroke: "#000", strokeWidth: "1.5" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "align-middle text-[22px] font-black uppercase tracking-[0.08em]", children: "Pharmulation" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-slate-950 align-middle text-[10px] font-bold", children: "24hr" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[8px] font-bold uppercase text-red-600", children: "Simulation template - not valid for dispensing" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "my-2 text-center text-sm font-bold underline", children: [
            "Department: ",
            department
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Patient Name:", value: patientName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Age:", value: patient.age }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Gender:", value: patient.gender }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Weight:", value: patient.weight, unit: "kg" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "BMI:", value: patient.bmi, unit: "kg/m2" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Doctor Name:", value: prescriber })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "M.R. No.:", value: `TR-${caseId}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Slip No.:", value: caseId }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Arrival Date/Time:", value: date }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(InfoRow, { label: "Contact:", value: patient.contact }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 flex gap-4", children: ["Smoker", "Non-Smoker"].map((label) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1 text-[10px] font-bold", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block h-[11px] w-[11px] border border-slate-950" }),
                " ",
                label
              ] }, label)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-bold uppercase", children: "Presenting Complaint:-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "72px", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-full break-words text-[13px] leading-[22px]", style: handwriting, children: complaint }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 mt-2 text-[11px] font-bold uppercase", children: "Examination / Injuries:-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "72px", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-full break-words text-[13px] leading-[22px]", style: handwriting, children: examination }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-bold underline", children: "VITALS" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "B.P.", value: vitals.bp, unit: "mmHg" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "PULSE", value: vitals.pulse, unit: "/min" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "SP O2", value: vitals.spo2, unit: "%" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "Res.R", value: vitals.resp_rate, unit: "/min" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "TEMP.", value: vitals.temp, unit: "F" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "GCS", value: vitals.gcs, unit: "/15" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(VitalRow, { label: "RBS", value: vitals.rbs, unit: "mg/dl" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 mt-2 text-[11px] font-bold underline", children: "PROVISIONAL DIAGNOSIS" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "66px", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-full break-words text-[13px] leading-[22px]", style: handwriting, children: diagnosis }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 mt-2 text-[11px] font-bold underline", children: "REFER TO" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "44px" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 border-t-2 border-slate-950 pt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-bold uppercase", children: "Treatment Given:-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(WritingBox, { minHeight: "176px", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-3xl font-serif font-bold leading-none text-slate-950", children: "Rx" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 pl-8 text-[16px] leading-[22px]", style: handwriting, children: medicationLines.slice(0, 6).map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-full break-words", style: { transform: `rotate(${i % 2 === 0 ? -0.35 : 0.25}deg)` }, children: line }, `${line}-${i}`)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-bold uppercase", children: "Test Advised" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "66px", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-full break-words text-[12px] leading-[22px]", style: handwriting, children: tests }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1 text-[11px] font-bold uppercase", children: "Sign & Stamp" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 place-items-center border border-slate-950 text-[10px] font-bold text-red-600", children: "Simulation only" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-1 border-t-2 border-slate-950 pt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[10px] font-bold", children: "Advise / Follow-Up:-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(WritingBox, { minHeight: "44px", className: "flex-1" })
          ] })
        ] })
      ] })
    },
    "template-prescription"
  );
}
function getOtcCorrectChoices(ans) {
  const values = [
    ans?.correct_drug,
    ...Array.isArray(ans?.correct_drugs) ? ans.correct_drugs : []
  ];
  return values.map(String).filter(Boolean);
}
function formatOtcCorrectChoice(ans) {
  const choices = getOtcCorrectChoices(ans);
  return choices.length ? choices.join(" or ") : String(ans?.correct_drug ?? "");
}
function OtcScenarioPanel({
  ans,
  caseData,
  dialogueLog = []
}) {
  const patient = caseData?.patient_info_json ?? {};
  const setting = ans?.scenario_setting ?? "A patient visits a community pharmacy requesting OTC advice.";
  const caseSummary = buildCaseSummary(ans, caseData, patient);
  const openingLine = typeof ans?.opening_patient_line === "string" ? ans.opening_patient_line : ans?.scenario_setting ? "" : ans?.complaint ?? patient.symptoms ?? caseData?.title ?? "I need some advice.";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_34px_-22px_oklch(0.74_0.14_180/0.9)] backdrop-blur", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-primary/20 bg-background/35 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/15", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stethoscope, { className: "size-4 text-primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black uppercase tracking-[0.22em] text-primary", children: "Case Scenario" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: setting })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex", children: "OTC dialogue" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogueLine, { speaker: "Case brief", text: caseSummary, tone: "pharmacist" }),
      openingLine ? /* @__PURE__ */ jsxRuntimeExports.jsx(DialogueLine, { speaker: "Patient", text: openingLine }) : null,
      dialogueLog.map((turn, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogueLine, { speaker: "Pharmacist", text: turn.pharmacist, tone: turn.correct ? "pharmacist" : "warning" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogueLine, { speaker: "Patient", text: turn.patient })
      ] }, `${turn.pharmacist}-${index}`))
    ] })
  ] });
}
function buildCaseSummary(ans, caseData, patient) {
  const patientConcern = patient.symptoms ?? ans?.complaint ?? caseData?.title ?? "Ask the patient to uncover the concern.";
  const focus = "Use the patient conversation to confirm who it is for, symptoms, duration, previous treatment, allergies, medical conditions, current medicines, and red flags.";
  return `${caseData?.title ?? "OTC case"}. Patient concern: ${patientConcern}. ${focus}`;
}
function DialogueLine({
  speaker,
  text,
  tone = "patient"
}) {
  const toneClass = tone === "pharmacist" ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-50" : tone === "warning" ? "border-destructive/30 bg-destructive/10 text-destructive-foreground" : "border-primary/20 bg-background/45 text-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border px-3 py-2 ${toneClass}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-1 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "size-3 text-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground", children: speaker })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm leading-relaxed", children: text })
  ] });
}
const MAX_EXCHANGES = 15;
function OtcPatientChat({
  ans,
  caseData,
  onComplete
}) {
  const patientInfo = reactExports.useMemo(() => buildPatientInfo(caseData, ans), [caseData, ans]);
  const scriptedResponses = reactExports.useMemo(() => buildScriptedResponses(ans), [ans]);
  const [messages, setMessages] = reactExports.useState([]);
  const [input, setInput] = reactExports.useState("");
  const [waiting, setWaiting] = reactExports.useState(false);
  const endRef = reactExports.useRef(null);
  const exchangeCount = messages.filter((message) => message.role === "user").length;
  const limitReached = exchangeCount >= MAX_EXCHANGES;
  reactExports.useEffect(() => {
    setMessages([{ role: "assistant", content: getOpeningLine(ans) }]);
    setInput("");
    setWaiting(false);
  }, [caseData?.id, ans]);
  reactExports.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);
  async function submit(event) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || waiting || limitReached) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setWaiting(true);
    try {
      const result = await sendChatMessage({
        data: {
          messages: messagesForApi(nextMessages),
          context: "patient",
          patientInfo
        }
      });
      const reply = shouldUseLocalFallback(result.reply) ? localPatientReply(content, patientInfo, scriptedResponses) : result.reply;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: localPatientReply(content, patientInfo, scriptedResponses) }
      ]);
    } finally {
      setWaiting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overflow-hidden rounded-2xl border border-primary/25 bg-background/35 shadow-[0_0_34px_-24px_oklch(0.74_0.14_180/0.9)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-primary/15 bg-primary/10 px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/15", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "size-4 text-primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-black uppercase tracking-[0.22em] text-primary", children: "Patient conversation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-muted-foreground", children: "Ask your own OTC assessment questions." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary", children: "AI patient" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-h-[360px] space-y-3 overflow-y-auto p-4", children: [
      messages.map((message, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        motion.div,
        {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          className: `flex ${message.role === "user" ? "justify-end" : "justify-start"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `max-w-[84%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_oklch(0.74_0.14_180/0.95)]" : "border border-border/40 bg-card/70 text-foreground"}`,
              children: message.content
            }
          )
        },
        `${message.role}-${index}`
      )),
      waiting && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 rounded-2xl border border-border/40 bg-card/70 px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "border-t border-border/35 bg-background/60 p-3", children: [
      limitReached && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary", children: "Conversation limit reached. Continue to recommendation when ready." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: input,
            onChange: (event) => setInput(event.target.value),
            disabled: waiting || limitReached,
            placeholder: "Ask the patient...",
            className: "min-w-0 flex-1 rounded-full border border-border/45 bg-card/70 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:opacity-55"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: waiting || limitReached || !input.trim(),
            className: "grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110 disabled:opacity-45",
            "aria-label": "Send patient question",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onComplete,
          className: "mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-[0_0_32px_-16px_oklch(0.74_0.14_180/0.9)] transition hover:-translate-y-0.5 hover:bg-primary/90",
          children: [
            "Continue to recommendation ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "size-4" })
          ]
        }
      )
    ] })
  ] });
}
function buildPatientInfo(caseData, ans) {
  const patient = caseData?.patient_info_json ?? {};
  return {
    name: patient.name ?? caseData?.title ?? "OTC patient",
    age: patient.age ?? "",
    symptoms: stringifyInfo(patient.symptoms ?? ans?.complaint ?? caseData?.title ?? "an OTC concern"),
    allergies: stringifyInfo(patient.allergies ?? patient.allergy ?? "none"),
    current_meds: stringifyInfo(patient.current_meds ?? patient.currentMeds ?? patient.medications ?? "none"),
    medical_conditions: stringifyInfo(patient.medical_conditions ?? patient.conditions ?? "none"),
    scenario_dialogue: buildScenarioDialogue(ans)
  };
}
function buildScenarioDialogue(ans) {
  const questions = Array.isArray(ans?.questions) ? ans.questions : [];
  const turns = questions.map((question) => {
    const correctIndex = Number(question?.correct ?? 0);
    const pharmacist = question?.choices?.[correctIndex] ?? question?.q ?? "Ask an appropriate OTC question.";
    const patient = question?.patient_response ?? question?.response ?? question?.answer ?? "Okay.";
    return `Pharmacist: ${pharmacist}
Patient: ${patient}`;
  });
  const outcome = ans?.correct_drugs?.length ? `Outcome: recommend ${ans.correct_drugs.join(" or ")}.` : ans?.correct_drug ? `Outcome: recommend ${ans.correct_drug}.` : "";
  return [...turns, outcome].filter(Boolean).join("\n");
}
function buildScriptedResponses(ans) {
  const questions = Array.isArray(ans?.questions) ? ans.questions : [];
  return questions.map((question) => {
    const correctIndex = Number(question?.correct ?? 0);
    const pharmacist = String(question?.choices?.[correctIndex] ?? question?.q ?? "");
    return {
      key: classifyQuestion(pharmacist),
      patient: String(question?.patient_response ?? question?.response ?? question?.answer ?? "Okay.")
    };
  }).filter((item) => item.key && item.patient);
}
function localPatientReply(question, patientInfo, scriptedResponses) {
  const key = classifyQuestion(question);
  const scripted = scriptedResponses.find((response) => response.key === key);
  if (scripted) return scripted.patient;
  if (key === "symptoms" && patientInfo.symptoms) return patientInfo.symptoms;
  if (key === "history") {
    return `Allergies: ${patientInfo.allergies || "none"}. Current medicines: ${patientInfo.current_meds || "none"}. Medical conditions: ${patientInfo.medical_conditions || "none"}.`;
  }
  return "I'm not sure. Could you ask me that another way?";
}
function classifyQuestion(value) {
  const text = normalize(value);
  if (/\b(who|for|yourself|someone)\b/.test(text)) return "who";
  if (/\b(symptom|symptoms|having|feel|feeling|problem|pain|located|where)\b/.test(text)) return "symptoms";
  if (/\b(how long|started|start|duration|since|when)\b/.test(text)) return "duration";
  if (/\b(taken|tried|already|relieve|medicine yet|anything for)\b/.test(text)) return "prior_treatment";
  if (/\b(allerg|ulcer|liver|medical|condition|conditions|other medicines|current medicines|taking any)\b/.test(text)) return "history";
  return "";
}
function getOpeningLine(ans) {
  if (typeof ans?.opening_patient_line === "string" && ans.opening_patient_line.trim()) {
    return ans.opening_patient_line.trim();
  }
  return "Hi, I need some advice. Can you help me?";
}
function messagesForApi(messages) {
  const firstQuestionIndex = messages.findIndex((message) => message.role === "user");
  return firstQuestionIndex === -1 ? messages : messages.slice(firstQuestionIndex);
}
function shouldUseLocalFallback(reply) {
  const text = reply.toLowerCase();
  return text.includes("gemini") || text.includes("api key") || text.includes("quota") || text.includes("not connected");
}
function stringifyInfo(value) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(String).join(", ");
  return String(value ?? "");
}
function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
export {
  OtcScenarioPanel as O,
  SimulatedPrescription as S,
  OtcPatientChat as a,
  formatOtcCorrectChoice as f,
  getOtcCorrectChoices as g
};
