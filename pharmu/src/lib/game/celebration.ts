/**
 * How much to celebrate finishing a case.
 *
 * Every mode shows the celebration - finishing a case should feel like
 * finishing something wherever you did it - but the amount of noise it makes is
 * earned. Confetti over a case someone got badly wrong reads as "that went
 * well", and the screen immediately underneath it is a list of their mistakes.
 * The two would be telling them opposite things.
 *
 * Mistakes rather than score decide the tier: score scales differently per mode
 * and difficulty, so a "good" number in Warehousing is not a good number in
 * Community, while an error is an error anywhere.
 */

export type CelebrationTier = {
  key: "flawless" | "strong" | "steady";
  title: string;
  blurb: string;
  /** Confetti pieces; zero means the result did not earn any. */
  confetti: number;
};

const FLAWLESS: CelebrationTier = {
  key: "flawless",
  title: "Flawless",
  blurb: "Every step correct, first time.",
  confetti: 72,
};

const STRONG: CelebrationTier = {
  key: "strong",
  title: "Nicely done",
  blurb: "A solid case with a little to tidy up.",
  confetti: 40,
};

const STEADY: CelebrationTier = {
  key: "steady",
  title: "Case complete",
  blurb: "Worth a careful read of what slipped.",
  confetti: 0,
};

export function celebrationTier(errorCount: number): CelebrationTier {
  if (errorCount <= 0) return FLAWLESS;
  if (errorCount <= 2) return STRONG;
  return STEADY;
}
