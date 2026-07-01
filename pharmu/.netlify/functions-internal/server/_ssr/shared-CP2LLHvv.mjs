import { s as supabase } from "./client-CGYRwklv.mjs";
import { t as toast } from "../_libs/sonner.mjs";
const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard"
};
const DIFFICULTY_RULES = {
  easy: {
    base: 90,
    rewardMultiplier: 0.85,
    penaltyMultiplier: 0.65,
    speedBonus: 15,
    pausePenalty: 10,
    timeoutMultiplier: 0.65
  },
  medium: {
    base: 100,
    rewardMultiplier: 1,
    penaltyMultiplier: 1,
    speedBonus: 30,
    pausePenalty: 20,
    timeoutMultiplier: 0.5
  },
  hard: {
    base: 120,
    rewardMultiplier: 1.25,
    penaltyMultiplier: 1.5,
    speedBonus: 45,
    pausePenalty: 35,
    timeoutMultiplier: 0.4
  }
};
const MODE_TIMERS = {
  rx: 180,
  otc: 120,
  hospital: 240,
  oncology: 300,
  cosmetic: 120,
  emergency: 90,
  industry: 360,
  warehousing: 300
};
const MODE_LABEL = {
  rx: "Rx Cases",
  otc: "OTC Consultation",
  hospital: "Clinical",
  oncology: "Oncology",
  cosmetic: "Cosmetics",
  emergency: "Emergency",
  industry: "Industry",
  warehousing: "Warehousing"
};
function computeScore(i) {
  const difficulty = i.difficulty === "easy" || i.difficulty === "hard" || i.difficulty === "medium" ? i.difficulty : "medium";
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
async function fetchRandomCase(mode, difficulty) {
  let query = supabase.from("cases").select("*").eq("mode", mode);
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
async function submitScore(args) {
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
    errors_detail: args.errorsDetail ?? []
  });
  if (scoreErr) console.error(scoreErr);
  const { data: profile } = await supabase.from("profiles").select("xp, level, total_cases_completed").eq("user_id", args.userId).single();
  if (profile) {
    const newXp = (profile.xp ?? 0) + xpGain;
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
    const newTotal = (profile.total_cases_completed ?? 0) + 1;
    await supabase.from("profiles").update({
      xp: newXp,
      level: newLevel,
      total_cases_completed: newTotal
    }).eq("user_id", args.userId);
    if (newTotal === 1) awardBadge(args.userId, "First Case");
    if (newTotal === 10) awardBadge(args.userId, "Apprentice");
    if (newTotal === 25) awardBadge(args.userId, "Pharmacist");
    if (args.score >= 200) awardBadge(args.userId, "High Roller");
  }
  return { xpGain };
}
async function awardBadge(_userId, name, _description, _icon) {
  const { data, error } = await supabase.rpc("award_badge_if_earned", { _badge_name: name });
  if (!error && data === true) {
    toast.success(`🏅 Badge unlocked: ${name}`);
  }
}
async function bumpCounterBadge(userId, key, threshold, badge) {
  const k = `pv_${userId}_${key}`;
  const n = Number(localStorage.getItem(k) ?? "0") + 1;
  localStorage.setItem(k, String(n));
  if (n >= threshold) await awardBadge(userId, badge.name, badge.description, badge.icon);
}
function toastScore(delta, label) {
  if (delta >= 0) {
    toast.success(`+${delta} ${label}`, {
      className: "score-toast-correct"
    });
  } else {
    toast.error(`${delta} ${label}`, {
      className: "score-toast-wrong"
    });
  }
}
export {
  DIFFICULTY_LABEL as D,
  MODE_LABEL as M,
  MODE_TIMERS as a,
  bumpCounterBadge as b,
  computeScore as c,
  DIFFICULTY_RULES as d,
  awardBadge as e,
  fetchRandomCase as f,
  submitScore as s,
  toastScore as t
};
