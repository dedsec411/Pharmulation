import { supabase } from "@/integrations/supabase/client";
import { pickNextCase, seenMap } from "./case-selection";
import { applyCaseResult } from "@/lib/supabase-rpc";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export type Mode = "rx" | "otc" | "hospital" | "industry" | "warehousing";
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Player-facing difficulty names. The internal keys stay easy/medium/hard so
 * stored scores and saved preferences keep working.
 *
 * Note: "Apprentice" is also a badge awarded at 10 cases, and "Expert
 * Pharmacist" is the top XP tier, so these names overlap with progression
 * wording elsewhere.
 */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Trainee",
  medium: "Apprentice",
  hard: "Expert",
};

export const DIFFICULTY_RULES: Record<Difficulty, {
  base: number;
  rewardMultiplier: number;
  penaltyMultiplier: number;
  speedBonus: number;
  pausePenalty: number;
  timeoutMultiplier: number;
}> = {
  easy: {
    base: 90,
    rewardMultiplier: 0.85,
    penaltyMultiplier: 0.65,
    speedBonus: 15,
    pausePenalty: 10,
    timeoutMultiplier: 0.65,
  },
  medium: {
    base: 100,
    rewardMultiplier: 1,
    penaltyMultiplier: 1,
    speedBonus: 30,
    pausePenalty: 20,
    timeoutMultiplier: 0.5,
  },
  hard: {
    base: 120,
    rewardMultiplier: 1.25,
    penaltyMultiplier: 1.5,
    speedBonus: 45,
    pausePenalty: 35,
    timeoutMultiplier: 0.4,
  },
};

/**
 * What difficulty changes about the case itself.
 *
 * Until now it changed the clock, the scoring multipliers and how much the
 * mentor gave away after a mistake - and nothing else. No mode read the
 * difficulty when building its content, so Expert and Trainee handed you the
 * same work and scored it differently, which is not the same as being harder.
 *
 * These are the levers that do not require inventing anything: how much wrong
 * stock is mixed in with the right stock, how many consignments and judgement
 * calls a shift contains, and whether the acceptable range is printed next to
 * the control or has to be looked up in the batch record. The record is one
 * click away at every level, so Expert is asking you to consult it rather than
 * withholding it.
 */
export const DIFFICULTY_CONTENT: Record<Difficulty, {
  /** Wrong items mixed in among the right ones, on a bench or a shelf. */
  distractors: number;
  /** Consignments to check at goods-in. */
  cartons: number;
  /** Judgement calls in the operations audit. */
  auditScenarios: number;
  /** Is the acceptable range printed beside the control, or only in the record? */
  showTolerances: boolean;
}> = {
  easy: { distractors: 1, cartons: 2, auditScenarios: 2, showTolerances: true },
  medium: { distractors: 2, cartons: 3, auditScenarios: 3, showTolerances: true },
  hard: { distractors: 4, cartons: 4, auditScenarios: 4, showTolerances: false },
};

export function difficultyContent(difficulty?: Difficulty | string | null) {
  const key = (difficulty === "easy" || difficulty === "hard" || difficulty === "medium")
    ? difficulty
    : "medium";
  return DIFFICULTY_CONTENT[key];
}

/**
 * Modes played against a clock, which is currently all of them.
 *
 * The distinction exists because warehousing was briefly a persistent facility
 * with no case to race. That version is parked rather than deleted, so the
 * type stays: putting it back is a matter of taking warehousing out of this
 * record again, and the compiler then finds every screen that assumed a timer.
 */
export type TimedMode = Mode;

export function isTimedMode(mode: string): mode is TimedMode {
  return mode in MODE_TIMERS;
}

/** Baseline seconds per case, at medium difficulty. */
export const MODE_TIMERS: Record<TimedMode, number> = {
  rx: 180,
  // OTC is a typed consultation with an AI patient, not a few clicks, so it
  // needs materially more time than the click-driven modes.
  otc: 360,
  hospital: 240,
  industry: 360,
  warehousing: 300,
};

