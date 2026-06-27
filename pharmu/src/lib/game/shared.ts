import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Mode = "rx" | "otc" | "hospital" | "oncology" | "cosmetic" | "emergency" | "industry" | "warehousing";

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
  hospital: "Hospital",
  oncology: "Oncology",
  cosmetic: "Cosmetics",
  emergency: "Emergency",
  industry: "Industry / Production",
  warehousing: "Warehousing",
};

export type ScoreInput = {
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
  let s = 100;
  s += (i.correctDrugs ?? 0) * 20;
  s += (i.infoRead ?? 0) * 15;
  s += (i.correctLabels ?? 0) * 25;
  s -= (i.wrongDrugs ?? 0) * 15;
  s -= (i.wrongLabels ?? 0) * 10;
  s -= (i.hintsUsed ?? 0) * 10;
  if (i.pauseUsed) s -= 20;
  if (i.timeTakenSec < i.timeLimitSec / 2) s += 30;
  if (i.timedOut) s = Math.floor(s * 0.5);
  if (i.emergencyMultiplier) s = s * 3;
  return Math.max(0, Math.round(s));
}

export async function fetchRandomCase(mode: Mode) {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("mode", mode);
  if (error) throw error;
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

  const { error: scoreErr } = await supabase.from("scores").insert({
    user_id: args.userId,
    case_id: args.caseId,
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
  if (delta >= 0) toast.success(`+${delta} ${label}`);
  else toast.error(`${delta} ${label}`);
}
