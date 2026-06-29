import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { B as Button, u as useAuthStore } from "./router-2sXgeX9i.mjs";
import { M as ModeAmbientLayer } from "./ModeAmbientLayer-B2Acv9Tx.mjs";
import { e as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { f as fetchRandomCase, M as MODE_LABEL, D as DIFFICULTY_LABEL, d as DIFFICULTY_RULES } from "./shared-DDCPKmqL.mjs";
import { s as supabase } from "./client-Bd0g9e26.mjs";
import { m as motion, A as AnimatePresence } from "../_libs/framer-motion.mjs";
import { T as Trophy, a as CircleCheck, Y as CircleX, Z as CircleAlert, _ as RotateCw, $ as House, W as ArrowLeft, A as Activity, a0 as Play, a1 as Pause, a2 as Zap, h as CircleQuestionMark, O as TriangleAlert, a3 as Gauge, a4 as ShieldAlert, a5 as Moon, a6 as Sun, v as Sparkles, a7 as MessageCircle } from "../_libs/lucide-react.mjs";
const MODE_ACCENTS = {
  rx: "oklch(0.62 0.19 240)",
  // blue
  otc: "oklch(0.72 0.16 165)",
  // emerald
  community: "oklch(0.74 0.14 180)",
  // teal (shared Rx+OTC)
  hospital: "oklch(0.60 0.20 270)",
  // indigo
  oncology: "oklch(0.62 0.22 300)",
  // violet-purple
  cosmetic: "oklch(0.68 0.22 340)",
  // pink
  cosmetics: "oklch(0.68 0.22 340)",
  // pink (alias — route uses "cosmetics")
  emergency: "oklch(0.65 0.22 25)",
  // red
  industry: "oklch(0.78 0.16 75)",
  // amber
  warehousing: "oklch(0.60 0.18 220)"
  // sky-blue
};
function ModeTheme({ mode, children }) {
  reactExports.useEffect(() => {
    const accent = MODE_ACCENTS[mode] ?? MODE_ACCENTS.rx;
    document.documentElement.style.setProperty("--mode-accent", accent);
    document.body.classList.add("mode-themed", `mode-${mode}`);
    return () => {
      document.documentElement.style.removeProperty("--mode-accent");
      document.body.classList.remove("mode-themed", `mode-${mode}`);
    };
  }, [mode]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-screen overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ModeAmbientLayer, { mode, intensity: "screen" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative z-10", children })
  ] });
}
function ThemeToggleButton() {
  const [theme, setTheme] = reactExports.useState("dark");
  reactExports.useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);
  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      variant: "ghost",
      size: "icon",
      onClick: toggleTheme,
      className: "text-muted-foreground hover:text-foreground rounded-lg",
      title: theme === "light" ? "Switch to dark mode" : "Switch to light mode",
      children: [
        theme === "light" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "h-5 w-5 transition-transform duration-200" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "h-5 w-5 transition-transform duration-200" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Toggle Theme" })
      ]
    }
  );
}
function getTimerState(pct) {
  if (pct > 50) return {
    color: "oklch(0.74 0.14 180)",
    glowColor: "oklch(0.74 0.14 180 / 0.5)",
    textColor: "text-primary",
    pulse: false
  };
  if (pct > 25) return {
    color: "oklch(0.78 0.16 75)",
    glowColor: "oklch(0.78 0.16 75 / 0.55)",
    textColor: "text-warning",
    pulse: false
  };
  return {
    color: "oklch(0.65 0.22 25)",
    glowColor: "oklch(0.65 0.22 25 / 0.65)",
    textColor: "text-destructive",
    pulse: true
  };
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}
function buildEcgPoints(pct, baseline, points) {
  const strength = Math.max(0, Math.min(1, pct / 100));
  const easedStrength = strength <= 0 ? 0 : Math.pow(strength, 0.85);
  return points.map(([x, y]) => `${x},${baseline + (y - baseline) * easedStrength}`).join(" ");
}
const GameHeader = ({
  score,
  streak = 0,
  onExit,
  title,
  remaining,
  pct,
  paused,
  togglePause,
  onHint,
  hidePause = false
}) => {
  const [showExitConfirm, setShowExitConfirm] = reactExports.useState(false);
  const state = getTimerState(pct);
  const timerIsTicking = remaining > 0 && !paused;
  const desktopWave = buildEcgPoints(pct, 24, [
    [0, 24],
    [18, 24],
    [25, 24],
    [31, 14],
    [38, 32],
    [45, 24],
    [58, 24],
    [64, 24],
    [70, 7],
    [77, 38],
    [84, 24],
    [103, 24],
    [110, 18],
    [117, 28],
    [124, 24],
    [150, 24]
  ]);
  const mobileWave = buildEcgPoints(pct, 16, [
    [0, 16],
    [15, 16],
    [22, 8],
    [28, 22],
    [34, 16],
    [48, 16],
    [54, 5],
    [60, 24],
    [66, 16],
    [86, 16]
  ]);
  function handleExit() {
    if (!onExit) return;
    if (timerIsTicking) {
      setShowExitConfirm(true);
      return;
    }
    onExit();
  }
  function confirmExit() {
    setShowExitConfirm(false);
    onExit?.();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: handleExit,
              className: "\n              group inline-flex shrink-0 items-center gap-2\n              rounded-xl border border-white/15 bg-white/[0.07]\n              px-4 py-2 text-sm font-semibold text-foreground/90\n              shadow-[0_8px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]\n              backdrop-blur-2xl transition-all duration-150\n              hover:border-white/25 hover:bg-white/[0.12] hover:text-foreground\n            ",
              "aria-label": "Back",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Back" })
              ]
            }
          ),
          title && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-sm truncate hidden sm:block", children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "relative hidden min-w-[310px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-2 shadow-inner backdrop-blur-xl md:block",
              style: { boxShadow: `inset 0 0 26px oklch(0 0 0 / 0.35), 0 0 24px -14px ${state.glowColor}` },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "pointer-events-none absolute inset-0 opacity-35",
                    style: { backgroundImage: "linear-gradient(oklch(1 0 0 / 0.045) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vital-monitor-scan pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/12 to-transparent" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-between gap-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-[82px]", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "h-3.5 w-3.5" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-0.5 font-mono text-xl font-black tabular-nums ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`, children: formatTime(remaining) })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 150 44", className: "h-11 flex-1", preserveAspectRatio: "none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "polyline",
                    {
                      points: desktopWave,
                      fill: "none",
                      stroke: state.color,
                      strokeWidth: "2.8",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      className: "vital-ecg-line",
                      style: { filter: `drop-shadow(0 0 5px ${state.glowColor})` }
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "h-full rounded-full",
                    style: {
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${state.color}, oklch(0.92 0.06 190))`,
                      boxShadow: `0 0 8px ${state.glowColor}`,
                      transition: "width 0.9s linear, background 0.4s ease"
                    }
                  }
                ) })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "relative flex h-12 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 md:hidden",
              style: { filter: `drop-shadow(0 0 8px ${state.glowColor})` },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 86 28", className: "absolute inset-x-1 top-1 h-7 opacity-80", preserveAspectRatio: "none", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: mobileWave, fill: "none", stroke: state.color, strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", className: "vital-ecg-line" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `relative mt-4 font-mono text-xs font-black tabular-nums ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`, children: formatTime(remaining) })
              ]
            }
          ),
          !hidePause && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "ghost",
              size: "icon",
              onClick: togglePause,
              className: "text-muted-foreground hover:text-foreground shrink-0",
              title: paused ? "Resume" : "Pause",
              children: paused ? /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { className: "h-4 w-4 fill-current" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { className: "h-4 w-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40 text-sm font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "h-4 w-4 text-amber-500 mr-1.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold tabular-nums", children: score })
          ] }),
          streak > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40 text-sm font-medium", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "h-4 w-4 text-orange-500 fill-orange-500 animate-pulse mr-1.5 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold tabular-nums", children: streak })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-l border-border/60 pl-2 flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggleButton, {}),
            onHint && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: onHint,
                className: "text-muted-foreground hover:text-foreground",
                title: "Hint (-10 pts)",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleQuestionMark, { className: "h-5 w-5" })
              }
            )
          ] })
        ] })
      ] }),
      pct <= 25 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "w-full h-0.5 md:hidden",
          style: {
            background: state.color,
            boxShadow: `0 0 6px ${state.glowColor}`,
            animation: "emergency-edge 1.4s ease-in-out infinite"
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: showExitConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-[70] grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center",
        onClick: () => setShowExitConfirm(false),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          motion.div,
          {
            initial: { y: 40, opacity: 0, scale: 0.96 },
            animate: { y: 0, opacity: 1, scale: 1 },
            exit: { y: 40, opacity: 0 },
            transition: { type: "spring", stiffness: 260, damping: 24 },
            className: "relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/35 bg-card shadow-2xl",
            style: { borderLeft: "4px solid #F59E0B" },
            onClick: (e) => e.stopPropagation(),
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-amber-300", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-bold uppercase tracking-wider", children: "Leave this mode?" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm leading-relaxed text-foreground/90", children: "Your current progress will be lost if you leave now." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-xs text-muted-foreground", children: [
                "Timer is still running: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: formatTime(remaining) }),
                " left."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowExitConfirm(false),
                    className: "flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90",
                    children: "Stay in mode"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: confirmExit,
                    className: "flex-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15",
                    children: "Leave anyway"
                  }
                )
              ] })
            ] })
          }
        )
      }
    ) })
  ] });
};
function FeedbackScreen({ score, xpGain, timeTaken, mentorTip, explanation, drugs = [], breakdown = [], errors = [], onNext }) {
  const [display, setDisplay] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplay(Math.round(score * (0.2 + 0.8 * p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-3xl px-4 py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.div,
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      className: "rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "size-8 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Case complete" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-bold", children: [
              "Score: ",
              display
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-primary", children: [
              "+",
              xpGain,
              " XP · ",
              Math.floor(timeTaken),
              "s"
            ] })
          ] })
        ] }),
        breakdown.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid gap-2 sm:grid-cols-2", children: breakdown.map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: b.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: b.delta >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive", children: [
            b.delta >= 0 ? "+" : "",
            b.delta
          ] })
        ] }, i)) }),
        drugs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-sm font-semibold", children: "Drugs in this case" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: drugs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2 rounded-lg border border-border/30 bg-muted/20 p-3 text-sm", children: [
            d.correct ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "mt-0.5 size-4 shrink-0 text-primary" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "mt-0.5 size-4 shrink-0 text-destructive" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: d.name }),
              d.info && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: d.info })
            ] })
          ] }, d.name)) })
        ] }),
        errors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-2 text-sm font-semibold text-red-300", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "size-4" }),
            " Your mistakes this case (",
            errors.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2", children: errors.map((e, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "rounded-lg border border-border/30 bg-background/40 p-3 text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold text-red-300", children: [
              e.errorType,
              ": ",
              e.wrongChoice
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-muted-foreground", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "text-foreground", children: "Why:" }),
              " ",
              e.whyWrong
            ] }),
            e.correctChoice && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-emerald-300", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Correct:" }),
              " ",
              e.correctChoice
            ] })
          ] }, i)) })
        ] }),
        mentorTip && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: "Mentor tip" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: mentorTip })
        ] }),
        explanation && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: explanation }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onNext, className: "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCw, { className: "size-4" }),
            " Next case"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold hover:bg-muted", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "size-4" }),
            " Dashboard"
          ] })
        ] })
      ]
    }
  ) });
}
function useCaseLoader(mode, difficulty) {
  const [caseData, setCaseData] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(!!difficulty);
  const [reloadKey, setReloadKey] = reactExports.useState(0);
  const load = reactExports.useCallback(async () => {
    if (!difficulty) {
      setCaseData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const c = await fetchRandomCase(mode, difficulty);
    setCaseData(c);
    setLoading(false);
  }, [mode, difficulty]);
  reactExports.useEffect(() => {
    load();
  }, [load, reloadKey]);
  return { caseData, loading, next: () => setReloadKey((k) => k + 1) };
}
function useTimer(seconds, onTimeout) {
  const [remaining, setRemaining] = reactExports.useState(seconds);
  const [paused, setPaused] = reactExports.useState(false);
  const [externalPaused, setExternalPaused] = reactExports.useState(false);
  const [pauseUsed, setPauseUsed] = reactExports.useState(false);
  const onTimeoutRef = reactExports.useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  reactExports.useEffect(() => {
    if (paused || externalPaused || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onTimeoutRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1e3);
    return () => clearInterval(id);
  }, [paused, externalPaused, remaining]);
  function togglePause() {
    if (!pauseUsed) setPauseUsed(true);
    setPaused((p) => !p);
  }
  const taken = seconds - remaining;
  const pct = Math.max(0, remaining / seconds * 100);
  return { remaining, taken, pct, paused, pauseUsed, togglePause, setExternalPaused };
}
const AUTO_DISMISS_SEC = 15;
const DOCTOR_IMAGE = "/doctor-mentor.png";
function ErrorExplanationPanel({ entry, mentorTip, onDismiss }) {
  const [count, setCount] = reactExports.useState(AUTO_DISMISS_SEC);
  const [expanded, setExpanded] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!entry) return;
    setCount(AUTO_DISMISS_SEC);
    setExpanded(false);
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id);
          onDismiss();
          return 0;
        }
        return c - 1;
      });
    }, 1e3);
    return () => clearInterval(id);
  }, [entry, onDismiss]);
  const showCorrect = entry && (entry.forceShowCorrect || entry.difficulty !== "hard");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: entry && /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      className: "fixed inset-0 z-[60] grid place-items-end sm:place-items-center bg-black/70 backdrop-blur-sm p-4",
      onClick: onDismiss,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { y: 40, opacity: 0, scale: 0.96 },
          animate: { y: 0, opacity: 1, scale: 1 },
          exit: { y: 40, opacity: 0 },
          transition: { type: "spring", stiffness: 260, damping: 24 },
          className: "relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl",
          style: { borderLeft: "4px solid #EF4444" },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute right-4 top-4 flex flex-col items-end gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid size-12 place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-primary/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                motion.img,
                {
                  src: DOCTOR_IMAGE,
                  alt: "",
                  className: "h-14 w-12 object-contain object-top drop-shadow-[0_8px_14px_rgba(0,0,0,0.2)]",
                  animate: { y: [0, -2, 0] },
                  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-muted/60 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground", children: [
                count,
                "s"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 pr-16", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-red-400", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "size-5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base font-bold uppercase tracking-wider", children: "Wrong Selection" })
              ] }),
              entry.wrongChoice && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: [
                "You chose: ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: entry.wrongChoice })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Why this is wrong", color: "text-red-300", children: entry.whyWrong }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "What you should know", color: "text-amber-300", children: entry.whatToKnow }),
              showCorrect && entry.correctChoice && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-3.5" }),
                  " Correct answer"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-emerald-100", children: entry.correctChoice })
              ] }),
              !showCorrect && entry.hint && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "size-3.5" }),
                  " Hint (Hard mode)"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-amber-100", children: entry.hint })
              ] }),
              expanded && mentorTip && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                motion.div,
                {
                  initial: { opacity: 0, height: 0 },
                  animate: { opacity: 1, height: "auto" },
                  className: "mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: "Mentor" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm", children: mentorTip })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    onClick: onDismiss,
                    className: "flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90",
                    children: "Got it, continue"
                  }
                ),
                mentorTip && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    onClick: () => setExpanded((x) => !x),
                    className: "inline-flex items-center gap-1.5 rounded-full border border-border/50 px-4 py-2 text-xs font-medium hover:bg-muted",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "size-3.5" }),
                      expanded ? "Hide" : "Ask Mentor"
                    ]
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  ) });
}
function Section({ title, color, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: `text-xs font-semibold uppercase tracking-wider ${color}`, children: [
      title,
      ":"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm leading-relaxed text-foreground/90", children })
  ] });
}
function useErrorPanel({ mode, difficulty, mentorTip, setExternalPaused }) {
  const [current, setCurrent] = reactExports.useState(null);
  const [errors, setErrors] = reactExports.useState([]);
  const pausedRef = reactExports.useRef(false);
  const logError = reactExports.useCallback(
    (input) => {
      const entry = {
        timestamp: Date.now(),
        mode,
        difficulty: input.difficulty ?? (difficulty ?? "medium"),
        ...input
      };
      setErrors((arr) => [...arr, entry]);
      setCurrent(entry);
      if (!pausedRef.current) {
        pausedRef.current = true;
        setExternalPaused(true);
      }
    },
    [mode, difficulty, setExternalPaused]
  );
  const dismiss = reactExports.useCallback(() => {
    setCurrent(null);
    if (pausedRef.current) {
      pausedRef.current = false;
      setExternalPaused(false);
    }
  }, [setExternalPaused]);
  const reset = reactExports.useCallback(() => {
    setErrors([]);
    setCurrent(null);
    if (pausedRef.current) {
      pausedRef.current = false;
      setExternalPaused(false);
    }
  }, [setExternalPaused]);
  const panel = /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorExplanationPanel, { entry: current, mentorTip: mentorTip ?? void 0, onDismiss: dismiss });
  return { logError, errors, panel, reset };
}
function useGameExit(to = "/modes") {
  const navigate = useNavigate();
  return function onExit() {
    navigate({ to });
  };
}
const OPTIONS = [
  {
    difficulty: "easy",
    icon: Activity,
    desc: "More forgiving penalties and gentler timeout scoring."
  },
  {
    difficulty: "medium",
    icon: Gauge,
    desc: "Balanced scoring and standard case rules."
  },
  {
    difficulty: "hard",
    icon: ShieldAlert,
    desc: "Higher rewards, harsher penalties, and less help on mistakes."
  }
];
function storageKey(mode) {
  return `pharmulation:${mode}:difficulty`;
}
function useDifficultyChoice(mode) {
  const [difficulty, setDifficulty] = reactExports.useState(null);
  const [open, setOpen] = reactExports.useState(true);
  reactExports.useEffect(() => {
    setDifficulty(null);
    setOpen(true);
  }, [mode]);
  function choose(next) {
    localStorage.setItem(storageKey(mode), next);
    setDifficulty(next);
    setOpen(false);
  }
  return {
    difficulty,
    difficultyModal: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DifficultySelectModal,
      {
        mode,
        open,
        onChoose: choose
      }
    )
  };
}
function DifficultySelectModal({
  mode,
  open,
  onChoose
}) {
  const { profile } = useAuthStore();
  const [lastDifficulty, setLastDifficulty] = reactExports.useState(null);
  const [lastScore, setLastScore] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(storageKey(mode));
    const safeStored = stored === "easy" || stored === "medium" || stored === "hard" ? stored : null;
    setLastDifficulty(safeStored);
    setLastScore(null);
    if (!profile?.user_id || !safeStored) return;
    supabase.from("scores").select("score, cases!inner(difficulty)").eq("user_id", profile.user_id).eq("mode", mode).eq("cases.difficulty", safeStored).order("completed_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      setLastScore(typeof data?.score === "number" ? data.score : null);
    });
  }, [mode, open, profile?.user_id]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      className: "fixed inset-0 z-[80] grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { y: 32, opacity: 0, scale: 0.96 },
          animate: { y: 0, opacity: 1, scale: 1 },
          exit: { y: 32, opacity: 0 },
          transition: { type: "spring", stiffness: 260, damping: 24 },
          className: "w-full max-w-2xl rounded-2xl border border-border/40 bg-card p-5 shadow-2xl",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-primary", children: MODE_LABEL[mode] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-bold", children: "Choose difficulty" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-right text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "Last played" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-semibold", children: [
                  lastDifficulty ? DIFFICULTY_LABEL[lastDifficulty] : "None",
                  lastScore != null ? ` · ${lastScore} pts` : ""
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid gap-3 md:grid-cols-3", children: OPTIONS.map(({ difficulty: d, icon: Icon, desc }) => {
              const rules = DIFFICULTY_RULES[d];
              const selected = lastDifficulty === d;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onChoose(d),
                  className: `rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 ${selected ? "border-primary/50 bg-primary/10" : "border-border/40 bg-muted/20"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "size-5 text-primary" }),
                      selected && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary", children: "Last" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-3 text-lg font-bold", children: DIFFICULTY_LABEL[d] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground", children: desc }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg bg-background/40 p-2 text-[11px] text-muted-foreground", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                        "Rewards x",
                        rules.rewardMultiplier
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                        "Penalties x",
                        rules.penaltyMultiplier
                      ] })
                    ] })
                  ]
                },
                d
              );
            }) })
          ]
        }
      )
    }
  ) });
}
export {
  FeedbackScreen as F,
  GameHeader as G,
  ModeTheme as M,
  useDifficultyChoice as a,
  useCaseLoader as b,
  useTimer as c,
  useErrorPanel as d,
  useGameExit as u
};
