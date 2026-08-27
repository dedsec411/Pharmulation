import { useEffect, useRef, useState } from "react";

export function useTimer(seconds: number, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const [externalPaused, setExternalPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // The limit now depends on difficulty, which is null until the player picks
  // it, so the countdown has to re-arm when the value arrives or changes.
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
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
    }, 1000);
    return () => clearInterval(id);
  }, [paused, externalPaused, remaining]);

  function togglePause() {
    if (!pauseUsed) setPauseUsed(true);
    setPaused((p) => !p);
  }

  const taken = seconds - remaining;
  const pct = Math.max(0, (remaining / seconds) * 100);
  return { remaining, taken, pct, paused, pauseUsed, togglePause, setExternalPaused };
}
