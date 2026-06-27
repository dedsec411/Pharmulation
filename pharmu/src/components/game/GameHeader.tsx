import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trophy, Zap, ArrowLeft, HelpCircle, Pause, Play } from "lucide-react";
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
  const state = getTimerState(pct);
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

        {/* LEFT — exit + title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost" size="icon" onClick={onExit}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {title && (
            <span className="font-bold text-sm truncate hidden sm:block">{title}</span>
          )}
        </div>

        {/* CENTER — TIMER */}
        <div className="flex items-center gap-3">
          {/* SVG ring */}
          <div
            className="relative flex items-center justify-center"
            style={{ filter: `drop-shadow(0 0 8px ${state.glowColor})` }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
              <circle cx="26" cy="26" r="20" fill="none"
                stroke="oklch(1 0 0 / 0.08)" strokeWidth="3.5" />
              <circle cx="26" cy="26" r="20" fill="none"
                stroke={state.color} strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }}
              />
            </svg>
            <span
              className={`absolute text-[10px] font-black tabular-nums ${state.textColor} ${state.pulse ? "animate-pulse" : ""}`}
            >
              {formatTime(remaining)}
            </span>
          </div>

          {/* Linear bar — desktop only */}
          <div className="hidden md:flex flex-col gap-1 w-36">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>Time left</span>
              <span className={`${state.textColor} font-bold`}>{formatTime(remaining)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: state.color,
                  boxShadow: `0 0 8px ${state.glowColor}`,
                  transition: "width 0.9s linear, background 0.4s ease",
                }}
              />
            </div>
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

        {/* RIGHT — score, streak, hint, theme */}
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
                title="Hint (−10 pts)"
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
  );
};