import { j as jsxRuntimeExports } from "../_libs/react.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
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
export {
  SimulatedPrescription as S
};
