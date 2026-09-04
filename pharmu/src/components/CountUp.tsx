import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A number that counts up to its value instead of appearing at it.
 *
 * The product is built on numbers a learner is meant to care about - XP,
 * accuracy, a streak - and a figure that snaps into place reads as a value
 * fetched, while one that climbs reads as a value earned. That is the whole
 * reason this exists, so it is used on the headline figures and not on
 * everything with a digit in it.
 *
 * Animates from the previous value rather than from zero, so a number that
 * changes while you are looking at it - XP after finishing a case - travels
 * the distance it actually moved rather than restarting from nothing.
 *
 * Cost is one rAF loop per mounted instance for well under a second, updating
 * a text node. No layout is read, so it cannot cause the reflow-per-frame
 * problem that a `layout` animation does.
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  // Where this run started. Kept in a ref so the effect does not restart
  // itself by depending on the value it is animating.
  const from = useRef(value);

  useEffect(() => {
    // Someone who has asked for less motion gets the number, not the journey.
    if (reduced) { setShown(value); from.current = value; return; }
    if (from.current === value) return;

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic: quick to begin, settling rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  const text = decimals > 0
    ? shown.toFixed(decimals)
    : Math.round(shown).toLocaleString();

  return <span className={className}>{prefix}{text}{suffix}</span>;
}
