import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Activity, Trophy, Zap, ArrowLeft, HelpCircle, Pause, Play, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggleButton } from "./ModeTheme";

interface GameHeaderProps {
  score: number;
  streak?: number;
  onExit?: () => void;
  title?: string;
  remaining: number;
  pct: number;
  paused: boolean;
  togglePause: () => void;
  onHint?: () => void;
  hidePause?: boolean;
}

function getTimerState(pct: number): {
  color: string;
  glowColor: string;
  textColor: string;
  pulse: boolean;
} {
  if (pct > 50) return {
    color: "oklch(0.74 0.14 180)",
    glowColor: "oklch(0.74 0.14 180 / 0.5)",
    textColor: "text-primary",
    pulse: false,
  };
  if (pct > 25) return {
    color: "oklch(0.78 0.16 75)",
    glowColor: "oklch(0.78 0.16 75 / 0.55)",
    textColor: "text-warning",
    pulse: false,
  };
  return {
    color: "oklch(0.65 0.22 25)",
    glowColor: "oklch(0.65 0.22 25 / 0.65)",
    textColor: "text-destructive",
    pulse: true,
  };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function buildEcgPoints(pct: number, baseline: number, points: Array<[number, number]>) {
  const strength = Math.max(0, Math.min(1, pct / 100));
  const easedStrength = strength <= 0 ? 0 : Math.pow(strength, 0.85);
  return points
    .map(([x, y]) => `${x},${baseline + (y - baseline) * easedStrength}`)
    .join(" ");
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  score,
  streak = 0,
  onExit,
  title,
  remaining,
  pct,
  paused,
  togglePause,
  onHint,
  hidePause = false,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const state = getTimerState(pct);
  const timerIsTicking = remaining > 0 && !paused;
  const desktopWave = buildEcgPoints(pct, 24, [
    [0, 24], [18, 24], [25, 24], [31, 14], [38, 32], [45, 24], [58, 24], [64, 24],
    [70, 7], [77, 38], [84, 24], [103, 24], [110, 18], [117, 28], [124, 24], [150, 24],
  ]);
  const mobileWave = buildEcgPoints(pct, 16, [
    [0, 16], [15, 16], [22, 8], [28, 22], [34, 16], [48, 16], [54, 5], [60, 24], [66, 16], [86, 16],
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

  return (
    <>
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

        {/* LEFT - exit + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleExit}
            className="
              group inline-flex shrink-0 items-center gap-2
              rounded-xl border border-white/15 bg-white/[0.07]
              px-4 py-2 text-sm font-semibold text-foreground/90
              shadow-[0_8px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]
              backdrop-blur-2xl transition-all duration-150
              hover:border-white/25 hover:bg-white/[0.12] hover:text-foreground
            "
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          {title && (
            <span className="font-bold text-sm truncate hidden sm:block">{title}</span>
          )}
        </div>

        {/* CENTER - TIMER */}
        <div className="flex items-center gap-3">
          <div
            className="relative hidden min-w-[310px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-2 shadow-inner backdrop-blur-xl md:block"
            style={{ boxShadow: `inset 0 0 26px oklch(0 0 0 / 0.35), 0 0 24px -14px ${state.glowColor}` }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-35"
              style={{ backgroundImage: "linear-gradient(oklch(1 0 0 / 0.045) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
            <div className="vital-monitor-scan pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-[82px]">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className={`mt-0.5 font-mono text-xl font-black tabular-nums ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`}>
                  {formatTime(remaining)}
                </div>
              </div>
              <svg viewBox="0 0 150 44" className="h-11 flex-1" preserveAspectRatio="none">
                <polyline
                  points={desktopWave}
                  fill="none"
                  stroke={state.color}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="vital-ecg-line"
                  style={{ filter: `drop-shadow(0 0 5px ${state.glowColor})` }}
                />
              </svg>
            </div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${state.color}, oklch(0.92 0.06 190))`,
                  boxShadow: `0 0 8px ${state.glowColor}`,
                  transition: "width 0.9s linear, background 0.4s ease",
                }}
              />
            </div>
          </div>

          <div
            className="relative flex h-12 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 md:hidden"
            style={{ filter: `drop-shadow(0 0 8px ${state.glowColor})` }}
          >
            <svg viewBox="0 0 86 28" className="absolute inset-x-1 top-1 h-7 opacity-80" preserveAspectRatio="none">
              <polyline points={mobileWave} fill="none" stroke={state.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="vital-ecg-line" />
            </svg>
            <span className={`relative mt-4 font-mono text-xs font-black tabular-nums ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`}>
              {formatTime(remaining)}
            </span>
          </div>


          {/* Pause/play */}
          {!hidePause && (
            <Button
              variant="ghost" size="icon"
              onClick={togglePause}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title={paused ? "Resume" : "Pause"}
            >
              {paused
                ? <Play className="h-4 w-4 fill-current" />
                : <Pause className="h-4 w-4" />
              }
            </Button>
          )}
        </div>

        {/* RIGHT - score, streak, hint, theme */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40 text-sm font-medium">
            <Trophy className="h-4 w-4 text-amber-500 mr-1.5 shrink-0" />
            <span className="font-bold tabular-nums">{score}</span>
          </div>

          {streak > 0 && (
            <div className="flex items-center bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40 text-sm font-medium">
              <Zap className="h-4 w-4 text-orange-500 fill-orange-500 animate-pulse mr-1.5 shrink-0" />
              <span className="font-bold tabular-nums">{streak}</span>
            </div>
          )}

          <div className="border-l border-border/60 pl-2 flex items-center gap-1">
            <ThemeToggleButton />
            {onHint && (
              <Button
                variant="ghost" size="icon"
                onClick={onHint}
                className="text-muted-foreground hover:text-foreground"
                title="Hint (-10 pts)"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile danger strip */}
      {pct <= 25 && (
        <div
          className="w-full h-0.5 md:hidden"
          style={{
            background: state.color,
            boxShadow: `0 0 6px ${state.glowColor}`,
            animation: "emergency-edge 1.4s ease-in-out infinite",
          }}
        />
      )}
    </header>

    <AnimatePresence>
      {showExitConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"
          onClick={() => setShowExitConfirm(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/35 bg-card shadow-2xl"
            style={{ borderLeft: "4px solid #F59E0B" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="size-5" />
                <h3 className="text-base font-bold uppercase tracking-wider">Leave this mode?</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                Your current progress will be lost if you leave now.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Timer is still running: <span className="font-semibold text-foreground">{formatTime(remaining)}</span> left.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Stay in mode
                </button>
                <button
                  type="button"
                  onClick={confirmExit}
                  className="flex-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15"
                >
                  Leave anyway
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
