/**
 * The AI Clinical Reasoning Examiner.
 *
 * A case tells you what a learner did. It does not tell you whether they knew
 * why. The examiner is a short viva after the feedback screen: three questions
 * about the decisions they just made, answered in their own words and marked on
 * four axes rather than right/wrong.
 *
 * Everything here is pure - personalities, scoring, the shape of a session - so
 * the marking can be tested without reaching the model. The prompts and API
 * calls live in api/examiner.functions.ts.
 */

export const EXAMINERS = [
  {
    key: "hassan",
    name: "Dr. Hassan",
    style: "Strict",
    tagline: "Challenges everything. Vague answers are not accepted.",
    /** Shown on the picker so the choice is informed rather than cosmetic. */
    blurb: "Expects you to justify each decision on its merits. Will push back on hedging and ask you to commit to an answer.",
    accent: "rose",
    persona:
      "You are Dr. Hassan, a demanding senior clinical pharmacist examiner. You challenge every claim and you do not accept vague, hedged or textbook-recited answers. If a trainee says something is 'safe' or 'appropriate' you want to know on what basis. You are never rude or sarcastic - you are exacting because patient safety deserves it. Your questions are direct and single-barrelled.",
  },
  {
    key: "hakim",
    name: "Dr. Hakim",
    style: "Supportive",
    tagline: "Warm and Socratic. Guides you toward the reasoning.",
    blurb: "Asks questions that lead you to the answer rather than testing recall. Good if you want to think out loud.",
    accent: "primary",
    persona:
      "You are Dr. Hakim, a warm and encouraging pharmacy educator. You teach by asking rather than telling: your questions open a door toward the reasoning instead of demanding a fact. You acknowledge what the trainee got right before probing what they missed. You are supportive but you do not lower the bar - a wrong answer is still marked as wrong, kindly and with the reason.",
  },
  {
    key: "zara",
    name: "Dr. Zara",
    style: "Real World",
    tagline: "Practical pharmacy only. No textbook theory.",
    blurb: "Asks what you would actually do at the counter on a busy Friday, with the patient in front of you.",
    accent: "amber",
    persona:
      "You are Dr. Zara, a community pharmacy manager who examines on practice rather than theory. You have no interest in mechanisms of action or memorised classifications. You ask what the trainee would actually say and do - at the counter, with a queue, with an incomplete history, when the prescriber is unreachable. Your questions always place the trainee in a concrete situation.",
  },
] as const;

export type ExaminerKey = (typeof EXAMINERS)[number]["key"];
export type Examiner = (typeof EXAMINERS)[number];

export function examinerByKey(key: string): Examiner {
  return EXAMINERS.find((e) => e.key === key) ?? EXAMINERS[1];
}

export const QUESTIONS_PER_SESSION = 3;

/** The four axes every answer is marked on, each out of 10. */
export const SCORE_AXES = [
  { key: "accuracy", label: "Accuracy", hint: "Is what you said correct?" },
  { key: "reasoning", label: "Reasoning depth", hint: "Did you explain why, not just what?" },
  { key: "safety", label: "Safety awareness", hint: "Did you account for what could go wrong?" },
  { key: "communication", label: "Communication", hint: "Would a patient or colleague understand you?" },
] as const;

export type AxisKey = (typeof SCORE_AXES)[number]["key"];
export type AnswerScore = Record<AxisKey, number>;

export type ExaminerQuestion = {
  id: string;
  question: string;
  /** Why this was asked - shown after answering, so the viva teaches. */
  focus: string;
};

export type GradedAnswer = {
  questionId: string;
  scores: AnswerScore;
  feedback: string;
  modelAnswer: string;
};

const AXIS_KEYS = SCORE_AXES.map((a) => a.key);

/** Clamp to the 0-10 an axis is defined on, tolerating whatever the model sent. */
export function clampAxis(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, n));
}

export function emptyScore(): AnswerScore {
  return { accuracy: 0, reasoning: 0, safety: 0, communication: 0 };
}

/**
 * The Clinical Reasoning Index, 0-100.
 *
 * A plain mean of every axis across every answered question. Deliberately not
 * weighted: the four axes are the definition of the index, and quietly making
 * safety worth double would mean the number no longer says what its parts say.
 *
 * Unanswered questions are excluded rather than scored zero - a session cut
 * short should report on what was actually examined, not punish a learner for
 * a session they never finished.
 */
export function clinicalReasoningIndex(answers: { scores: AnswerScore }[]): number {
  if (!answers.length) return 0;
  const total = answers.reduce(
    (sum, a) => sum + AXIS_KEYS.reduce((s, k) => s + clampAxis(a.scores[k]), 0),
    0,
  );
  const maximum = answers.length * AXIS_KEYS.length * 10;
  return Math.round((total / maximum) * 100);
}

/** Per-axis average across a session, for the breakdown bars. */
export function axisAverages(answers: { scores: AnswerScore }[]): AnswerScore {
  if (!answers.length) return emptyScore();
  const out = emptyScore();
  for (const key of AXIS_KEYS) {
    const sum = answers.reduce((s, a) => s + clampAxis(a.scores[key]), 0);
    out[key] = Math.round((sum / answers.length) * 10) / 10;
  }
  return out;
}

export type IndexBand = {
  key: "developing" | "competent" | "strong" | "exemplary";
  label: string;
  note: string;
};

/**
 * What a score means in words.
 *
 * Bands rather than a bare number, because 62 out of 100 tells a learner
 * nothing on its own about whether they are safe to practise.
 */
export function bandFor(index: number): IndexBand {
  if (index >= 85) {
    return { key: "exemplary", label: "Exemplary", note: "Reasoning is sound and you can articulate why." };
  }
  if (index >= 70) {
    return { key: "strong", label: "Strong", note: "Solid decisions, with room to sharpen how you justify them." };
  }
  if (index >= 50) {
    return { key: "competent", label: "Competent", note: "The decisions hold up; the reasoning behind them needs depth." };
  }
  return { key: "developing", label: "Developing", note: "Work on explaining why, not just what. Review the model answers." };
}

/** The case detail an examiner needs to ask about what actually happened. */
export type ExaminerCaseContext = {
  caseRef: string;
  caseTitle: string;
  mode: string;
  score: number;
  timeTakenSec: number;
  /** What the learner got wrong, verbatim from the in-game error log. */
  errors: {
    errorType: string;
    wrongChoice: string;
    correctChoice?: string;
    whyWrong: string;
  }[];
  /** Medicines involved and whether the learner handled each correctly. */
  drugs: { name: string; correct: boolean }[];
};

/**
 * Whether a case gives the examiner enough to ask about.
 *
 * A case with no title, no medicines and no mistakes leaves nothing specific to
 * question, and a generic viva is worse than none - the whole point is that the
 * questions reference what this learner actually did.
 */
export function hasExaminableContext(context: ExaminerCaseContext): boolean {
  return Boolean(context.caseTitle?.trim()) &&
    (context.drugs.length > 0 || context.errors.length > 0);
}
