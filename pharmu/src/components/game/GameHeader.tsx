import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Activity, Trophy, Zap, ArrowLeft, Pause, Play, AlertTriangle, Lightbulb } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid max-w-7xl gap-2 px-3 py-2 sm:px-4 md:h-16 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-3 md:py-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleExit}
            className="
              group inline-flex shrink-0 items-center gap-2
              rounded-xl border border-white/15 bg-white/[0.07]
              px-3 py-2 text-xs font-semibold text-foreground/90
              shadow-[0_8px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]
              backdrop-blur-2xl transition-all duration-150
              hover:border-white/25 hover:bg-white/[0.12] hover:text-foreground
              sm:px-4 sm:text-sm
            "
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          {title && (
            <span className="hidden truncate text-sm font-bold sm:block">{title}</span>
          )}
        </div>

        <div className="order-3 flex min-w-0 justify-center md:order-none">
          <div
            className="relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-3 py-2 shadow-inner backdrop-blur-xl md:min-w-[310px] md:max-w-none md:px-4"
            style={{ boxShadow: `inset 0 0 26px oklch(0 0 0 / 0.35), 0 0 24px -14px ${state.glowColor}` }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-35"
              style={{ backgroundImage: "linear-gradient(oklch(1 0 0 / 0.045) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
            <div className="vital-monitor-scan pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
            <div className="relative flex items-center justify-between gap-3 md:gap-4">
              <div className="min-w-[64px] md:min-w-[82px]">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className={`mt-0.5 font-mono text-lg font-black tabular-nums md:text-xl ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`}>
                  {formatTime(remaining)}
                </div>
              </div>
              <svg viewBox="0 0 150 44" className="h-9 flex-1 md:h-11" preserveAspectRatio="none">
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
        </div>

        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center rounded-lg border border-border/40 bg-muted/60 px-2.5 py-1.5 text-sm font-medium sm:px-3">
            <Trophy className="mr-1.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="font-bold tabular-nums">{score}</span>
          </div>

          {streak > 0 && (
            <div className="hidden items-center rounded-lg border border-border/40 bg-muted/60 px-3 py-1.5 text-sm font-medium sm:flex">
              <Zap className="mr-1.5 h-4 w-4 shrink-0 fill-orange-500 text-orange-500 animate-pulse" />
              <span className="font-bold tabular-nums">{streak}</span>
            </div>
          )}

          {!hidePause && (
            <Button
              variant="ghost" size="icon"
              onClick={togglePause}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={paused ? "Resume" : "Pause"}
            >
              {paused
                ? <Play className="h-4 w-4 fill-current" />
                : <Pause className="h-4 w-4" />
              }
            </Button>
          )}
        </div>
      </div>

      {onHint && (
        <div className="border-t border-border/35 bg-card/35">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                <Lightbulb className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-foreground">Need a hint?</p>
                <p className="hidden truncate text-muted-foreground sm:block">Use one hint when you are stuck. It costs 10 points.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onHint}
              className="shrink-0 rounded-full border border-primary/35 bg-primary/12 px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/60 hover:bg-primary/18 sm:px-4 sm:text-sm"
            >
              Use hint -10
            </button>
          </div>
        </div>
      )}

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
