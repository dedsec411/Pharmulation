import { useEffect, useRef, useState } from "react";
import { useTutorialStore } from "@/lib/tutorial-store";

/**
 * Whether the clock should be running.
 *
 * Pulled out of the effect so the rule can be read and tested on its own,
 * because it now has four reasons to stop and they come from three different
 * places: the player's own pause, the mistake panel, the guide, and the end of
 * the case.
 *
 * The guide is the reason this stopped being a one-liner. A first-time player
 * meets an eight-step tutorial the moment they pick a difficulty, and the
 * clock was running underneath it - so reading the instructions cost them a
 * minute of the case those instructions were explaining.
 */
export function shouldTick(state: {
  paused: boolean;
  externalPaused: boolean;
  guideOpen: boolean;
  remaining: number;
}): boolean {
  return !state.paused && !state.externalPaused && !state.guideOpen && state.remaining > 0;
}

export function useTimer(seconds: number, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const [externalPaused, setExternalPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  // Read rather than passed in: the guide is mounted at the root and opens
  // itself, so no mode is in a position to hand this down.
  const guideOpen = useTutorialStore((state) => state.open);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // The limit now depends on difficulty, which is null until the player picks
  // it, so the countdown has to re-arm when the value arrives or changes.
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!shouldTick({ paused, externalPaused, guideOpen, remaining })) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onTimeoutRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, externalPaused, guideOpen, remaining]);

  function togglePause() {
    if (!pauseUsed) setPauseUsed(true);
    setPaused((p) => !p);
  }

  const taken = seconds - remaining;
  const pct = Math.max(0, (remaining / seconds) * 100);
  return { remaining, taken, pct, paused, pauseUsed, togglePause, setExternalPaused };
}
