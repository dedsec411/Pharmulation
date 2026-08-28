import { motion } from "framer-motion";
import { useMemo, type ReactNode } from "react";
import { buildClinicalPicture } from "@/lib/game/clinical-picture";

type SimulatedPrescriptionProps = {
  caseData: any;
  department?: string;
};

function valueFrom(patient: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = patient?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
}

function buildMedicationLines(caseData: any) {
  const rx = caseData?.electronic_prescription_json ?? {};
  const ans = caseData?.correct_answer_json ?? {};
  const items = Array.isArray(rx.items) ? rx.items : [];

  if (items.length) {
    return items.map((it: any) =>
      [it.drug ?? "Medication", it.strength, it.sig].filter(Boolean).join(" ").trim()
    );
  }

  const otcLine = [ans.correct_drug, ans.correct_dose].filter(Boolean).join(" ");
  if (otcLine) return [otcLine, ans.correct_advice].filter(Boolean);

  return ["Medication as prescribed"];
}

function InfoRow({ label, value, unit }: { label: string; value?: ReactNode; unit?: string }) {
  return (
    <div className="mb-1 flex min-w-0 items-end gap-1 border-b border-slate-950 pb-0.5">
      <span className="shrink-0 text-[10px] font-bold">{label}</span>
      <span className="min-h-[15px] min-w-0 flex-1 break-words text-[10px] leading-tight">{value ?? ""}</span>
      {unit && <span className="shrink-0 text-[9px] text-slate-700">{unit}</span>}
    </div>
  );
}

