/**
 * How to greet a finished case.
 *
 * Every mode ends here, and the screen has to tell the truth about what just
 * happened. Confetti over a case someone failed reads as "that went well", and
 * the breakdown directly underneath says otherwise - the two would be telling
 * the learner opposite things.
 *
 * This used to key on mistakes alone, which was wrong in a way that only showed
 * up in play: a learner who ran out of time having achieved nothing logged no
 * mistakes at all, so a case scoring the bare difficulty base was congratulated
 * as flawless. What was earned matters as much as what was got wrong.
 */

export type CelebrationTier = {
  key: "flawless" | "strong" | "steady" | "failed";
  title: string;
  blurb: string;
  /** Confetti pieces; zero means the result did not earn any. */
  confetti: number;
};

/**
 * What the case actually produced.
 *
 * `earned` is the positive credit from the score breakdown. `hasBreakdown`
 * distinguishes "earned nothing" from "this mode does not report a breakdown",
 * which are very different and would otherwise both read as zero.
 */
export type CaseResult = {
  errors: number;
  earned: number;
  hasBreakdown: boolean;
  correctDrugs: number;
  wrongDrugs: number;
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

const FAILED: CelebrationTier = {
  key: "failed",
  title: "Case failed",
  blurb: "This one did not go well. The breakdown below shows where it went wrong.",
  confetti: 0,
};

/**
 * Whether the case was failed outright.
 *
 * Three ways, any of which is enough: nothing was earned at all, no medicine
 * was handled correctly, or the mistakes piled up past recovery.
 */
export function isFailure(result: CaseResult): boolean {
  if (result.hasBreakdown && result.earned <= 0) return true;
  if (result.correctDrugs + result.wrongDrugs > 0 && result.correctDrugs === 0) return true;
  return result.errors >= 4;
}

export function celebrationTier(result: CaseResult): CelebrationTier {
  if (isFailure(result)) return FAILED;
  if (result.errors <= 0) return FLAWLESS;
  if (result.errors <= 2) return STRONG;
  return STEADY;
}

/** Build the result from what FeedbackScreen is already given. */
export function caseResultFrom(
  errors: number,
  breakdown: { delta: number }[],
  drugs: { correct: boolean }[],
): CaseResult {
  return {
    errors,
    earned: breakdown.reduce((sum, b) => sum + Math.max(0, b.delta), 0),
    hasBreakdown: breakdown.length > 0,
    correctDrugs: drugs.filter((d) => d.correct).length,
    wrongDrugs: drugs.filter((d) => !d.correct).length,
  };
}
