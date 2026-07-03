import { MessageCircle, Stethoscope } from "lucide-react";

export type OtcDialogueTurn = {
  pharmacist: string;
  patient: string;
  correct: boolean;
};

const DEFAULT_QUESTION_DECOYS = [
  "Do you prefer tablets or capsules?",
  "Which brand do you usually buy?",
  "Would you like the cheapest option?",
  "Do you want to buy two packs today?",
  "Should I give you an antibiotic?",
  "Do you want something very strong?",
  "Is this for a refill?",
  "Do you want a flavored medicine?",
];

export function getOtcQuestionOptions(question: any) {
  if (isDialogueQuestion(question)) {
    return normalizeFourOptions(question?.choices ?? [], question?.q ?? "What would you like to ask?");
  }

  const correctQuestion = String(question?.q ?? "What symptoms are you having?");
  const decoys = DEFAULT_QUESTION_DECOYS.filter((item) => item !== correctQuestion);
  return normalizeFourOptions([correctQuestion, ...decoys], correctQuestion);
}

export function getOtcCorrectQuestionText(question: any) {
  if (isDialogueQuestion(question)) {
    return getOtcQuestionOptions(question)[Number(question?.correct ?? 0)] ?? "";
  }
  return String(question?.q ?? "");
}

export function getOtcSelectedQuestionText(question: any, choiceIndex: number) {
  return getOtcQuestionOptions(question)[choiceIndex] ?? "";
}

export function isOtcQuestionChoiceCorrect(question: any, choiceIndex: number) {
  if (isDialogueQuestion(question)) return choiceIndex === Number(question?.correct ?? 0);
  return choiceIndex === 0;
}

export function getOtcPatientResponse(question: any, choiceIndex: number) {
  const isCorrect = isOtcQuestionChoiceCorrect(question, choiceIndex);
  if (isCorrect) {
    if (isDialogueQuestion(question)) {
      return question?.patient_response ?? question?.response ?? question?.answer ?? "Okay.";
    }
    const answerIndex = Number(question?.correct ?? 0);
    return question?.patient_response ?? question?.choices?.[answerIndex] ?? "Okay.";
  }
  return question?.wrong_response ?? "I am not sure that answers what I came in for.";
}

function isDialogueQuestion(question: any) {
  return Boolean(
    question?.patient_response ||
    question?.response ||
    question?.answer ||
    question?.choice_type === "pharmacist_questions"
  );
}

function normalizeFourOptions(options: unknown[], fallback: string) {
  const normalized = options.map(String).filter(Boolean);
  const unique = [...new Set(normalized.length ? normalized : [fallback])];
  for (const decoy of DEFAULT_QUESTION_DECOYS) {
    if (unique.length >= 4) break;
    if (!unique.includes(decoy)) unique.push(decoy);
  }
  return unique.slice(0, 4);
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
  dialogueLog = [],
}: {
  ans: any;
  caseData: any;
  dialogueLog?: OtcDialogueTurn[];
}) {
  const patient = caseData?.patient_info_json ?? {};
  const setting = ans?.scenario_setting ?? "A patient visits a community pharmacy requesting OTC advice.";
  const caseSummary = buildCaseSummary(ans, caseData, patient);
  const openingLine = typeof ans?.opening_patient_line === "string"
    ? ans.opening_patient_line
    : ans?.scenario_setting
      ? ""
      : ans?.complaint ?? patient.symptoms ?? caseData?.title ?? "I need some advice.";

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
        <DialogueLine speaker="Case brief" text={caseSummary} tone="pharmacist" />
        {openingLine ? (
          <DialogueLine speaker="Patient" text={openingLine} />
        ) : null}
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

function buildCaseSummary(ans: any, caseData: any, patient: any) {
  const patientConcern = patient.symptoms ?? ans?.complaint ?? caseData?.title ?? "Ask the patient to uncover the concern.";
  const focus = "Use the patient conversation to confirm who it is for, symptoms, duration, previous treatment, allergies, medical conditions, current medicines, and red flags.";
  return `${caseData?.title ?? "OTC case"}. Patient concern: ${patientConcern}. ${focus}`;
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