function WritingBox({
  minHeight,
  children,
  className = "",
}: {
  minHeight: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden text-slate-800 ${className}`}
      style={{
        minHeight,
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 21px, rgb(203 213 225) 21px 22px)",
      }}
    >
      <div className="relative z-10 px-1 py-0.5">{children}</div>
    </div>
  );
}

function VitalRow({ label, value, unit }: { label: string; value?: ReactNode; unit: string }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <span className="w-12 shrink-0 text-[10px] font-bold">{label}</span>
      <span className="min-h-[15px] flex-1 border-b border-slate-950 px-1 text-[10px] leading-tight">{value}</span>
      <span className="shrink-0 text-[9px] text-slate-700">{unit}</span>
    </div>
  );
}

export function SimulatedPrescription({
  caseData,
  department = "Community Pharmacy Training",
}: SimulatedPrescriptionProps) {
  const rx = caseData?.electronic_prescription_json ?? {};
  const patient = caseData?.patient_info_json ?? {};
  const patientName = rx.patient ?? patient.name ?? "Training Patient";
  const prescriber = rx.prescriber ?? patient.doctor ?? "Dr. Singh";
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  // Derived once per case rather than per render: these are the patient's
  // observations, and a re-render must not quietly change their blood pressure.
  const picture = useMemo(() => buildClinicalPicture({
    seed: String(caseData?.id ?? "training"),
    title: String(caseData?.title ?? ""),
    age: Number(patient.age) || 40,
    gender: patient.gender,
    allergies: patient.allergies,
  }), [caseData?.id, caseData?.title, patient.age, patient.gender, patient.allergies]);

  // Anything the case states explicitly still wins; the picture fills the gaps.
  const complaint = valueFrom(patient, ["complaint", "symptoms", "presenting_complaint"], picture.complaint);
  const examination = valueFrom(patient, ["examination", "injuries"], picture.examination);
  const diagnosis = valueFrom(patient, ["diagnosis", "provisional_diagnosis"], picture.diagnosis);
  const tests = valueFrom(patient, ["test_advised", "tests"], picture.testAdvised);
  const referTo = valueFrom(patient, ["refer_to", "referral"], picture.referTo);
  const advice = valueFrom(patient, ["advice", "follow_up"], picture.advice);
  const arrival = valueFrom(patient, ["arrival_time"], picture.arrivalTime);
  const medicationLines = buildMedicationLines(caseData);
  const handwriting = {
    fontFamily: '"Segoe Print", "Comic Sans MS", cursive',
    letterSpacing: "0.01em",
  };

  const vitals = {
    bp: valueFrom(patient, ["bp", "blood_pressure"], picture.vitals.bp),
    pulse: valueFrom(patient, ["pulse", "heart_rate"], picture.vitals.pulse),
    spo2: valueFrom(patient, ["spo2", "sp_o2"], picture.vitals.spo2),
    resp_rate: valueFrom(patient, ["resp_rate", "respiratory_rate"], picture.vitals.respRate),
    temp: valueFrom(patient, ["temp", "temperature"], picture.vitals.temp),
    gcs: valueFrom(patient, ["gcs"], picture.vitals.gcs),
    rbs: valueFrom(patient, ["rbs", "blood_glucose"], picture.vitals.rbs),
  };

  return (
    <motion.div
      key="template-prescription"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-center rounded-lg border border-border/40 bg-slate-950/30 px-2 py-5 sm:px-5"
    >
      <div className="relative w-full max-w-[680px] -rotate-[0.35deg] bg-white px-5 py-4 text-slate-950 shadow-[0_24px_55px_rgba(0,0,0,0.45)]">
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
            <p className="mt-1 text-[8px] font-bold uppercase text-red-600">Simulation template - not valid for dispensing</p>
          </div>

          <div className="my-2 text-center text-sm font-bold underline">Department: {department}</div>

          <div className="mb-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
            <div>
              <InfoRow label="Patient Name:" value={patientName} />
              <InfoRow label="Age:" value={patient.age} />
              <div className="flex gap-2">
                <div className="min-w-0 flex-1"><InfoRow label="Gender:" value={patient.gender} /></div>
                <div className="min-w-0 flex-1"><InfoRow label="Weight:" value={patient.weight ?? picture.weightKg} unit="kg" /></div>
              </div>
              <InfoRow label="BMI:" value={patient.bmi ?? picture.bmi} unit="kg/m2" />
              <InfoRow label="Doctor Name:" value={prescriber} />
            </div>
            <div>
              <InfoRow label="M.R. No.:" value={picture.mrNo} />
              <InfoRow label="Slip No.:" value={picture.slipNo} />
              <InfoRow label="Arrival Date/Time:" value={`${date} ${arrival}`} />
              <InfoRow label="Contact:" value={patient.contact ?? picture.contact} />
              <div className="mt-1 flex gap-4">
                {([["Smoker", picture.smoker], ["Non-Smoker", !picture.smoker]] as const).map(([label, ticked]) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] font-bold">
                    <span className="grid h-[11px] w-[11px] place-items-center border border-slate-950 text-[10px] font-black leading-none">
                      {ticked ? "✓" : ""}
                    </span> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase">Presenting Complaint:-</div>
              <WritingBox minHeight="72px">
                <p className="max-w-full break-words text-[13px] leading-[22px]" style={handwriting}>{complaint}</p>
              </WritingBox>
              <div className="mb-1 mt-2 text-[11px] font-bold uppercase">Examination / Injuries:-</div>
              <WritingBox minHeight="72px">
                <p className="max-w-full break-words text-[13px] leading-[22px]" style={handwriting}>{examination}</p>
              </WritingBox>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold underline">VITALS</div>
              <VitalRow label="B.P." value={vitals.bp} unit="mmHg" />
              <VitalRow label="PULSE" value={vitals.pulse} unit="/min" />
              <VitalRow label="SP O2" value={vitals.spo2} unit="%" />
              <VitalRow label="Res.R" value={vitals.resp_rate} unit="/min" />
              <VitalRow label="TEMP." value={vitals.temp} unit="F" />
              <VitalRow label="GCS" value={vitals.gcs} unit="/15" />
              <VitalRow label="RBS" value={vitals.rbs} unit="mg/dl" />
              <div className="mb-1 mt-2 text-[11px] font-bold underline">PROVISIONAL DIAGNOSIS</div>
              <WritingBox minHeight="66px">
                <p className="max-w-full break-words text-[13px] leading-[22px]" style={handwriting}>{diagnosis}</p>
              </WritingBox>
              <div className="mb-1 mt-2 text-[11px] font-bold underline">REFER TO</div>
              <WritingBox minHeight="44px">
                <p className="max-w-full break-words text-[12px] leading-[22px]" style={handwriting}>{referTo}</p>
              </WritingBox>
            </div>
          </div>

          <div className="mt-1 border-t-2 border-slate-950 pt-1">
            <div className="mb-1 text-[11px] font-bold uppercase">Treatment Given:-</div>
            <WritingBox minHeight="176px">
              <p className="mb-2 text-3xl font-serif font-bold leading-none text-slate-950">Rx</p>
              <div className="space-y-1.5 pl-8 text-[16px] leading-[22px]" style={handwriting}>
                {medicationLines.slice(0, 6).map((line: string, i: number) => (
                  <p key={`${line}-${i}`} className="max-w-full break-words" style={{ transform: `rotate(${i % 2 === 0 ? -0.35 : 0.25}deg)` }}>
                    {line}
                  </p>
                ))}
              </div>
            </WritingBox>
          </div>

          <div className="mt-2 grid gap-x-4 border-t-2 border-slate-950 pt-1 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase">Test Advised</div>
              <WritingBox minHeight="66px">
                <p className="max-w-full break-words text-[12px] leading-[22px]" style={handwriting}>{tests}</p>
              </WritingBox>
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
            <WritingBox minHeight="44px" className="flex-1">
              <p className="max-w-full break-words text-[12px] leading-[22px]" style={handwriting}>{advice}</p>
            </WritingBox>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
