import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { u as useAuthStore } from "./router-eOdVVwBj.mjs";
import { t as tierFor } from "./levels-7qe6_GyK.mjs";
import { M as MODE_LABEL } from "./shared-C9rvXUiM.mjs";
import { B as BackButton } from "./BackButton-DOnk_vvq.mjs";
import "../_libs/sonner.mjs";
import { M as MonitorDot, T as Trophy, A as Activity, m as Crown, U as UserRound } from "../_libs/lucide-react.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const MODES = ["all", "rx", "otc", "hospital", "oncology", "cosmetic", "emergency", "industry", "warehousing"];
function LeaderboardPage() {
  const {
    profile
  } = useAuthStore();
  const [scope, setScope] = reactExports.useState("alltime");
  const [mode, setMode] = reactExports.useState("all");
  const {
    data: players = [],
    refetch
  } = useQuery({
    queryKey: ["leaderboard", scope, mode],
    queryFn: async () => {
      if (mode === "all") {
        const {
          data
        } = await supabase.rpc("get_public_profiles", {
          limit_count: 50
        });
        return data ?? [];
      }
      const sinceIso = scope === "weekly" ? new Date(Date.now() - 7 * 864e5).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString();
      const {
        data: scores
      } = await supabase.rpc("get_public_scores", {
        mode_in: mode,
        since: sinceIso
      });
      const agg = /* @__PURE__ */ new Map();
      (scores ?? []).forEach((s) => {
        const a = agg.get(s.user_id) ?? {
          score: 0,
          cases: 0,
          acc: 0
        };
        a.score += s.score;
        a.cases += 1;
        a.acc += Number(s.accuracy);
        agg.set(s.user_id, a);
      });
      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [];
      const {
        data: profs
      } = await supabase.rpc("get_profiles_safe", {
        ids
      });
      return (profs ?? []).map((p) => {
        const a = agg.get(p.user_id);
        return {
          ...p,
          total_cases_completed: a.cases,
          accuracy_rate: Math.round(a.acc / a.cases * 100),
          xp: a.score
        };
      }).sort((a, b) => b.xp - a.xp);
    }
  });
  reactExports.useEffect(() => {
    const ch = supabase.channel("lb-realtime").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "profiles"
    }, () => refetch()).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "scores"
    }, () => refetch()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);
  const me = players.find((p) => p.user_id === profile?.user_id);
  const myRank = me ? players.indexOf(me) + 1 : null;
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-5xl px-6 py-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BackButton, { to: profile ? "/dashboard" : "/" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-end justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MonitorDot, { className: "h-4 w-4" }),
          " Hospital rankings board"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "mt-2 flex items-center gap-3 text-4xl font-extrabold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "h-8 w-8 text-primary" }),
          " Leaderboard"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 glass rounded-full p-1 text-sm", children: ["weekly", "alltime"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setScope(s), className: `px-4 py-1.5 rounded-full transition ${scope === s ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`, children: s === "weekly" ? "Weekly" : "All-time" }, s)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 flex gap-2 flex-wrap rounded-2xl border border-cyan-300/10 bg-black/20 p-2 shadow-inner", children: MODES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setMode(m), className: `text-xs rounded-full px-3 py-1.5 capitalize transition ${mode === m ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_18px_-8px_oklch(0.74_0.14_180)]" : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"}`, children: m === "all" ? "All modes" : MODE_LABEL[m] ?? m }, m)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative mt-8 overflow-hidden rounded-3xl border border-cyan-300/20 bg-black/35 p-4 shadow-[0_0_70px_-34px_oklch(0.74_0.14_180),inset_0_0_50px_-30px_oklch(0.74_0.14_180)] backdrop-blur-xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 opacity-30", style: {
        backgroundImage: "linear-gradient(oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.035) 1px, transparent 1px)",
        backgroundSize: "18px 18px"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vital-monitor-scan pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-cyan-200/10 to-transparent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-primary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-4 w-4" }),
          " Live standings"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-mono text-xs text-muted-foreground", children: scope === "weekly" ? "7 day board" : "all time board" })
      ] }),
      top3.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mt-5 grid grid-cols-3 gap-3 items-end", children: [1, 0, 2].map((idx) => {
        const p = top3[idx];
        if (!p) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", {}, idx);
        const height = idx === 0 ? "h-44" : idx === 1 ? "h-36" : "h-32";
        const color = idx === 0 ? "from-amber-400/40 to-amber-500/10" : idx === 1 ? "from-slate-300/30 to-slate-400/10" : "from-orange-600/30 to-orange-700/10";
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          y: 30,
          opacity: 0
        }, animate: {
          y: 0,
          opacity: 1
        }, transition: {
          delay: idx * 0.1
        }, className: `rounded-2xl border border-cyan-200/15 bg-gradient-to-b ${color} p-5 ${height} text-center flex flex-col justify-end shadow-[0_22px_60px_-38px_oklch(0.74_0.14_180)]`, children: [
          idx === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Crown, { className: "h-6 w-6 text-amber-300 mx-auto mb-2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-12 w-12 mx-auto rounded-xl border border-primary/35 bg-primary/15 text-primary grid place-items-center font-bold shadow-[0_0_20px_-8px_oklch(0.74_0.14_180)]", children: (p.full_name || "U").slice(0, 1).toUpperCase() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 font-bold text-sm truncate", children: p.full_name || "Anonymous" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: tierFor(p.xp ?? 0).title }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-primary font-bold mt-1", children: [
            p.xp,
            " ",
            mode === "all" ? "XP" : "pts"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
            "#",
            idx + 1
          ] })
        ] }, p.user_id);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/55", children: [
        players.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-10 text-center text-muted-foreground", children: "No data for this filter yet. Be the first!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { initial: false, children: rest.map((p, i) => {
          const rank = i + 4;
          const isMe = p.user_id === profile?.user_id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { layout: true, initial: {
            y: -10,
            opacity: 0
          }, animate: {
            y: 0,
            opacity: 1
          }, className: `flex items-center gap-4 border-b border-cyan-300/10 p-4 font-mono transition hover:bg-cyan-300/[0.04] ${isMe ? "bg-primary/10 shadow-[inset_4px_0_0_oklch(0.74_0.14_180)]" : ""}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] py-1 text-center text-xs font-black text-primary", children: rank }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserRound, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "truncate font-semibold tracking-wide", children: [
                p.full_name ?? "Anonymous",
                " ",
                isMe && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-primary", children: "(you)" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground capitalize", children: [
                tierFor(p.xp ?? 0).title,
                " | ",
                p.total_cases_completed ?? 0,
                " cases | ",
                p.accuracy_rate ?? 0,
                "% acc"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md bg-primary/10 px-3 py-1 text-right font-bold text-primary", children: [
              p.xp,
              " ",
              mode === "all" ? "XP" : "pts"
            ] })
          ] }, p.user_id);
        }) })
      ] })
    ] }),
    myRank && myRank > 20 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-center gap-4 shadow-[0_0_35px_-22px_oklch(0.74_0.14_180)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 text-center font-bold text-primary", children: myRank }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 font-semibold", children: [
        "Your rank - ",
        me?.full_name
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-primary font-bold", children: [
        me?.xp,
        " ",
        mode === "all" ? "XP" : "pts"
      ] })
    ] })
  ] });
}
export {
  LeaderboardPage as component
};