/**
 * Difficulty changes how long you get, not just how the score is weighted:
 * easy buys thinking time, hard squeezes it.
 */
export const DIFFICULTY_TIME_SCALE: Record<Difficulty, number> = {
  easy: 1.25,
  medium: 1,
  hard: 0.85,
};

/** Seconds allowed for a case, scaled by difficulty. */
export function modeTimeLimit(mode: TimedMode, difficulty?: Difficulty | string | null) {
  const key = (difficulty === "easy" || difficulty === "hard" || difficulty === "medium")
    ? difficulty
    : "medium";
  return Math.round(MODE_TIMERS[mode] * DIFFICULTY_TIME_SCALE[key]);
}

export const MODE_LABEL: Record<Mode, string> = {
  rx: "Rx Cases",
  otc: "OTC Consultation",
  hospital: "Clinical",
  industry: "Industry",
  warehousing: "Warehousing",
};

export const PUBLIC_MODE_GROUPS = [
  { key: "community", label: "Community Pharmacy", modes: ["rx", "otc"] },
  { key: "clinical", label: "Clinical", modes: ["hospital"] },
  { key: "industry", label: "Industry", modes: ["industry"] },
  { key: "warehousing", label: "Warehousing", modes: ["warehousing"] },
] as const satisfies readonly { key: string; label: string; modes: readonly Mode[] }[];

export function publicModeLabel(mode: string) {
  // `as const` narrows each group's `modes` to a literal tuple, so `.includes`
  // would only accept that group's own members. Widen to string to compare.
  const group = PUBLIC_MODE_GROUPS.find((item) =>
    (item.modes as readonly string[]).includes(mode)
  );
  return group?.label ?? MODE_LABEL[mode as Mode] ?? mode;
}

export function publicModeCount(counts: Record<string, number>, modes: readonly string[]) {
  return modes.reduce((total, mode) => total + (counts[mode] ?? 0), 0);
}

export type ScoreInput = {
  difficulty?: Difficulty | string | null;
  correctDrugs?: number;
  wrongDrugs?: number;
  infoRead?: number;
  correctLabels?: number;
  wrongLabels?: number;
  hintsUsed?: number;
  pauseUsed?: boolean;
  timeTakenSec: number;
  timeLimitSec: number;
  timedOut?: boolean;
};

/**
 * Point value of each scoring action, before difficulty multipliers.
 *
 * Single source of truth: `computeScore` applies these, and the in-game
 * `toastScore` calls should quote them rather than repeating the numbers, so
 * tuning the scoring only requires editing this table.
 */
export const SCORE_WEIGHTS = {
  correctDrug: 20,
  infoRead: 15,
  correctLabel: 25,
  wrongDrug: 15,
  wrongLabel: 10,
  hint: 10,
} as const;

/**
 * What a correct answer is worth after N failed attempts on the same question.
 *
 * Modes that make you retry until you are right would otherwise pay full marks
 * for an answer arrived at by elimination. Full credit for first time, sharply
 * less for each retry, nothing from the fourth attempt on - so the mentor
 * explanation is still worth reading, but guessing is not worth doing.
 */
export const RETRY_REWARD_FACTORS = [1, 0.6, 0.3, 0] as const;

export function retryRewardFactor(wrongAttempts: number) {
  const index = Math.min(Math.max(wrongAttempts, 0), RETRY_REWARD_FACTORS.length - 1);
  return RETRY_REWARD_FACTORS[index];
}

export function difficultyRules(difficulty?: Difficulty | string | null) {
  const key = (difficulty === "easy" || difficulty === "hard" || difficulty === "medium")
    ? difficulty
    : "medium";
  return DIFFICULTY_RULES[key];
}

