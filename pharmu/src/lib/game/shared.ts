import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Mode = "rx" | "otc" | "hospital" | "oncology" | "cosmetic" | "emergency" | "industry" | "warehousing";
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

export const MODE_TIMERS: Record<Mode, number> = {
  rx: 180,
  otc: 120,
  hospital: 240,
  oncology: 300,
  cosmetic: 120,
  emergency: 90,
  industry: 360,
  warehousing: 300,
};

export const MODE_LABEL: Record<Mode, string> = {
  rx: "Rx Cases",
  otc: "OTC Consultation",
  hospital: "Clinical",
  oncology: "Oncology",
  cosmetic: "Cosmetics",
  emergency: "Emergency",
  industry: "Industry",
  warehousing: "Warehousing",
};

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
  emergencyMultiplier?: boolean;
  timedOut?: boolean;
};

export function computeScore(i: ScoreInput) {
  const difficulty = (i.difficulty === "easy" || i.difficulty === "hard" || i.difficulty === "medium")
    ? i.difficulty
    : "medium";
  const rules = DIFFICULTY_RULES[difficulty];
  let s = rules.base;
  s += (i.correctDrugs ?? 0) * 20 * rules.rewardMultiplier;
  s += (i.infoRead ?? 0) * 15 * rules.rewardMultiplier;
  s += (i.correctLabels ?? 0) * 25 * rules.rewardMultiplier;
  s -= (i.wrongDrugs ?? 0) * 15 * rules.penaltyMultiplier;
  s -= (i.wrongLabels ?? 0) * 10 * rules.penaltyMultiplier;
  s -= (i.hintsUsed ?? 0) * 10 * rules.penaltyMultiplier;
  if (i.pauseUsed) s -= rules.pausePenalty;
  if (i.timeTakenSec < i.timeLimitSec / 2) s += rules.speedBonus;
  if (i.timedOut) s = Math.floor(s * rules.timeoutMultiplier);
  if (i.emergencyMultiplier) s = s * 3;
  return Math.max(0, Math.round(s));
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
  if (scoreErr) console.error(scoreErr);

  const { data: profile } = await supabase
    .from("profiles")
    .select("xp, level, total_cases_completed")
    .eq("user_id", args.userId)
    .single();

  if (profile) {
    const newXp = (profile.xp ?? 0) + xpGain;
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
    const newTotal = (profile.total_cases_completed ?? 0) + 1;
    await supabase
      .from("profiles")
      .update({
        xp: newXp,
        level: newLevel,
        total_cases_completed: newTotal,
      })
      .eq("user_id", args.userId);

    // Badge triggers
    if (newTotal === 1) awardBadge(args.userId, "First Case", "Completed your first case", "🎓");
    if (newTotal === 10) awardBadge(args.userId, "Apprentice", "Completed 10 cases", "💊");
    if (newTotal === 25) awardBadge(args.userId, "Pharmacist", "Completed 25 cases", "🏆");
    if (args.score >= 200) awardBadge(args.userId, "High Roller", "Scored 200+ in one case", "🔥");
  }

  return { xpGain };
}

export async function awardBadge(_userId: string, name: string, _description: string, _icon: string) {
  // Server-side validation via SECURITY DEFINER RPC; client cannot self-award.
  const { data, error } = await supabase.rpc("award_badge_if_earned", { _badge_name: name });
  if (!error && data === true) {
    toast.success(`🏅 Badge unlocked: ${name}`);
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
