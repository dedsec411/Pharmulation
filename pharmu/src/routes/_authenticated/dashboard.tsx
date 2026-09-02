import { createFileRoute, Link } from "@tanstack/react-router";
import { WeeklyReportBanner } from "@/components/game/WeeklyReportBanner";
import { RecommendedCases } from "@/components/game/RecommendedCases";
import { AssignedWork } from "@/components/game/AssignedWork";
import { useWeaknessMap, useWeeklyTotals } from "@/lib/game/useWeaknessMap";
import { hasEnoughHistory } from "@/lib/game/weakness";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CalendarDays, Flame, Trophy, Factory, Package, Hospital, FileText, Lightbulb, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";
import { supabase } from "@/integrations/supabase/client";
import { publicModeCount, publicModeLabel } from "@/lib/game/shared";
import { unwrapList } from "@/lib/supabase-query";
import { ModeAmbientLayer } from "@/components/game/ModeAmbientLayer";
import { MENTOR_IMAGE } from "@/lib/mentor";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Pharmulation" }] }),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const MODE_META: Record<string, { icon: any; label: string; tag: string; accent: string; ink: string; glow: string; tint: string; to: string; modes: readonly string[] }> = {
  rx: {
    icon: FileText,
    label: "Community Pharmacy",
    tag: "Beginner-friendly",
    accent: "oklch(0.74 0.14 180)",
    ink: "oklch(0.48 0.12 180)",
    glow: "oklch(0.74 0.14 180 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.74 0.14 180 / 0.24), oklch(0.72 0.16 165 / 0.1) 48%, rgb(var(--hairline) / calc(0.045 * var(--hairline-boost, 1))))",
    to: "/game/community",
    modes: ["rx", "otc"],
  },
  hospital: {
    icon: Hospital,
    label: "Clinical",
    tag: "Medium",
    accent: "oklch(0.60 0.20 270)",
    ink: "oklch(0.45 0.18 270)",
    glow: "oklch(0.60 0.20 270 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.62 0.19 240 / 0.22), oklch(0.60 0.20 270 / 0.16) 50%, rgb(var(--hairline) / calc(0.04 * var(--hairline-boost, 1))))",
    to: "/game/hospital",
    modes: ["hospital"],
  },
  industry: {
    icon: Factory,
    label: "Industry",
    tag: "Medium",
    accent: "oklch(0.78 0.16 75)",
    ink: "oklch(0.50 0.13 70)",
    glow: "oklch(0.78 0.16 75 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.25), oklch(0.70 0.14 55 / 0.12) 52%, rgb(var(--hairline) / calc(0.04 * var(--hairline-boost, 1))))",
    to: "/game/industry",
    modes: ["industry"],
  },
  warehousing: {
    icon: Package,
    label: "Warehousing",
    tag: "Medium",
    accent: "oklch(0.60 0.18 220)",
    ink: "oklch(0.45 0.15 220)",
    glow: "oklch(0.60 0.18 220 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.60 0.18 220 / 0.25), oklch(0.72 0.13 210 / 0.12) 52%, rgb(var(--hairline) / calc(0.04 * var(--hairline-boost, 1))))",
    to: "/game/warehousing",
    modes: ["warehousing"],
  },
};

