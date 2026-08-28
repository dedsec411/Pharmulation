/**
 * Study material generated from the drug catalogue.
 *
 * The study tools used to work only from bookmarks, so all three tabs were
 * empty until you had bookmarked four drugs - which read as "not implemented"
 * rather than "not started". Generation now works from any set of drugs, so a
 * category or the whole catalogue is a valid source.
 *
 * Questions are derived from the catalogue rather than written by hand, and
 * distractors are drawn from the same class or category wherever possible, so a
 * question cannot be answered by spotting the one plausible-looking option.
 */

export type StudyDrug = {
  id: string;
  name: string;
  generic_name?: string | null;
  drug_class?: string | null;
  category?: string | null;
  dosage?: string | null;
  indications?: string[] | null;
  side_effects?: string[] | null;
  contraindications?: string[] | null;
  interactions?: string[] | null;
};

export type QuizQuestion = {
  id: string;
  kind: "indication" | "class" | "sideEffect" | "contraindication" | "category";
  question: string;
  options: string[];
  correct: string;
  /** Shown after answering, so a wrong answer teaches something. */
  explanation: string;
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const first = (values?: string[] | null) =>
  Array.isArray(values) ? values.find((v) => String(v).trim()) : undefined;

/**
 * Distinct wrong options, preferring same-class then same-category peers.
 *
 * `disqualify` rejects a candidate that would also be a correct answer. Without
 * it, drawing distractors from the same class produced questions with several
 * right answers - "which is indicated for thrombosis prevention?" offering
 * aspirin, dabigatran and apixaban, all of which are.
 */
function distractors(
  target: StudyDrug,
  pool: StudyDrug[],
  pick: (d: StudyDrug) => string | undefined,
  count: number,
  disqualify?: (candidate: StudyDrug) => boolean,
) {
  const correct = pick(target);
  const seen = new Set([String(correct ?? "").toLowerCase()]);
  const take = (candidates: StudyDrug[]) => {
    const out: string[] = [];
    for (const d of shuffle(candidates)) {
      if (d.id === target.id) continue;
      if (disqualify?.(d)) continue;
      const value = pick(d);
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
      if (out.length >= count) break;
    }
    return out;
  };

  const sameClass = pool.filter((d) => d.drug_class && d.drug_class === target.drug_class);
  const sameCategory = pool.filter((d) => d.category && d.category === target.category);
  const found = take(sameClass);
  if (found.length < count) found.push(...take(sameCategory).slice(0, count - found.length));
  if (found.length < count) found.push(...take(pool).slice(0, count - found.length));
  return found;
}

type Builder = (drug: StudyDrug, pool: StudyDrug[]) => QuizQuestion | null;

const BUILDERS: Builder[] = [
  // Which drug treats this?
  (drug, pool) => {
    const indication = first(drug.indications);
    if (!indication) return null;
    const shares = (d: StudyDrug) =>
      (d.indications ?? []).some((i) => String(i).toLowerCase() === indication.toLowerCase());
    const wrong = distractors(drug, pool, (d) => d.name, 3, shares);
    if (wrong.length < 3) return null;
    return {
      id: `${drug.id}:indication`,
      kind: "indication",
      question: `Which medicine is indicated for ${indication.toLowerCase()}?`,
      options: shuffle([drug.name, ...wrong]),
      correct: drug.name,
      explanation: `${drug.name}${drug.drug_class ? ` (${drug.drug_class})` : ""} is indicated for ${indication.toLowerCase()}.`,
    };
  },

  // What class does it belong to?
  (drug, pool) => {
    if (!drug.drug_class) return null;
    const shares = (d: StudyDrug) => d.drug_class === drug.drug_class;
    const wrong = distractors(drug, pool, (d) => d.drug_class ?? undefined, 3, shares);
    if (wrong.length < 3) return null;
    return {
      id: `${drug.id}:class`,
      kind: "class",
      question: `Which class does ${drug.name} belong to?`,
      options: shuffle([drug.drug_class, ...wrong]),
      correct: drug.drug_class,
      explanation: `${drug.name} is a ${drug.drug_class}.`,
    };
  },

  // Which of these is a recognised side effect?
  (drug, pool) => {
    const effect = first(drug.side_effects);
    if (!effect) return null;
    const shares = (d: StudyDrug) =>
      (d.side_effects ?? []).some((e) => String(e).toLowerCase() === effect.toLowerCase());
    const wrong = distractors(drug, pool, (d) => first(d.side_effects), 3, shares);
    if (wrong.length < 3) return null;
    return {
      id: `${drug.id}:side-effect`,
      kind: "sideEffect",
      question: `Which is a recognised side effect of ${drug.name}?`,
      options: shuffle([effect, ...wrong]),
      correct: effect,
      explanation: `${effect} is associated with ${drug.name}.`,
    };
  },

  // What should stop you supplying it?
  (drug, pool) => {
    const contra = first(drug.contraindications);
    if (!contra) return null;
    const shares = (d: StudyDrug) =>
      (d.contraindications ?? []).some((c) => String(c).toLowerCase() === contra.toLowerCase());
    const wrong = distractors(drug, pool, (d) => first(d.contraindications), 3, shares);
    if (wrong.length < 3) return null;
    return {
      id: `${drug.id}:contraindication`,
      kind: "contraindication",
      question: `Which is a contraindication to ${drug.name}?`,
      options: shuffle([contra, ...wrong]),
      correct: contra,
      explanation: `${drug.name} is contraindicated in ${contra.toLowerCase()}.`,
    };
  },
];

/**
 * Build up to `count` questions from `drugs`, using `pool` for distractors.
 * Mixes question types so a session is not the same question repeated.
 */
export function buildQuiz(drugs: StudyDrug[], pool: StudyDrug[], count: number): QuizQuestion[] {
  const source = pool.length >= 4 ? pool : drugs;
  const questions: QuizQuestion[] = [];
  const used = new Set<string>();

  for (const drug of shuffle(drugs)) {
    for (const build of shuffle(BUILDERS)) {
      if (questions.length >= count) break;
      const question = build(drug, source);
      if (!question || used.has(question.id)) continue;
      used.add(question.id);
      questions.push(question);
      break; // one question per drug on the first pass, for variety
    }
    if (questions.length >= count) break;
  }

  // Second pass: if the set is small, allow more than one question per drug
  // rather than returning a three-question quiz.
  if (questions.length < count) {
    for (const drug of shuffle(drugs)) {
      for (const build of BUILDERS) {
        if (questions.length >= count) break;
        const question = build(drug, source);
        if (!question || used.has(question.id)) continue;
        used.add(question.id);
        questions.push(question);
      }
      if (questions.length >= count) break;
    }
  }

  return shuffle(questions);
}

/** Fields worth revealing on the back of a flashcard, in teaching order. */
export function flashcardFacts(drug: StudyDrug) {
  return [
    { label: "Class", value: drug.drug_class ?? undefined },
    { label: "Indications", value: drug.indications?.join(", ") || undefined },
    { label: "Typical dose", value: drug.dosage ?? undefined },
    { label: "Side effects", value: drug.side_effects?.join(", ") || undefined },
    { label: "Contraindications", value: drug.contraindications?.join(", ") || undefined },
    { label: "Interactions", value: drug.interactions?.join(", ") || undefined },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));
}