export function computeScore(i: ScoreInput) {
  const rules = difficultyRules(i.difficulty);
  let s = rules.base;
  s += (i.correctDrugs ?? 0) * SCORE_WEIGHTS.correctDrug * rules.rewardMultiplier;
  s += (i.infoRead ?? 0) * SCORE_WEIGHTS.infoRead * rules.rewardMultiplier;
  s += (i.correctLabels ?? 0) * SCORE_WEIGHTS.correctLabel * rules.rewardMultiplier;
  s -= (i.wrongDrugs ?? 0) * SCORE_WEIGHTS.wrongDrug * rules.penaltyMultiplier;
  s -= (i.wrongLabels ?? 0) * SCORE_WEIGHTS.wrongLabel * rules.penaltyMultiplier;
  s -= (i.hintsUsed ?? 0) * SCORE_WEIGHTS.hint * rules.penaltyMultiplier;
  if (i.pauseUsed) s -= rules.pausePenalty;
  if (i.timeTakenSec < i.timeLimitSec / 2) s += rules.speedBonus;
  if (i.timedOut) s = Math.floor(s * rules.timeoutMultiplier);
  return Math.max(0, Math.round(s));
}

/**
 * Score for a mode that tracks its own points (industry, warehousing) rather
 * than drug/label counters: the difficulty base is replaced by the mode's
 * point total, while hint, pause, speed and timeout adjustments stay identical
 * to every other mode.
 */
export function computeScoreFromPoints(i: ScoreInput & { points: number }) {
  const rules = difficultyRules(i.difficulty);
  const withoutBase = computeScore(i) - rules.base;
  return Math.max(0, Math.round(withoutBase + Math.max(0, i.points)));
}

type LiveScoreInput = Omit<ScoreInput, "timeTakenSec" | "timeLimitSec" | "timedOut">;

/**
 * Running score to show while a case is still in progress.
 *
 * Delegates to `computeScore` so the number on screen during play cannot drift
 * from the one on the results screen. The speed bonus and timeout penalty are
 * deliberately excluded - neither is known until the case ends, and showing
 * them early makes the counter jump around. Passing equal take/limit values
 * suppresses the speed bonus.
 */
export function liveScore(i: LiveScoreInput) {
  return computeScore({ ...i, timeTakenSec: 1, timeLimitSec: 1, timedOut: false });
}

/** Running score for a points-based mode. See `liveScore`. */
export function liveScoreFromPoints(i: LiveScoreInput & { points: number }) {
  return computeScoreFromPoints({ ...i, timeTakenSec: 1, timeLimitSec: 1, timedOut: false });
}

/**
 * A case from the fixed pool, avoiding what this player has just played.
 *
 * The pick used to be a uniform random draw with no memory at all. Several
 * mode-and-difficulty buckets hold one or two cases - Expert OTC holds exactly
 * one - so that meant the same case every time. `user_seen_cases` already had
 * a `case_id` column for this and nothing had ever written to it.
 *
 * The player id is optional because the Lens and the preview paths call this
 * without one; without it the behaviour is the old random draw, which is the
 * right answer for somebody with no history to avoid.
 */
export async function fetchRandomCase(
  mode: Mode,
  difficulty?: Difficulty | null,
  userId?: string | null,
) {
  let query = supabase
    .from("cases")
    .select("*")
    .eq("mode", mode);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const first = await query;
  if (first.error) throw first.error;
  let data = first.data;
  let substituted = false;
  if ((!data || data.length === 0) && difficulty) {
    // Last resort. A playable case beats a dead end in front of an audience,
    // but it is not the difficulty that was asked for, so say so loudly rather
    // than letting a bucket quietly go missing.
    console.warn(`[cases] no ${mode} case at ${difficulty}; serving another difficulty`);
    const fallback = await supabase.from("cases").select("*").eq("mode", mode);
    if (fallback.error) throw fallback.error;
    data = fallback.data;
    substituted = true;
  }
  if (!data || data.length === 0) return null;

  const seen = userId ? await fetchSeenCaseIds(userId, mode) : new Map<string, number>();
  const chosen = pickNextCase(data as Array<{ id: string }>, seen);
  if (!chosen) return null;
  if (userId && !substituted) void rememberCaseSeen(userId, mode, chosen.id, seen.has(chosen.id));
  return chosen as any;
}