const MENTOR_TIPS = [
  "Always verify the patient's allergy status before dispensing antibiotics.",
  "Methotrexate is weekly, never daily. Read prescriptions out loud to catch errors.",
  "When in doubt, call the prescriber. Clarification prevents harm.",
  "Counsel one medicine at a time. Patients remember only a few key points.",
  "Cold chain breaks happen in seconds. Check the temperature log every time.",
  "FEFO isn't optional. First expired, first out - every single time.",
  "Look for drug interactions before adding a new medicine to the regimen.",
  "Never assume a handwritten prescription. Verify unclear orders immediately.",
  "Right patient, right drug, right dose, right route, right time - every case.",
  "Insulin is a high-alert medication. Double-check every dose before dispensing.",
  "A missed contraindication can be more dangerous than a missed diagnosis.",
  "Check renal and hepatic function before recommending dose adjustments.",
  "Store look-alike and sound-alike medicines separately to prevent mix-ups.",
  "Patient counseling is part of the treatment - not an optional extra.",
  "Always confirm the expiry date before dispensing or stocking medicines.",
  "Document every intervention. Good records protect both patients and pharmacists.",
  "Generic substitution is valuable, but only when clinically appropriate.",
  "If a medicine requires refrigeration, never leave it at room temperature unnecessarily.",
  "Quality begins with accurate inventory and proper storage conditions.",
  "The safest pharmacist is the one who never stops double-checking."
];
const DASHBOARD_CARD_HOVER = {
  y: -6,
  scale: 1.012,
  boxShadow: "0 22px 55px -30px oklch(0.74 0.14 180 / 0.82)",
};
const DAILY_CHALLENGES = [
  { label: "Rx Case", mode: "rx", difficulty: "Medium", to: "/game/community", bonus: "2x XP" },
  { label: "Clinical Review", mode: "hospital", difficulty: "Hard", to: "/game/hospital", bonus: "2x XP" },
  { label: "Industry Batch", mode: "industry", difficulty: "Medium", to: "/game/industry", bonus: "1.5x XP" },
  { label: "Warehouse Audit", mode: "warehousing", difficulty: "Medium", to: "/game/warehousing", bonus: "1.5x XP" },
];

// Typewriter hook
function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { displayed, done };
}

function dayOfYear(date: Date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86400000);
}

