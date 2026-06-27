import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { tierFor } from "@/lib/levels";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — PharmaVerse" },
      { name: "description", content: "Top pharmacists on PharmaVerse." },
    ],
  }),
  component: LeaderboardPage,
});

const MODES = ["all", "rx", "otc", "hospital", "oncology", "cosmetic", "emergency", "industry", "warehousing"] as const;

function LeaderboardPage() {
  const { profile } = useAuthStore();
  const [scope, setScope] = useState<"weekly" | "alltime">("alltime");
  const [mode, setMode] = useState<(typeof MODES)[number]>("all");

  const { data: players = [], refetch } = useQuery({
    queryKey: ["leaderboard", scope, mode],
    queryFn: async () => {
      if (mode === "all") {
        const { data } = await supabase.rpc("get_public_profiles", { limit_count: 50 });
        return (data ?? []) as any[];
      }
      const sinceIso =
        scope === "weekly"
          ? new Date(Date.now() - 7 * 86400_000).toISOString()
          : new Date(0).toISOString();
      const { data: scores } = await supabase.rpc("get_public_scores", {
        mode_in: mode as any,
        since: sinceIso,
      });
      const agg = new Map<string, { score: number; cases: number; acc: number }>();
      ((scores ?? []) as any[]).forEach((s: any) => {
        const a = agg.get(s.user_id) ?? { score: 0, cases: 0, acc: 0 };
        a.score += s.score; a.cases += 1; a.acc += Number(s.accuracy);
        agg.set(s.user_id, a);
      });
      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.rpc("get_profiles_safe", { ids });
      return ((profs ?? []) as any[])
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6"><BackButton to="/dashboard" label="Dashboard" /></div>
      <div className="mt-3 flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-4xl font-extrabold flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" /> Leaderboard
        </h1>
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

      <div className="mt-4 flex gap-2 flex-wrap">
        {MODES.map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`text-xs rounded-full px-3 py-1.5 capitalize transition ${
              mode === m ? "bg-primary/20 text-primary border border-primary/40" : "glass text-muted-foreground"
            }`}>
            {m === "all" ? "All modes" : m}
          </button>
        ))}
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((idx) => {
            const p = top3[idx];
            if (!p) return <div key={idx} />;
            const height = idx === 0 ? "h-44" : idx === 1 ? "h-36" : "h-32";
            const color = idx === 0 ? "from-amber-400/40 to-amber-500/10" : idx === 1 ? "from-slate-300/30 to-slate-400/10" : "from-orange-600/30 to-orange-700/10";
            return (
              <motion.div key={p.user_id}
                initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}
                className={`glass-card bg-gradient-to-b ${color} p-5 ${height} text-center flex flex-col justify-end`}>
                {idx === 0 && <Crown className="h-6 w-6 text-amber-300 mx-auto mb-2" />}
                <div className="h-12 w-12 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
                  {(p.full_name || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="mt-2 font-bold text-sm truncate">{p.full_name || "Anonymous"}</div>
                <div className="text-xs text-muted-foreground">{tierFor(p.xp ?? 0).title}</div>
                <div className="text-primary font-bold mt-1">{p.xp} {mode === "all" ? "XP" : "pts"}</div>
                <div className="text-xs text-muted-foreground">#{idx + 1}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-6 glass-card divide-y divide-border">
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
                className={`flex items-center gap-4 p-4 ${isMe ? "bg-primary/10" : ""}`}>
                <div className="w-8 text-center text-muted-foreground font-bold">{rank}</div>
                <div className="h-9 w-9 rounded-full bg-primary/20 text-primary grid place-items-center font-bold">
                  {(p.full_name || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.full_name ?? "Anonymous"} {isMe && <span className="text-xs text-primary">(you)</span>}</div>
                  <div className="text-xs text-muted-foreground capitalize">{tierFor(p.xp ?? 0).title} · {p.total_cases_completed ?? 0} cases · {p.accuracy_rate ?? 0}% acc</div>
                </div>
                <div className="text-primary font-bold">{p.xp} {mode === "all" ? "XP" : "pts"}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {myRank && myRank > 20 && (
        <div className="mt-4 glass-card p-4 border-primary/40 flex items-center gap-4">
          <div className="w-8 text-center font-bold text-primary">{myRank}</div>
          <div className="flex-1 font-semibold">Your rank — {me?.full_name}</div>
          <div className="text-primary font-bold">{me?.xp} {mode === "all" ? "XP" : "pts"}</div>
        </div>
      )}
    </main>
  );
}
