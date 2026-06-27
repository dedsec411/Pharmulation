import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Flame, Trophy, Factory, Package, Hospital, FileText, Lightbulb, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pharmulation" }] }),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const MODE_META: Record<string, { icon: any; label: string; tag: string; color: string; to: string }> = {
  rx: { icon: FileText, label: "Community Pharmacy", tag: "Beginner-friendly", color: "from-teal-500/20 to-cyan-500/10", to: "/game/community" },
  hospital: { icon: Hospital, label: "Hospital Cases", tag: "Medium", color: "from-blue-500/20 to-indigo-500/10", to: "/game/hospital" },
  industry: { icon: Factory, label: "Industry / Production", tag: "Medium", color: "from-slate-500/20 to-zinc-500/10", to: "/game/industry" },
  warehousing: { icon: Package, label: "Warehousing", tag: "Medium", color: "from-orange-500/20 to-amber-500/10", to: "/game/warehousing" },
};

const MENTOR_TIPS = [
  "Always verify the patient's allergy status before dispensing antibiotics.",
  "Methotrexate is weekly, never daily. Read prescriptions out loud to catch errors.",
  "When in doubt, call the prescriber. Clarification prevents harm.",
  "Counsel one medicine at a time. Patients remember only a few key points.",
  "Cold chain breaks happen in seconds. Check the temperature log every time.",
  "FEFO isn't optional. First expired, first out—every single time.",
  "Look for drug interactions before adding a new medicine to the regimen.",
  "Never assume a handwritten prescription. Verify unclear orders immediately.",
  "Right patient, right drug, right dose, right route, right time—every case.",
  "Insulin is a high-alert medication. Double-check every dose before dispensing.",
  "A missed contraindication can be more dangerous than a missed diagnosis.",
  "Check renal and hepatic function before recommending dose adjustments.",
  "Store look-alike and sound-alike medicines separately to prevent mix-ups.",
  "Patient counseling is part of the treatment—not an optional extra.",
  "Always confirm the expiry date before dispensing or stocking medicines.",
  "Document every intervention. Good records protect both patients and pharmacists.",
  "Generic substitution is valuable, but only when clinically appropriate.",
  "If a medicine requires refrigeration, never leave it at room temperature unnecessarily.",
  "Quality begins with accurate inventory and proper storage conditions.",
  "The safest pharmacist is the one who never stops double-checking."
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

function MentorTipBanner({ tip }: { tip: string }) {
  const { displayed, done } = useTypewriter(tip, 25);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-primary/10"
      style={{ boxShadow: "0 0 40px -10px oklch(0.74 0.14 180 / 0.35), inset 0 0 60px -30px oklch(0.74 0.14 180 / 0.1)" }}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent 0%, oklch(0.74 0.14 180 / 0.15) 50%, transparent 100%)", animation: "ekg-scroll 4s linear infinite", backgroundSize: "200% 100%" }} />

      <div className="relative flex items-start gap-4 px-5 py-4">
        {/* Dr. Hakim avatar */}
        <div className="shrink-0 relative">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/30 to-cyan-500/20 border border-primary/40 grid place-items-center text-xl shadow-[0_0_16px_oklch(0.74_0.14_180/0.4)]">
            👨‍⚕️
          </div>
          {/* Online pulse */}
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Dr. Hakim · Mentor</span>
            <span className="text-[10px] text-muted-foreground">· tip of the day</span>
            <Lightbulb className="h-3 w-3 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed font-medium min-h-[1.4rem]">
            "{displayed}
            {!done && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}"
          </p>
        </div>

        {/* Decorative Rx watermark */}
        <div className="shrink-0 self-center font-serif text-4xl font-bold text-primary/10 select-none leading-none">
          ℞
        </div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const tip =
  MENTOR_TIPS[Math.floor(Math.random() * MENTOR_TIPS.length)];

  const { data: scores = [] } = useQuery({
    queryKey: ["recent-scores", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("scores").select("*").eq("user_id", userId)
        .order("completed_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["mode-counts", userId],
    queryFn: async () => {
      if (!userId) return {} as Record<string, number>;
      const { data } = await supabase.from("scores").select("mode").eq("user_id", userId);
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { c[r.mode] = (c[r.mode] ?? 0) + 1; });
      return c;
    },
    enabled: !!userId,
  });

  const { data: topPlayers = [] } = useQuery({
    queryKey: ["mini-lb"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profiles", { limit_count: 5 });
      return (data ?? []) as any[];
    },
  });

  const xpToNext = (profile?.level ?? 1) * 500;
  const xpPct = Math.min(100, ((profile?.xp ?? 0) / xpToNext) * 100);

  return (
    <>
      <Navbar />
      <OnboardingModal />
      <main className="mx-auto max-w-7xl px-6 py-6 space-y-5">

        {/* ── MENTOR TIP — top, first thing you see ── */}
        <MentorTipBanner tip={tip} />

        {/* ── PLAYER CARD + DAILY CHALLENGE ── */}
        <div className="grid lg:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 lg:col-span-2"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">
                {(profile?.full_name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold">{profile?.full_name ?? "Pharmacist"}</div>
                <div className="text-xs text-muted-foreground capitalize">{profile?.role} • Level {profile?.level}</div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-warning text-sm font-semibold">
                <Flame className="h-4 w-4" /> {profile?.streak_days ?? 0} day{profile?.streak_days === 1 ? "" : "s"}
              </div>
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{profile?.xp ?? 0} XP</span>
                <span>{xpToNext} XP to Lv {(profile?.level ?? 1) + 1}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-cyan-400"
                  initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-6 bg-gradient-to-br from-primary/15 to-transparent border-primary/30"
          >
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Daily Challenge</div>
            <div className="mt-2 text-lg font-bold">Today: Rx Case · Medium</div>
            <p className="mt-1 text-sm text-muted-foreground">2× XP for completing before midnight.</p>
            <Link to="/game/rx"
              className="mt-4 block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-105 transition text-center">
              Start challenge
            </Link>
          </motion.div>
        </div>

        {/* ── 4 MODES ── */}
        <section>
          <h2 className="text-lg font-bold mb-3">Pick your training mode</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(MODE_META).map(([key, m], i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`glass-card p-5 bg-gradient-to-br ${m.color} hover:border-primary/40 transition group`}
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center text-primary group-hover:scale-110 transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/10 px-2 py-1">{m.tag}</span>
                  </div>
                  <div className="mt-4 text-base font-bold">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{(counts as any)[key] ?? 0} cases completed</div>
                  <Link to={m.to as any}
                    className="mt-4 flex items-center justify-center gap-1 w-full rounded-full bg-primary/90 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary transition">
                    Play <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── RECENT + MINI LEADERBOARD ── */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="font-bold mb-3">Recent activity</h3>
            {scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cases yet. Pick a mode above to start training.</p>
            ) : (
              <ul className="divide-y divide-border">
                {scores.map((s: any) => (
                  <li key={s.id} className="flex justify-between py-3 text-sm">
                    <span className="capitalize">{s.mode}</span>
                    <span className="text-primary font-semibold">{s.score} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Top this week</h3>
            <ol className="space-y-2.5 text-sm">
              {topPlayers.length === 0 && <li className="text-muted-foreground text-xs">Be the first on the board.</li>}
              {topPlayers.map((p: any, i: number) => (
                <li key={p.user_id} className="flex items-center gap-3">
                  <span className={`h-6 w-6 grid place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-white/10"}`}>{i + 1}</span>
                  <span className="flex-1 truncate">{p.full_name ?? "Anonymous"}</span>
                  <span className="text-muted-foreground text-xs">{p.xp} XP</span>
                </li>
              ))}
            </ol>
            <Link to="/leaderboard" className="mt-4 block text-center text-xs text-primary hover:underline">
              View full leaderboard →
            </Link>
          </div>
        </div>

      </main>
    </>
  );
}