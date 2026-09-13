import { makeRng, type Rng } from "./seeded-random";
import { editDistance } from "./lookalike";
import { LOOKALIKE_PAIRS, type LookalikePair } from "./lookalike-pairs";
import type { Difficulty } from "./shared";

/**
 * The safety drill: two packs whose names are nearly the same.
 *
 * The prescription names one brand and the shelf holds both. That is the whole
 * task, and it deliberately asserts nothing about pharmacology - it is reading
 * accuracy, which is what the error it models actually is. What makes it worth
 * playing is the second half: after the pick, the learner is shown what the
 * other pack would have been, and the two are usually in different therapeutic
 * classes entirely.
 *
 * No dose appears anywhere. A prescriber's brand and a pack on a shelf are
 * both real catalogue data; a dose would have to be invented, and inventing
 * one is how a training tool teaches a wrong number.
 */

export type ShelfPack = {
  brand: string;
  generic: string;
  drugClass: string;
  correct: boolean;
};

export type LookalikeQuestion = {
  pair: LookalikePair;
  /** The brand the prescriber wrote. */
  prescribed: string;
  prescribedGeneric: string;
  prescribedClass: string;
  /** The brand that looks like it, and what it actually is. */
  decoy: string;
  decoyGeneric: string;
  decoyClass: string;
  shelf: ShelfPack[];
};

/** How long a run is, and how crowded the shelf gets. */
export function drillShape(difficulty: Difficulty): { questions: number; shelfSize: number } {
  if (difficulty === "easy") return { questions: 5, shelfSize: 2 };
  if (difficulty === "hard") return { questions: 8, shelfSize: 4 };
  return { questions: 6, shelfSize: 3 };
}

const sideOf = (pair: LookalikePair, useA: boolean) => (useA
  ? { brand: pair.a, generic: pair.aGeneric, drugClass: pair.aClass }
  : { brand: pair.b, generic: pair.bGeneric, drugClass: pair.bClass });

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Fillers that are not a second trap.
 *
 * A shelf pack drawn from another pair has to be far enough from both names in
 * this question, or the learner is being asked to choose between two
 * look-alikes and a third look-alike, and a wrong answer stops meaning what
 * the feedback says it means.
 */
function isSafeFiller(candidate: string, prescribed: string, decoy: string): boolean {
  return editDistance(candidate, prescribed) > 3 && editDistance(candidate, decoy) > 3;
}

export function buildLookalikeDrill(
  seed: string,
  difficulty: Difficulty,
  pairs: readonly LookalikePair[] = LOOKALIKE_PAIRS,
): LookalikeQuestion[] {
  const shape = drillShape(difficulty);
  if (!pairs.length) return [];
  const rng = makeRng(`lookalike:${seed}:${difficulty}`);

  // The list is ranked worst-first, so the top of it is where the teaching is.
  // Expert reaches further down, where the names are less obviously alike.
  const depth = difficulty === "easy"
    ? Math.min(pairs.length, 20)
    : difficulty === "medium" ? Math.min(pairs.length, 40) : pairs.length;
  const chosen = shuffle(pairs.slice(0, depth), rng).slice(0, shape.questions);

  const everyBrand = pairs.flatMap((p) => [
    { brand: p.a, generic: p.aGeneric, drugClass: p.aClass },
    { brand: p.b, generic: p.bGeneric, drugClass: p.bClass },
  ]);

  return chosen.map((pair) => {
    // Either side can be the one prescribed, so a learner cannot answer by
    // remembering which name came first in the list.
    const prescribed = sideOf(pair, rng() < 0.5);
    const decoy = sideOf(pair, prescribed.brand !== pair.a);

    const fillers = shuffle(everyBrand, rng)
      .filter((f) => f.brand !== prescribed.brand && f.brand !== decoy.brand
        && isSafeFiller(f.brand, prescribed.brand, decoy.brand))
      .filter((f, i, all) => all.findIndex((x) => x.brand === f.brand) === i)
      .slice(0, Math.max(0, shape.shelfSize - 2));

    const shelf = shuffle(
      [
        { ...prescribed, correct: true },
        { ...decoy, correct: false },
        ...fillers.map((f) => ({ ...f, correct: false })),
      ],
      rng,
    );

    return {
      pair,
      prescribed: prescribed.brand,
      prescribedGeneric: prescribed.generic,
      prescribedClass: prescribed.drugClass,
      decoy: decoy.brand,
      decoyGeneric: decoy.generic,
      decoyClass: decoy.drugClass,
      shelf,
    };
  });
}

/** What the learner is told when they hand over the wrong pack. */
export function explainWrongPack(question: LookalikeQuestion, picked: ShelfPack): {
  whyWrong: string; whatToKnow: string;
} {
  const sameClass = picked.drugClass.trim().toLowerCase() === question.prescribedClass.trim().toLowerCase();
  return {
    whyWrong: `The prescription is for ${question.prescribed}, which is ${question.prescribedGeneric}. You handed over ${picked.brand}, which is ${picked.generic}${sameClass ? "" : ` - a different class of medicine entirely (${picked.drugClass}, not ${question.prescribedClass})`}.`,
    whatToKnow: "Two brand names this close are picked up for each other every day. Read the generic name on the pack against the prescription before it leaves the counter - the brand is what the eye recognises and the generic is what the patient takes.",
  };
}