async function fetchSeenCaseIds(userId: string, mode: Mode) {
  const { data, error } = await supabase
    .from("user_seen_cases")
    .select("case_id, last_seen_at")
    .eq("user_id", userId)
    .eq("mode", mode)
    .not("case_id", "is", null);
  if (error) {
    // Losing this history serves a repeat, which is the old behaviour and
    // survivable. Failing to hand over a case is not.
    console.error("[supabase] could not read case history:", error);
    return new Map<string, number>();
  }
  return seenMap(data ?? []);
}

/**
 * Insert or update, chosen here rather than left to an upsert.
 *
 * The unique index on (user_id, case_id) is partial - it only covers rows
 * where case_id is not null, because the same table also stores generated
 * cases keyed on a template and a seed. Postgres will not infer a partial
 * index as an ON CONFLICT arbiter, so the upsert failed on every single write
 * and the history stayed empty while the code looked correct.
 *
 * Nothing is lost by deciding here: the caller has just read the history to
 * pick the case, so it already knows whether this row exists.
 */
async function rememberCaseSeen(userId: string, mode: Mode, caseId: string, exists: boolean) {
  const now = new Date().toISOString();
  const { error } = exists
    ? await supabase
        .from("user_seen_cases")
        .update({ last_seen_at: now })
        .eq("user_id", userId)
        .eq("case_id", caseId)
    : await supabase
        .from("user_seen_cases")
        .insert({ user_id: userId, mode, case_id: caseId, last_seen_at: now });
  if (error) console.error("[supabase] could not record the case as seen:", error);
}

export async function submitScore(args: {
  userId: string;
  caseId: string;
  mode: Mode;
  score: number;
  timeTaken: number;
  errors: number;
  correctDrugs: number;
  totalDrugs: number;
  /**
   * Recorded on the row itself rather than left to a join to `cases`: most
   * cases are generated from a template and never get a `cases` row, so a
   * score for one has no difficulty a join could find. The difficulty picker
   * needs one to show a player their last score at a given difficulty.
   */
  difficulty?: Difficulty | string | null;
  errorsDetail?: any[];
  /**
   * Drug categories this case put in front of the learner, whether or not
   * anything went wrong. The weakness heatmap needs a denominator per class,
   * and errors_detail only ever records the failures - without this every
   * class cell would be errors divided by errors.
   */
  classAttempts?: string[];
}) {
  const accuracy = args.totalDrugs > 0 ? args.correctDrugs / args.totalDrugs : 1;
  const xpGain = Math.round(args.score / 2);
  const caseId = args.caseId?.startsWith("generated:") ? null : args.caseId;

  // Never throw. Callers finish the case with this result, so an error escaping
  // here strands the player on the last question with no way forward.
  try {
    await persistScore(args, { accuracy, xpGain });
  } catch (error) {
    console.error("[supabase] failed to submit score:", error);
    toast.error("Your score could not be saved.");
  }

  return { xpGain };
}