function formatActivityDate(value?: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function activityMeta(mode: string) {
  if (mode === "community" || mode === "rx" || mode === "otc") return MODE_META.rx;
  if (mode === "hospital" || mode === "clinical") return MODE_META.hospital;
  if (mode === "industry") return MODE_META.industry;
  if (mode === "warehousing") return MODE_META.warehousing;
  return { ...MODE_META.rx, icon: FileText, label: publicModeLabel(mode) };
}

function cleanPlayerName(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Pharmacist";
  return raw
    .replace(/@.*/, "")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function MentorTipBanner({ tip }: { tip: string }) {
  const { displayed, done } = useTypewriter(tip, 25);
  return (
    <motion.div
      initial={{ opacity: 0, x: -42, y: -4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      whileHover={DASHBOARD_CARD_HOVER}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-primary/10"
      style={{ boxShadow: "0 0 40px -10px oklch(0.74 0.14 180 / 0.35), inset 0 0 60px -30px oklch(0.74 0.14 180 / 0.1)" }}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, oklch(0.74 0.14 180 / 0.15) 50%, transparent 100%)", animation: "ekg-scroll 4s linear infinite", backgroundSize: "200% 100%" }} />

      <div className="relative flex items-start gap-5 px-6 py-5">
        {/* Dr. Hakim avatar */}
        <div className="shrink-0 relative">
          <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-primary/40 bg-background/55 text-transparent shadow-[0_0_18px_oklch(0.74_0.14_180/0.35)]">
            <motion.img
              src={MENTOR_IMAGE}
              alt=""
              className="absolute inset-x-0 top-0 mx-auto h-16 w-14 object-contain object-top"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          {/* Online pulse */}
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">PAGER</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Dr. Hakim</span>
            <span className="text-[10px] text-muted-foreground">tip of the day</span>
            <Lightbulb className="h-3 w-3 text-primary animate-pulse" />
          </div>
          <p className="min-h-[2.1rem] text-base font-semibold leading-relaxed text-foreground/95 sm:text-lg lg:text-xl">
            "{displayed}
            {!done && <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle sm:h-6" />}"
          </p>
        </div>

        {/* Decorative Rx watermark */}
        <motion.img
          src={MENTOR_IMAGE}
          alt=""
          aria-hidden="true"
          className="pointer-events-none hidden h-24 w-20 shrink-0 self-end object-contain object-bottom opacity-80 drop-shadow-[0_14px_24px_rgba(0,0,0,0.28)] sm:block"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="hidden shrink-0 self-center font-serif text-4xl font-bold text-primary/10 select-none leading-none">
          Rx
        </div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { profile } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const userId = profile?.user_id;
  const { data: weaknessMap } = useWeaknessMap(userId);
  const { data: weekly } = useWeeklyTotals(userId);
  const tip =
  MENTOR_TIPS[Math.floor(Math.random() * MENTOR_TIPS.length)];

  const { data: scores = [] } = useQuery({
    queryKey: ["recent-scores", userId],
    queryFn: async () => {
      if (!userId) return [];
      return unwrapList(
        await supabase
          .from("scores").select("*").eq("user_id", userId)
          .order("completed_at", { ascending: false }).limit(5),
        "your recent activity",
      );
    },
    enabled: !!userId,
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["mode-counts", userId],
    queryFn: async () => {
      if (!userId) return {} as Record<string, number>;
      const data = unwrapList(
        await supabase.from("scores").select("mode").eq("user_id", userId),
        "your progress",
      );
      const c: Record<string, number> = {};
      data.forEach((r: any) => { c[r.mode] = (c[r.mode] ?? 0) + 1; });
      return c;
    },
    enabled: !!userId,
  });

  const { data: topPlayers = [] } = useQuery({
    queryKey: ["mini-lb"],
    queryFn: async () => unwrapList(
      await supabase.rpc("get_public_profiles", { limit_count: 5 }),
      "the leaderboard",
    ) as any[],
  });

  const xpToNext = (profile?.level ?? 1) * 500;
  const currentXp = profile?.xp ?? 0;
  const xpPct = Math.min(100, (currentXp / xpToNext) * 100);
  const dailyChallenge = DAILY_CHALLENGES[dayOfYear(new Date()) % DAILY_CHALLENGES.length];
  const dailyMeta = activityMeta(dailyChallenge.mode);
  const DailyIcon = dailyMeta.icon;
  const playerName = cleanPlayerName(profile?.full_name ?? profile?.email);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-5">

        {/* MENTOR TIP - top, first thing you see */}
        <MentorTipBanner tip={tip} />

        {/* PLAYER CARD + DAILY CHALLENGE */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            whileHover={DASHBOARD_CARD_HOVER}
            whileTap={{ scale: 0.99 }}
            className="glass-card p-6 lg:col-span-2 transition duration-300 hover:border-primary/40"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
                {playerName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold">{playerName}</div>
                <div className="text-xs text-muted-foreground capitalize">{profile?.role} | Level {profile?.level}</div>
              </div>
              <motion.div
                className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/15 px-4 py-2 text-warning shadow-[0_12px_30px_-18px_oklch(0.78_0.16_75/0.9)]"
                animate={{ boxShadow: ["0 12px 30px -18px oklch(0.78 0.16 75 / 0.75)", "0 14px 36px -16px oklch(0.78 0.16 75 / 1)", "0 12px 30px -18px oklch(0.78 0.16 75 / 0.75)"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame className="h-6 w-6 drop-shadow-[0_0_10px_oklch(0.78_0.16_75/0.75)]" />
                <span className="text-base font-black">{profile?.streak_days ?? 0}</span>
                <span className="text-xs font-bold uppercase tracking-wider">day{profile?.streak_days === 1 ? "" : "s"}</span>
              </motion.div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">XP dose meter</p>
                  <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground">{currentXp} / {xpToNext} XP</p>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-[0_10px_24px_-18px_oklch(0.74_0.14_180/0.9)]">
                  {Math.round(xpPct)}%
                </span>
              </div>
              <div className="relative h-7 overflow-hidden rounded-lg border border-foreground/10 bg-slate-900/[0.04] dark:bg-black/25 shadow-inner">
                <div className="absolute inset-x-2 top-1 flex justify-between">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className={`w-px rounded-full bg-foreground/35 ${i % 5 === 0 ? "h-5" : "h-3"}`} />
                  ))}
                </div>
                <motion.div
                  className="relative h-full overflow-hidden rounded-lg bg-gradient-to-r from-primary via-cyan-300 to-emerald-300 shadow-[0_0_24px_oklch(0.74_0.14_180/0.55)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-y-0 w-20 -skew-x-12 bg-foreground/35 blur-sm"
                    initial={{ x: "-120%" }}
                    animate={{ x: ["-120%", "260%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
                  />
                </motion.div>
                <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-foreground/20 to-transparent" />
                <div className="pointer-events-none absolute inset-x-2 bottom-0.5 flex justify-between font-mono text-[8px] font-bold tabular-nums text-slate-900/45 dark:text-white/45">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            whileHover={DASHBOARD_CARD_HOVER}
            whileTap={{ scale: 0.99 }}
            className="glass-card p-6 bg-gradient-to-br from-primary/15 to-transparent border-primary/30 transition duration-300 hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">Daily Challenge</div>
                <div className="mt-2 text-lg font-bold">Today: {dailyChallenge.label} · {dailyChallenge.difficulty}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <DailyIcon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{dailyChallenge.bonus} for completing before midnight.</p>
            <Link to={dailyChallenge.to as any}
              className="mt-4 block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-105 transition text-center">
              Start challenge
            </Link>
          </motion.div>
        </div>

        <WeeklyReportBanner
          userId={userId}
          map={weaknessMap ?? null}
          level={profile?.level ?? 1}
          xp={profile?.xp ?? 0}
          xpToNextLevel={Math.max(0, ((profile?.level ?? 1) + 1) * 500 - (profile?.xp ?? 0))}
          casesThisWeek={weekly?.casesThisWeek ?? 0}
          casesLastWeek={weekly?.casesLastWeek ?? 0}
          accuracyThisWeek={weekly?.accuracyThisWeek ?? null}
          accuracyLastWeek={weekly?.accuracyLastWeek ?? null}
        />

        {/* Renders nothing unless a lecturer has set this student work. */}
        <AssignedWork userId={userId} />

        {weaknessMap && hasEnoughHistory(weaknessMap) && (
          <RecommendedCases map={weaknessMap} />
        )}

        {/* 4 MODES */}
        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-bold">Pick your training mode</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each session is timed · Earn XP · Unlock badges</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(MODE_META).map(([key, m], i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -8, scale: 1.025 }}
                  whileTap={{ scale: 0.985 }}
                  className="group relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur-xl transition duration-300"
                  style={{
                    background: m.tint,
                    borderColor: "rgb(var(--hairline) / calc(0.12 * var(--hairline-boost, 1)))",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = m.accent;
                    event.currentTarget.style.boxShadow = `0 22px 55px -28px ${m.glow}`;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = "rgb(var(--hairline) / calc(0.12 * var(--hairline-boost, 1)))";
                    event.currentTarget.style.boxShadow = "";
                  }}
                >
                  <ModeAmbientLayer mode={key} intensity="card" />
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                    style={{ background: `linear-gradient(135deg, transparent 0%, ${m.glow.replace("0.9", "0.16")} 45%, transparent 75%)` }} />
                  <div className="relative flex items-start justify-between">
                    <div
                      className="relative grid h-10 w-10 place-items-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:rotate-3"
                      style={{ backgroundColor: m.glow.replace("0.9", "0.15"), color: theme === "light" ? m.ink : m.accent }}
                    >
                      <Icon className="h-5 w-5 transition duration-300 group-hover:-translate-y-0.5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-foreground/10 px-2 py-1">{m.tag}</span>
                  </div>
                  <div className="relative mt-4 text-base font-bold transition duration-300 group-hover:brightness-125" style={{ color: theme === "light" ? m.ink : m.accent }}>{m.label}</div>
                  <div className="relative text-xs text-muted-foreground mt-0.5">{publicModeCount(counts as Record<string, number>, m.modes)} cases completed</div>
                  <Link to={m.to as any}
                    className="relative mt-4 flex items-center justify-center gap-1 w-full rounded-full py-2 text-center text-sm font-semibold text-background transition duration-300 hover:brightness-110"
                    style={{ backgroundColor: theme === "light" ? m.ink : m.accent, boxShadow: `0 12px 28px -18px ${m.glow}` }}>
                    Play <ChevronRight className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* RECENT + MINI LEADERBOARD */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={DASHBOARD_CARD_HOVER}
            whileTap={{ scale: 0.99 }}
            className="glass-card p-6 lg:col-span-2 transition duration-300 hover:border-primary/40"
          >
            <h3 className="font-bold mb-3">Recent activity</h3>
            {scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases yet. Pick a mode above to start training.</p>
            ) : (
              <ul className="space-y-2">
                {scores.map((s: any) => {
                  const meta = activityMeta(s.mode);
                  const ActivityIcon = meta.icon;
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border/35 bg-foreground/[0.03] px-3 py-2.5 text-sm transition hover:border-primary/30 hover:bg-primary/5">
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                        style={{ backgroundColor: meta.glow.replace("0.9", "0.14"), color: theme === "light" ? meta.ink : meta.accent }}
                      >
                        <ActivityIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{meta.label}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatActivityDate(s.completed_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{s.score} pts</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            whileHover={{
              y: -6,
              scale: 1.012,
              boxShadow: "0 26px 70px -36px oklch(0.74 0.14 180 / 0.95)",
            }}
            whileTap={{ scale: 0.99 }}
            className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-white/70 dark:bg-slate-950/55 p-5 shadow-[0_24px_80px_-54px_oklch(0.74_0.14_180/0.85)] backdrop-blur-xl transition duration-300 hover:border-primary/45"
          >
            <div className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, oklch(0.74 0.14 180 / 0.12) 50%, transparent 100%)",
                animation: "ekg-scroll 5.5s linear infinite",
                backgroundSize: "220% 100%",
              }} />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(var(--hairline)/calc(0.055*var(--hairline-boost,1)))_1px,transparent_1px)] bg-[length:100%_9px] opacity-25" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/12 blur-3xl transition duration-300 group-hover:bg-primary/18" />

            <div className="relative mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Pharmulation rankings board</p>
                <h3 className="mt-1 flex items-center gap-2 text-lg font-black">
                  <Trophy className="h-5 w-5 text-primary drop-shadow-[0_0_12px_oklch(0.74_0.14_180/0.75)]" />
                  Top this week
                </h3>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                live
              </span>
            </div>

            <ol className="relative space-y-2.5 text-sm">
              {topPlayers.length === 0 && (
                <li className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center text-xs text-muted-foreground">
                  Be the first on the board.
                </li>
              )}
              {topPlayers.map((p: any, i: number) => {
                const podium =
                  i === 0
                    ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_26px_-14px_oklch(0.74_0.14_180/0.9)]"
                    : i === 1
                      ? "border-sky-300/35 bg-sky-300/10 text-sky-700 dark:text-sky-200"
                      : i === 2
                        ? "border-amber-300/35 bg-amber-300/10 text-amber-700 dark:text-amber-200"
                        : "border-foreground/10 bg-foreground/[0.045] text-muted-foreground";
                return (
                  <motion.li
                    key={p.user_id}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.045 }}
                    className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-foreground/10 bg-slate-900/[0.035] dark:bg-black/20 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/7"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-xs font-black ${podium}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{cleanPlayerName(p.full_name)}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">pharmacist rank</p>
                    </div>
                    <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs font-black tabular-nums text-primary shadow-inner">
                      {p.xp} XP
                    </span>
                  </motion.li>
                );
              })}
            </ol>
            <Link to="/leaderboard" className="relative mt-4 flex items-center justify-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-center text-xs font-bold text-primary transition hover:border-primary/45 hover:bg-primary/15">
              View full leaderboard <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>

      </main>
    </>
  );
}
