import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy, Crown, Activity, MonitorDot, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { tierFor } from "@/lib/levels";
import { PUBLIC_MODE_GROUPS, type Mode } from "@/lib/game/shared";
import { BackButton } from "@/components/BackButton";
import { Navbar } from "@/components/Navbar";
import { unwrapList } from "@/lib/supabase-query";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard - Pharmulation" },
      { name: "description", content: "Top pharmacists on Pharmulation." },
    ],
  }),
  component: LeaderboardPage,
});

const FILTERS = [
  { key: "all", label: "All Modes", modes: [] },
  ...PUBLIC_MODE_GROUPS,
] as const satisfies readonly { key: string; label: string; modes: readonly Mode[] }[];

type LeaderboardFilter = (typeof FILTERS)[number]["key"];

function cleanPlayerName(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Anonymous";
  return raw
    .replace(/@.*/, "")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function playerInitial(value?: string | null) {
  return cleanPlayerName(value).slice(0, 1).toUpperCase();
}

function LeaderboardPage() {
  const { profile } = useAuthStore();
  const [scope, setScope] = useState<"weekly" | "alltime">("alltime");
  const [filter, setFilter] = useState<LeaderboardFilter>("all");
  const activeFilter = FILTERS.find((item) => item.key === filter) ?? FILTERS[0];

  const { data: players = [], refetch } = useQuery({
    queryKey: ["leaderboard", scope, filter],
    queryFn: async () => {
      if (filter === "all") {
        return unwrapList(
          await supabase.rpc("get_public_profiles", { limit_count: 50 }),
          "the leaderboard",
        ) as any[];
      }
      const sinceIso =
        scope === "weekly"
          ? new Date(Date.now() - 7 * 86400_000).toISOString()
          : new Date(0).toISOString();
      const scoreResults = await Promise.all(
        activeFilter.modes.map((mode) => supabase.rpc("get_public_scores", {
          mode_in: mode as any,
          since: sinceIso,
        }))
      );
      const scores = scoreResults.flatMap((result) => unwrapList(result, "leaderboard scores"));
      const agg = new Map<string, { score: number; cases: number; acc: number }>();
      ((scores ?? []) as any[]).forEach((s: any) => {
        const a = agg.get(s.user_id) ?? { score: 0, cases: 0, acc: 0 };
        a.score += s.score; a.cases += 1; a.acc += Number(s.accuracy);
        agg.set(s.user_id, a);
      });
      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [];
      const profs = unwrapList(
        await supabase.rpc("get_profiles_safe", { ids }),
        "leaderboard players",
      );
      return (profs as any[])
        .map((p: any) => {
          const a = agg.get(p.user_id)!;
          return { ...p, total_cases_completed: a.cases, accuracy_rate: Math.round((a.acc / a.cases) * 100), xp: a.score };
        })
        .sort((a, b) => b.xp - a.xp);
    },
  });

  // Realtime: refetch when profiles change
  useEffect(() => {
    const ch = supabase
      .channel("lb-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scores" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetch]);

  const me = players.find((p: any) => p.user_id === profile?.user_id);
  const myRank = me ? players.indexOf(me) + 1 : null;
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <>
    {profile && <Navbar />}
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6"><BackButton to={profile ? "/dashboard" : "/"} label={profile ? "Dashboard" : "Home"} /></div>
      <div className="mt-3 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <MonitorDot className="h-4 w-4" /> Pharmulation rankings board
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-extrabold">
            <Trophy className="h-8 w-8 text-primary" /> Leaderboard
          </h1>
        </div>
        <div className="flex gap-1 glass rounded-full p-1 text-sm">
          {(["weekly", "alltime"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-4 py-1.5 rounded-full transition ${
                scope === s ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
              }`}>
              {s === "weekly" ? "Weekly" : "All-time"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2 flex-wrap rounded-2xl border border-cyan-300/10 bg-black/20 p-2 shadow-inner">
        {FILTERS.map((item) => (
          <button key={item.key} onClick={() => setFilter(item.key)}
            className={`text-xs rounded-full px-3 py-1.5 transition ${
              filter === item.key ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_18px_-8px_oklch(0.74_0.14_180)]" : "bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.08]"
            }`}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-cyan-300/20 bg-black/35 p-4 shadow-[0_0_70px_-34px_oklch(0.74_0.14_180),inset_0_0_50px_-30px_oklch(0.74_0.14_180)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: "linear-gradient(oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.035) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="vital-monitor-scan pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-200/10 to-transparent" />
        <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-primary">
            <Activity className="h-4 w-4" /> Live standings
          </div>
          <div className="font-mono text-xs text-muted-foreground">{activeFilter.label} - {scope === "weekly" ? "7 day board" : "all time board"}</div>
        </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="relative mt-5 grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return <div key={idx} />;
            // min-h, not h: the step is a floor to sit on, not a ceiling to
            // clip against. Fixed heights were shorter than the avatar, name,
            // tier, score and rank stacked together, and `justify-end` pushed
            // the overflow up out of the card, so the name rendered over the
            // top border. A card now grows instead of spilling.
            const height = idx === 0 ? "min-h-64" : idx === 1 ? "min-h-56" : "min-h-52";
            const color = idx === 0 ? "from-amber-400/40 to-amber-500/10" : idx === 1 ? "from-slate-300/30 to-slate-400/10" : "from-orange-600/30 to-orange-700/10";
            return (
              <motion.div key={p.user_id}
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}
                className={`min-w-0 rounded-2xl border border-cyan-200/15 bg-gradient-to-b ${color} p-3 sm:p-5 ${height} text-center flex flex-col justify-end shadow-[0_22px_60px_-38px_oklch(0.74_0.14_180)]`}>
                {idx === 0 && <Crown className="h-6 w-6 text-amber-300 mx-auto mb-2" />}
                <div className="h-12 w-12 mx-auto rounded-xl border border-primary/35 bg-primary/15 text-primary grid place-items-center font-bold shadow-[0_0_20px_-8px_oklch(0.74_0.14_180)]">
                  {playerInitial(p.full_name)}
                </div>
                {/* Wraps rather than truncating: a cut-off name is exactly as
                    unreadable as a small one. line-clamp caps it at two lines so
                    an unusually long name cannot stretch the podium, and the
                    card's min-h lets it grow into that second line instead of
                    spilling over the border. Sized up only from `sm`: the grid
                    stays three-across on phones, where a card is ~110px wide. */}
                <div className={`mt-3 break-words font-black leading-tight line-clamp-2 ${
                  idx === 0 ? "text-lg sm:text-2xl" : "text-base sm:text-xl"
                }`}>
                  {cleanPlayerName(p.full_name)}
                </div>
                <div className="mt-1 truncate text-[11px] sm:text-xs text-muted-foreground">{tierFor(p.xp ?? 0).title}</div>
                <div className="mt-1.5 text-base sm:text-lg font-black text-primary">{p.xp} {filter === "all" ? "XP" : "pts"}</div>
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">#{idx + 1}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/55">
        {players.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No data for this filter yet. Be the first!</div>
        )}
        <AnimatePresence initial={false}>
          {rest.map((p: any, i: number) => {
            const rank = i + 4;
            const isMe = p.user_id === profile?.user_id;
            return (
              <motion.div key={p.user_id}
                layout
                initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className={`flex items-center gap-3 border-b border-cyan-300/10 p-3 sm:gap-4 sm:p-4 font-mono transition hover:bg-cyan-300/[0.04] ${isMe ? "bg-primary/10 shadow-[inset_4px_0_0_oklch(0.74_0.14_180)]" : ""}`}>
                <div className="w-10 shrink-0 rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] py-1 text-center text-xs font-black tabular-nums text-primary">{rank}</div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base sm:text-lg font-bold tracking-wide">{cleanPlayerName(p.full_name)} {isMe && <span className="text-xs text-primary">(you)</span>}</div>
                  <div className="truncate text-xs text-muted-foreground capitalize">{tierFor(p.xp ?? 0).title} · {p.total_cases_completed ?? 0} cases · {p.accuracy_rate ?? 0}% acc</div>
                </div>
                <div className="shrink-0 rounded-md bg-primary/10 px-3 py-1 text-right font-bold tabular-nums text-primary">{p.xp} {filter === "all" ? "XP" : "pts"}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      </section>

      {myRank && myRank > 20 && (
        <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-center gap-4 shadow-[0_0_35px_-22px_oklch(0.74_0.14_180)]">
          <div className="w-8 text-center font-bold text-primary">{myRank}</div>
          <div className="min-w-0 flex-1 truncate text-base sm:text-lg font-bold">Your rank - {cleanPlayerName(me?.full_name)}</div>
          <div className="shrink-0 font-bold tabular-nums text-primary">{me?.xp} {filter === "all" ? "XP" : "pts"}</div>
        </div>
      )}
    </main>
    </>
  );
}
