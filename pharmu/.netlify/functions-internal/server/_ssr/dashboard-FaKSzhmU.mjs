import { j as jsxRuntimeExports, r as reactExports } from "../_libs/react.mjs";
import { L as Link } from "../_libs/tanstack__react-router.mjs";
import { u as useQuery } from "../_libs/tanstack__react-query.mjs";
import { N as Navbar } from "./Navbar-D4E1Vk0o.mjs";
import { u as useAuthStore } from "./router-Dzpdnv47.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { M as MODE_LABEL } from "./shared-CP2LLHvv.mjs";
import { M as ModeAmbientLayer } from "./ModeAmbientLayer-B2Acv9Tx.mjs";
import "../_libs/sonner.mjs";
import "../_libs/seroval.mjs";
import { m as motion } from "../_libs/framer-motion.mjs";
import { r as Flame, j as Package, F as Factory, t as Hospital, x as FileText, b as ChevronRight, y as CalendarDays, T as Trophy, z as Lightbulb } from "../_libs/lucide-react.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "./vendor-tanstack-MYXmXOno.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/zustand.mjs";
import "../_libs/zod.mjs";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const MODE_META = {
  rx: {
    icon: FileText,
    label: "Community Pharmacy",
    tag: "Beginner-friendly",
    accent: "oklch(0.74 0.14 180)",
    glow: "oklch(0.74 0.14 180 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.74 0.14 180 / 0.24), oklch(0.72 0.16 165 / 0.1) 48%, oklch(1 0 0 / 0.045))",
    to: "/game/community"
  },
  hospital: {
    icon: Hospital,
    label: "Clinical",
    tag: "Medium",
    accent: "oklch(0.60 0.20 270)",
    glow: "oklch(0.60 0.20 270 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.62 0.19 240 / 0.22), oklch(0.60 0.20 270 / 0.16) 50%, oklch(1 0 0 / 0.04))",
    to: "/game/hospital"
  },
  industry: {
    icon: Factory,
    label: "Industry",
    tag: "Medium",
    accent: "oklch(0.78 0.16 75)",
    glow: "oklch(0.78 0.16 75 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.78 0.16 75 / 0.25), oklch(0.70 0.14 55 / 0.12) 52%, oklch(1 0 0 / 0.04))",
    to: "/game/industry"
  },
  warehousing: {
    icon: Package,
    label: "Warehousing",
    tag: "Medium",
    accent: "oklch(0.60 0.18 220)",
    glow: "oklch(0.60 0.18 220 / 0.9)",
    tint: "linear-gradient(135deg, oklch(0.60 0.18 220 / 0.25), oklch(0.72 0.13 210 / 0.12) 52%, oklch(1 0 0 / 0.04))",
    to: "/game/warehousing"
  }
};
const MENTOR_TIPS = ["Always verify the patient's allergy status before dispensing antibiotics.", "Methotrexate is weekly, never daily. Read prescriptions out loud to catch errors.", "When in doubt, call the prescriber. Clarification prevents harm.", "Counsel one medicine at a time. Patients remember only a few key points.", "Cold chain breaks happen in seconds. Check the temperature log every time.", "FEFO isn't optional. First expired, first out - every single time.", "Look for drug interactions before adding a new medicine to the regimen.", "Never assume a handwritten prescription. Verify unclear orders immediately.", "Right patient, right drug, right dose, right route, right time - every case.", "Insulin is a high-alert medication. Double-check every dose before dispensing.", "A missed contraindication can be more dangerous than a missed diagnosis.", "Check renal and hepatic function before recommending dose adjustments.", "Store look-alike and sound-alike medicines separately to prevent mix-ups.", "Patient counseling is part of the treatment - not an optional extra.", "Always confirm the expiry date before dispensing or stocking medicines.", "Document every intervention. Good records protect both patients and pharmacists.", "Generic substitution is valuable, but only when clinically appropriate.", "If a medicine requires refrigeration, never leave it at room temperature unnecessarily.", "Quality begins with accurate inventory and proper storage conditions.", "The safest pharmacist is the one who never stops double-checking."];
const DOCTOR_IMAGE = "/doctor-mentor.png";
const DASHBOARD_CARD_HOVER = {
  y: -6,
  scale: 1.012,
  boxShadow: "0 22px 55px -30px oklch(0.74 0.14 180 / 0.82)"
};
const DAILY_CHALLENGES = [{
  label: "Rx Case",
  mode: "rx",
  difficulty: "Medium",
  to: "/game/community",
  bonus: "2x XP"
}, {
  label: "Clinical Review",
  mode: "hospital",
  difficulty: "Hard",
  to: "/game/hospital",
  bonus: "2x XP"
}, {
  label: "Industry Batch",
  mode: "industry",
  difficulty: "Medium",
  to: "/game/industry",
  bonus: "1.5x XP"
}, {
  label: "Warehouse Audit",
  mode: "warehousing",
  difficulty: "Medium",
  to: "/game/warehousing",
  bonus: "1.5x XP"
}];
function useTypewriter(text, speed = 28) {
  const [displayed, setDisplayed] = reactExports.useState("");
  const [done, setDone] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return {
    displayed,
    done
  };
}
function dayOfYear(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 864e5);
}
function formatActivityDate(value) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
function activityMeta(mode) {
  if (mode === "community" || mode === "rx" || mode === "otc") return MODE_META.rx;
  if (mode === "hospital" || mode === "clinical") return MODE_META.hospital;
  if (mode === "industry") return MODE_META.industry;
  if (mode === "warehousing") return MODE_META.warehousing;
  return {
    ...MODE_META.rx,
    icon: FileText,
    label: MODE_LABEL[mode] ?? mode
  };
}
function MentorTipBanner({
  tip
}) {
  const {
    displayed,
    done
  } = useTypewriter(tip, 25);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
    opacity: 0,
    x: -42,
    y: -4
  }, animate: {
    opacity: 1,
    x: 0,
    y: 0
  }, whileHover: DASHBOARD_CARD_HOVER, transition: {
    type: "spring",
    stiffness: 260,
    damping: 24
  }, className: "relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-primary/10", style: {
    boxShadow: "0 0 40px -10px oklch(0.74 0.14 180 / 0.35), inset 0 0 60px -30px oklch(0.74 0.14 180 / 0.1)"
  }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 rounded-2xl pointer-events-none", style: {
      background: "linear-gradient(90deg, transparent 0%, oklch(0.74 0.14 180 / 0.15) 50%, transparent 100%)",
      animation: "ekg-scroll 4s linear infinite",
      backgroundSize: "200% 100%"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-start gap-5 px-6 py-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-primary/40 bg-background/55 text-transparent shadow-[0_0_18px_oklch(0.74_0.14_180/0.35)]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(motion.img, { src: DOCTOR_IMAGE, alt: "", className: "absolute inset-x-0 top-0 mx-auto h-16 w-14 object-contain object-top", animate: {
          y: [0, -2, 0]
        }, transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-background animate-pulse" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary", children: "PAGER" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-widest text-primary", children: "Dr. Hakim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: "tip of the day" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lightbulb, { className: "h-3 w-3 text-primary animate-pulse" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "min-h-[2.1rem] text-base font-semibold leading-relaxed text-foreground/95 sm:text-lg lg:text-xl", children: [
          '"',
          displayed,
          !done && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle sm:h-6" }),
          '"'
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(motion.img, { src: DOCTOR_IMAGE, alt: "", "aria-hidden": "true", className: "pointer-events-none hidden h-24 w-20 shrink-0 self-end object-contain object-bottom opacity-80 drop-shadow-[0_14px_24px_rgba(0,0,0,0.28)] sm:block", animate: {
        y: [0, -4, 0]
      }, transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden shrink-0 self-center font-serif text-4xl font-bold text-primary/10 select-none leading-none", children: "Rx" })
    ] })
  ] });
}
function Dashboard() {
  const {
    profile
  } = useAuthStore();
  const userId = profile?.user_id;
  const tip = MENTOR_TIPS[Math.floor(Math.random() * MENTOR_TIPS.length)];
  const {
    data: scores = []
  } = useQuery({
    queryKey: ["recent-scores", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from("scores").select("*").eq("user_id", userId).order("completed_at", {
        ascending: false
      }).limit(5);
      return data ?? [];
    },
    enabled: !!userId
  });
  const {
    data: counts = {}
  } = useQuery({
    queryKey: ["mode-counts", userId],
    queryFn: async () => {
      if (!userId) return {};
      const {
        data
      } = await supabase.from("scores").select("mode").eq("user_id", userId);
      const c = {};
      (data ?? []).forEach((r) => {
        c[r.mode] = (c[r.mode] ?? 0) + 1;
      });
      return c;
    },
    enabled: !!userId
  });
  const {
    data: topPlayers = []
  } = useQuery({
    queryKey: ["mini-lb"],
    queryFn: async () => {
      const {
        data
      } = await supabase.rpc("get_public_profiles", {
        limit_count: 5
      });
      return data ?? [];
    }
  });
  const xpToNext = (profile?.level ?? 1) * 500;
  const currentXp = profile?.xp ?? 0;
  const xpPct = Math.min(100, currentXp / xpToNext * 100);
  const dailyChallenge = DAILY_CHALLENGES[dayOfYear(/* @__PURE__ */ new Date()) % DAILY_CHALLENGES.length];
  const dailyMeta = activityMeta(dailyChallenge.mode);
  const DailyIcon = dailyMeta.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Navbar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "mx-auto max-w-7xl px-6 py-6 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(MentorTipBanner, { tip }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-3 gap-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          opacity: 0,
          y: 10
        }, animate: {
          opacity: 1,
          y: 0
        }, whileHover: DASHBOARD_CARD_HOVER, whileTap: {
          scale: 0.99
        }, className: "glass-card p-6 lg:col-span-2 transition duration-300 hover:border-primary/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-2xl font-bold", children: (profile?.full_name || "U").slice(0, 1).toUpperCase() }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-bold", children: profile?.full_name ?? "Pharmacist" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground capitalize", children: [
                profile?.role,
                " | Level ",
                profile?.level
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { className: "flex items-center gap-2 rounded-full border border-warning/30 bg-warning/15 px-4 py-2 text-warning shadow-[0_12px_30px_-18px_oklch(0.78_0.16_75/0.9)]", animate: {
              boxShadow: ["0 12px 30px -18px oklch(0.78 0.16 75 / 0.75)", "0 14px 36px -16px oklch(0.78 0.16 75 / 1)", "0 12px 30px -18px oklch(0.78 0.16 75 / 0.75)"]
            }, transition: {
              duration: 2.6,
              repeat: Infinity,
              ease: "easeInOut"
            }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-6 w-6 drop-shadow-[0_0_10px_oklch(0.78_0.16_75/0.75)]" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-black", children: profile?.streak_days ?? 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold uppercase tracking-wider", children: [
                "day",
                profile?.streak_days === 1 ? "" : "s"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-semibold uppercase tracking-wider text-primary", children: "XP dose meter" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 font-mono text-sm font-bold tabular-nums text-foreground", children: [
                  currentXp,
                  " / ",
                  xpToNext,
                  " XP"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-[0_10px_24px_-18px_oklch(0.74_0.14_180/0.9)]", children: [
                Math.round(xpPct),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative h-7 overflow-hidden rounded-lg border border-white/10 bg-black/25 shadow-inner", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-x-2 top-1 flex justify-between", children: Array.from({
                length: 11
              }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `w-px rounded-full bg-white/35 ${i % 5 === 0 ? "h-5" : "h-3"}` }, i)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { className: "relative h-full overflow-hidden rounded-lg bg-gradient-to-r from-primary via-cyan-300 to-emerald-300 shadow-[0_0_24px_oklch(0.74_0.14_180/0.55)]", initial: {
                width: 0
              }, animate: {
                width: `${xpPct}%`
              }, transition: {
                duration: 0.9,
                ease: "easeOut"
              }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(motion.div, { className: "absolute inset-y-0 w-20 -skew-x-12 bg-white/35 blur-sm", initial: {
                x: "-120%"
              }, animate: {
                x: ["-120%", "260%"]
              }, transition: {
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: "easeInOut"
              } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-white/20 to-transparent" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pointer-events-none absolute inset-x-2 bottom-0.5 flex justify-between font-mono text-[8px] font-bold tabular-nums text-white/45", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "25" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "50" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "75" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "100" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          opacity: 0,
          y: 10
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          delay: 0.1
        }, whileHover: DASHBOARD_CARD_HOVER, whileTap: {
          scale: 0.99
        }, className: "glass-card p-6 bg-gradient-to-br from-primary/15 to-transparent border-primary/30 transition duration-300 hover:border-primary/50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold text-primary uppercase tracking-wider", children: "Daily Challenge" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 text-lg font-bold", children: [
                "Today: ",
                dailyChallenge.label,
                " · ",
                dailyChallenge.difficulty
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DailyIcon, { className: "h-5 w-5" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-sm text-muted-foreground", children: [
            dailyChallenge.bonus,
            " for completing before midnight."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: dailyChallenge.to, className: "mt-4 block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:scale-105 transition text-center", children: "Start challenge" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-bold", children: "Pick your training mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Each session is timed · Earn XP · Unlock badges" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-4 gap-4", children: Object.entries(MODE_META).map(([key, m], i) => {
          const Icon = m.icon;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
            opacity: 0,
            y: 10
          }, animate: {
            opacity: 1,
            y: 0
          }, transition: {
            delay: i * 0.06
          }, whileHover: {
            y: -8,
            scale: 1.025
          }, whileTap: {
            scale: 0.985
          }, className: "group relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur-xl transition duration-300", style: {
            background: m.tint,
            borderColor: "oklch(1 0 0 / 0.12)"
          }, onMouseEnter: (event) => {
            event.currentTarget.style.borderColor = m.accent;
            event.currentTarget.style.boxShadow = `0 22px 55px -28px ${m.glow}`;
          }, onMouseLeave: (event) => {
            event.currentTarget.style.borderColor = "oklch(1 0 0 / 0.12)";
            event.currentTarget.style.boxShadow = "";
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ModeAmbientLayer, { mode: key, intensity: "card" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100", style: {
              background: `linear-gradient(135deg, transparent 0%, ${m.glow.replace("0.9", "0.16")} 45%, transparent 75%)`
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-start justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative grid h-10 w-10 place-items-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:rotate-3", style: {
                backgroundColor: m.glow.replace("0.9", "0.15"),
                color: m.accent
              }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5 transition duration-300 group-hover:-translate-y-0.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/10 px-2 py-1", children: m.tag })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mt-4 text-base font-bold transition duration-300 group-hover:brightness-125", style: {
              color: m.accent
            }, children: m.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative text-xs text-muted-foreground mt-0.5", children: [
              counts[key] ?? 0,
              " cases completed"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: m.to, className: "relative mt-4 flex items-center justify-center gap-1 w-full rounded-full py-2 text-center text-sm font-semibold text-background transition duration-300 hover:brightness-110", style: {
              backgroundColor: m.accent,
              boxShadow: `0 12px 28px -18px ${m.glow}`
            }, children: [
              "Play ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5" })
            ] })
          ] }, key);
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid lg:grid-cols-3 gap-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          opacity: 0,
          y: 10
        }, animate: {
          opacity: 1,
          y: 0
        }, whileHover: DASHBOARD_CARD_HOVER, whileTap: {
          scale: 0.99
        }, className: "glass-card p-6 lg:col-span-2 transition duration-300 hover:border-primary/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold mb-3", children: "Recent activity" }),
          scores.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "No cases yet. Pick a mode above to start training." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: scores.map((s) => {
            const meta = activityMeta(s.mode);
            const ActivityIcon = meta.icon;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-center gap-3 rounded-xl border border-border/35 bg-white/[0.03] px-3 py-2.5 text-sm transition hover:border-primary/30 hover:bg-primary/5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl", style: {
                backgroundColor: meta.glow.replace("0.9", "0.14"),
                color: meta.accent
              }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ActivityIcon, { className: "h-4.5 w-4.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-semibold", children: MODE_LABEL[s.mode] ?? meta.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { className: "h-3.5 w-3.5" }),
                  formatActivityDate(s.completed_at)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary", children: [
                s.score,
                " pts"
              ] })
            ] }, s.id);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.div, { initial: {
          opacity: 0,
          y: 10
        }, animate: {
          opacity: 1,
          y: 0
        }, transition: {
          delay: 0.06
        }, whileHover: {
          y: -6,
          scale: 1.012,
          boxShadow: "0 26px 70px -36px oklch(0.74 0.14 180 / 0.95)"
        }, whileTap: {
          scale: 0.99
        }, className: "group relative overflow-hidden rounded-2xl border border-primary/25 bg-slate-950/55 p-5 shadow-[0_24px_80px_-54px_oklch(0.74_0.14_180/0.85)] backdrop-blur-xl transition duration-300 hover:border-primary/45", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 opacity-70", style: {
            background: "linear-gradient(90deg, transparent 0%, oklch(0.74 0.14 180 / 0.12) 50%, transparent 100%)",
            animation: "ekg-scroll 5.5s linear infinite",
            backgroundSize: "220% 100%"
          } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[length:100%_9px] opacity-25" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/12 blur-3xl transition duration-300 group-hover:bg-primary/18" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mb-4 flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-primary", children: "Hospital rankings board" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mt-1 flex items-center gap-2 text-lg font-black", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "h-5 w-5 text-primary drop-shadow-[0_0_12px_oklch(0.74_0.14_180/0.75)]" }),
                "Top this week"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary", children: "live" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "relative space-y-2.5 text-sm", children: [
            topPlayers.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "rounded-xl border border-primary/20 bg-primary/5 p-4 text-center text-xs text-muted-foreground", children: "Be the first on the board." }),
            topPlayers.map((p, i) => {
              const podium = i === 0 ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_26px_-14px_oklch(0.74_0.14_180/0.9)]" : i === 1 ? "border-sky-300/35 bg-sky-300/10 text-sky-200" : i === 2 ? "border-amber-300/35 bg-amber-300/10 text-amber-200" : "border-white/10 bg-white/[0.045] text-muted-foreground";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.li, { initial: {
                opacity: 0,
                x: 18
              }, animate: {
                opacity: 1,
                x: 0
              }, transition: {
                delay: 0.08 + i * 0.045
              }, className: "relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/7", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-xs font-black ${podium}`, children: i + 1 }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate font-semibold text-foreground", children: p.full_name ?? "Anonymous" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[10px] uppercase tracking-wider text-muted-foreground", children: "pharmacist rank" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs font-black tabular-nums text-primary shadow-inner", children: [
                  p.xp,
                  " XP"
                ] })
              ] }, p.user_id);
            })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/leaderboard", className: "relative mt-4 flex items-center justify-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-center text-xs font-bold text-primary transition hover:border-primary/45 hover:bg-primary/15", children: [
            "View full leaderboard ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3.5 w-3.5" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  Dashboard as component
};