async function persistScore(
  args: Parameters<typeof submitScore>[0],
  { accuracy, xpGain }: { accuracy: number; xpGain: number },
) {
  const caseId = args.caseId?.startsWith("generated:") ? null : args.caseId;

  // class_attempts and difficulty are newer than the checked-in Supabase
  // types, which are generated from the live schema, so the insert is typed
  // loosely until they are regenerated against the applied migration.
  const difficulty = (args.difficulty === "easy" || args.difficulty === "medium" || args.difficulty === "hard")
    ? args.difficulty
    : null;
  const { error: scoreErr } = await (supabase.from("scores") as any).insert({
    user_id: args.userId,
    case_id: caseId,
    mode: args.mode,
    score: args.score,
    time_taken: args.timeTaken,
    errors_made: args.errors,
    accuracy,
    difficulty,
    errors_detail: (args.errorsDetail ?? []) as any,
    class_attempts: ([...new Set(args.classAttempts ?? [])]) as any,
  });
  if (scoreErr) {
    console.error("[supabase] failed to save score:", scoreErr);
    toast.error("Your score could not be saved.");
    // XP is claimed against the score row that was just written, so with no
    // row there is nothing to claim - calling anyway would only turn one
    // failure into two error toasts.
    return;
  }

  // Single atomic UPDATE server-side. Doing this as a read-then-write from
  // here let two concurrent submissions clobber each other's increment.
  //
  // The arguments are vestigial: the function claims the score row just
  // inserted and reads the figures off it, because a call that could name its
  // own XP could also be made in a loop. They are still passed so an older
  // deployed build keeps working against the same signature.
  const { data: updatedRows, error: applyErr } = await applyCaseResult(xpGain, accuracy, args.timeTaken);

  if (applyErr) {
    console.error("[supabase] failed to apply case result:", applyErr);
    toast.error("Your XP could not be updated.");
  }

  const updated = updatedRows?.[0];
  if (updated) {
    // The function returns the profile it just wrote, and the store is where
    // every screen reads XP, level, streak and the case count from - so
    // without this the navbar and profile kept last case's numbers until the
    // next full sign-in, and finishing a case appeared to award nothing. The
    // row is the complete profile, so it replaces the stored one outright
    // rather than being merged into it.
    useAuthStore.getState().setProfile(updated);

    const newTotal = updated.total_cases_completed;

    // Badge triggers
    // Ask for every badge, not just the one matching an exact milestone.
    // `newTotal === 10` meant a player already past 10 cases could never be
    // granted Apprentice, and any milestone reached while the RPC was missing
    // was lost for good. The function decides what has actually been earned and
    // skips badges already held, so asking for all of them is idempotent.
    await Promise.all(
      AUTO_BADGES.map((name) => awardBadge(args.userId, name, "", "")),
    );
  }
}

/**
 * Badges whose conditions `award_badge_if_earned` can verify from stored data.
 *
 * Not listed: "Cold Chain Guardian", "FEFO Expert" and "Drug Encyclopedia",
 * which depend on in-case events that are never persisted, so the server has no
 * way to confirm them.
 */
const AUTO_BADGES = [
  "First Case",
  "Apprentice",
  "Pharmacist",
  "Streak Master",
  "High Roller",
  "Perfect Score",
  "Speed Demon",
  "First Prescription",
  "OTC Expert",
  "Batch Perfectionist",
  "Master Manufacturer",
] as const;

export async function awardBadge(_userId: string, name: string, _description: string, _icon: string) {
  // Server-side validation via SECURITY DEFINER RPC; client cannot self-award.
  // Badges are cosmetic, so a failure here is logged and swallowed rather than
  // interrupting the end of a case.
  try {
    const { data, error } = await supabase.rpc("award_badge_if_earned", { _badge_name: name });
    if (error) {
      console.error("[supabase] badge check failed:", error);
      return;
    }
    if (data === true) toast.success(`🏅 Badge unlocked: ${name}`);
  } catch (error) {
    console.error("[supabase] badge check threw:", error);
  }
}

/** Increment a local-storage counter and award a badge when threshold is met. */
export async function bumpCounterBadge(
  userId: string,
  key: string,
  threshold: number,
  badge: { name: string; description: string; icon: string },
) {
  const k = `pv_${userId}_${key}`;
  const n = Number(localStorage.getItem(k) ?? "0") + 1;
  localStorage.setItem(k, String(n));
  if (n >= threshold) await awardBadge(userId, badge.name, badge.description, badge.icon);
}

export function toastScore(delta: number, label: string) {
  if (delta >= 0) {
    toast.success(`+${delta} ${label}`, {
      className: "score-toast-correct",
    });
  } else {
    toast.error(`${delta} ${label}`, {
      className: "score-toast-wrong",
    });
  }
}
