import { makeRng } from "./seeded-random";

/**
 * Taking the free answers out of the modes.
 *
 * Two habits had crept across every mode, and both let somebody score without
 * reading anything.
 *
 * The first was positional. Where a question offered four answers, the right
 * one was written first or second because that is the order it occurs to you
 * in when you are authoring content - across the fourteen manufacturing
 * questions it was never third or fourth even once. A player who noticed that
 * could beat the mode without knowing any pharmacy.
 *
 * The second was worse: a dial already on the answer. Selecting an ingredient
 * to weigh set the scale to its exact target, so "Weigh" was a free pass; the
 * drying slider opened inside its acceptable band; the room started dead
 * centre of specification six runs in ten. Nothing had to be corrected because
 * nothing was wrong.
 *
 * Both are fixed here rather than in each mode so there is one rule to test,
 * and so a mode added later cannot quietly reintroduce either.
 */

/**
 * Shuffle, keyed on the case and the question.
 *
 * Deterministic on purpose. A learner who disputes a mark - or a lecturer
 * reviewing one with them - has to be able to reopen the same case and see the
 * same screen. What this removes is the systematic bias, not the reproducibility:
 * across a set of questions the answer now lands in every position about
 * equally, which is the part that could be gamed.
 *
 * Seeded per question as well as per case, so every question in a case does
 * not receive the same permutation and swap a fixed answer position for a
 * different fixed answer position.
 */
export function shuffledBySeed<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rng = makeRng(`options:${seed}`);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type WrongStart = {
  /** The acceptable band the player has to reach. */
  min: number;
  max: number;
  /** What the control itself can reach. */
  floor: number;
  ceiling: number;
  step?: number;
  seed: string;
};

/**
 * Where a dial should sit before the player touches it: wrong.
 *
 * Deliberately not adjacent to the band either. A value one step outside is
 * corrected by nudging the control until the colour changes, which tests
 * patience rather than whether the master formula was read - so this lands in
 * the outer part of whatever room the control has, far enough out to have to
 * be aimed rather than felt for.
 *
 * If the acceptable band covers everything the control can reach there is no
 * wrong value to start from; the band is returned and the step is a free one
 * whatever this does. That is a content problem, and the tests say so.
 */
export function wrongStart(input: WrongStart): number {
  const step = input.step && input.step > 0 ? input.step : 1;
  const round = (value: number) => Math.round(value / step) * step;

  const lowTop = round(input.min - step);
  const highBottom = round(input.max + step);
  const lowRoom = lowTop >= input.floor;
  const highRoom = highBottom <= input.ceiling;

  if (!lowRoom && !highRoom) return round(input.min);

  const rng = makeRng(`start:${input.seed}`);
  const goLow = lowRoom && (!highRoom || rng() < 0.5);

  if (goLow) {
    // The outer half of the room below, so the gap is worth closing.
    const bottom = input.floor;
    const value = round(bottom + (lowTop - bottom) * (rng() * 0.5));
    return clamp(Math.min(value, lowTop), input.floor, lowTop);
  }
  const top = input.ceiling;
  const value = round(highBottom + (top - highBottom) * (0.5 + rng() * 0.5));
  return clamp(Math.max(value, highBottom), highBottom, input.ceiling);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Whether a control can be started anywhere the player would have to correct. */
export function canStartWrong(input: Omit<WrongStart, "seed">): boolean {
  const step = input.step && input.step > 0 ? input.step : 1;
  return input.min - step >= input.floor || input.max + step <= input.ceiling;
}
