import { supabase } from "@/integrations/supabase/client";
import { applyCaseResult } from "@/lib/supabase-rpc";
import { toast } from "sonner";

export type Mode = "rx" | "otc" | "hospital" | "oncology" | "industry" | "warehousing";
export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
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

/** Baseline seconds per case, at medium difficulty. */
export const MODE_TIMERS: Record<Mode, number> = {
  rx: 180,
  // OTC is a typed consultation with an AI patient, not a few clicks, so it
  // needs materially more time than the click-driven modes.
  otc: 360,
  hospital: 240,
  oncology: 300,
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
export function modeTimeLimit(mode: Mode, difficulty?: Difficulty | string | null) {
  const key = (difficulty === "easy" || difficulty === "hard" || difficulty === "medium")
    ? difficulty
    : "medium";
  return Math.round(MODE_TIMERS[mode] * DIFFICULTY_TIME_SCALE[key]);
}

export const MODE_LABEL: Record<Mode, string> = {
  rx: "Rx Cases",
  otc: "OTC Consultation",
  hospital: "Clinical",
  oncology: "Oncology",
  industry: "Industry",
  warehousing: "Warehousing",
};

export const PUBLIC_MODE_GROUPS = [
  { key: "community", label: "Community Pharmacy", modes: ["rx", "otc"] },
  { key: "clinical", label: "Clinical", modes: ["hospital", "oncology"] },
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

export async function fetchRandomCase(mode: Mode, difficulty?: Difficulty | null) {
  let query = supabase
    .from("cases")
    .select("*")
    .eq("mode", mode);
  if (difficulty) query = query.eq("difficulty", difficulty);

  let { data, error } = await query;
  if (error) throw error;
  if ((!data || data.length === 0) && difficulty) {
    const fallback = await supabase.from("cases").select("*").eq("mode", mode);
    if (fallback.error) throw fallback.error;
    data = fallback.data;
  }
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)];
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
  errorsDetail?: any[];
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

  const { error: scoreErr } = await supabase.from("scores").insert({
    user_id: args.userId,
    case_id: caseId,
    mode: args.mode,
    score: args.score,
    time_taken: args.timeTaken,
    errors_made: args.errors,
    accuracy,
    errors_detail: (args.errorsDetail ?? []) as any,
  });
  if (scoreErr) {
    console.error("[supabase] failed to save score:", scoreErr);
    toast.error("Your score could not be saved.");
  }

  // Single atomic UPDATE server-side. Doing this as a read-then-write from
  // here let two concurrent submissions clobber each other's increment.
  const { data: updatedRows, error: applyErr } = await applyCaseResult(xpGain);

  if (applyErr) {
    console.error("[supabase] failed to apply case result:", applyErr);
    toast.error("Your XP could not be updated.");
  }

  const updated = updatedRows?.[0];
  if (updated) {
    const newTotal = updated.total_cases_completed;

    // Badge triggers
    if (newTotal === 1) awardBadge(args.userId, "First Case", "Completed your first case", "🎓");
    if (newTotal === 10) awardBadge(args.userId, "Apprentice", "Completed 10 cases", "💊");
    if (newTotal === 25) awardBadge(args.userId, "Pharmacist", "Completed 25 cases", "🏆");
    if (args.score >= 200) awardBadge(args.userId, "High Roller", "Scored 200+ in one case", "🔥");
  }
}

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
