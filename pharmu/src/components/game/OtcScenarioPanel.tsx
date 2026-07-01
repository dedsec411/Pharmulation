import { MessageCircle, Stethoscope } from "lucide-react";

export type OtcDialogueTurn = {
  pharmacist: string;
  patient: string;
  correct: boolean;
};

export function getOtcPatientResponse(question: any, choiceIndex: number) {
  const isCorrect = choiceIndex === question?.correct;
  if (isCorrect) {
    return question?.patient_response ?? question?.response ?? question?.answer ?? question?.q ?? "Okay.";
  }
  return question?.wrong_response ?? "I am not sure that answers what I came in for.";
}

export function getOtcCorrectChoices(ans: any) {
  const values = [
    ans?.correct_drug,
    ...(Array.isArray(ans?.correct_drugs) ? ans.correct_drugs : []),
  ];
  return values.map(String).filter(Boolean);
}

export function formatOtcCorrectChoice(ans: any) {
  const choices = getOtcCorrectChoices(ans);
  return choices.length ? choices.join(" or ") : String(ans?.correct_drug ?? "");
}

export function OtcScenarioPanel({
  ans,
  caseData,
  dialogueLog,
}: {
  ans: any;
  caseData: any;
  dialogueLog: OtcDialogueTurn[];
}) {
  const patient = caseData?.patient_info_json ?? {};
  const setting = ans?.scenario_setting ?? "A patient visits a community pharmacy requesting OTC advice.";
  const openingLine = ans?.opening_patient_line ?? ans?.complaint ?? patient.symptoms ?? caseData?.title ?? "I need some advice.";

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 shadow-[0_0_34px_-22px_oklch(0.74_0.14_180/0.9)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-background/35 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full border border-primary/30 bg-primary/15">
            <Stethoscope className="size-4 text-primary" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Case Scenario</p>
            <p className="text-[11px] text-muted-foreground">{setting}</p>
          </div>
        </div>
        <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex">
          OTC dialogue
        </span>
      </div>

      <div className="space-y-3 p-4">
        <DialogueLine speaker="Patient" text={openingLine} />
        {dialogueLog.map((turn, index) => (
          <div key={`${turn.pharmacist}-${index}`} className="space-y-2">
            <DialogueLine speaker="Pharmacist" text={turn.pharmacist} tone={turn.correct ? "pharmacist" : "warning"} />
            <DialogueLine speaker="Patient" text={turn.patient} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DialogueLine({
  speaker,
  text,
  tone = "patient",
}: {
  speaker: string;
  text: string;
  tone?: "patient" | "pharmacist" | "warning";
}) {
  const toneClass =
    tone === "pharmacist"
      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-50"
      : tone === "warning"
        ? "border-destructive/30 bg-destructive/10 text-destructive-foreground"
        : "border-primary/20 bg-background/45 text-foreground";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="mb-1 flex items-center gap-2">
        <MessageCircle className="size-3 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{speaker}</span>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
