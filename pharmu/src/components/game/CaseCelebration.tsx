import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { celebrationTier, type CaseResult, type CelebrationTier } from "@/lib/game/celebration";

/**
 * The moment a case is finished, before the review.
 *
 * Shown by every mode, because finishing a case should feel like finishing
 * something wherever you did it. It sits over the feedback rather than
 * replacing it, so skipping it lands you straight in the breakdown.
 *
 * The celebration is scaled to the result. A run with six mistakes gets the
 * same acknowledgement of completion but none of the fanfare - throwing
 * confetti at a case someone got badly wrong tells them it went fine, which in
 * a training product is worse than saying nothing.
 */

const CONFETTI_COLORS = [
  "oklch(0.74 0.14 180)", // primary teal
  "oklch(0.85 0.16 90)",  // amber
  "oklch(0.78 0.17 150)", // emerald
  "oklch(0.72 0.19 20)",  // rose
  "oklch(0.95 0.02 240)", // near-white
];

type Piece = {
  id: number; left: number; drift: number; delay: number;
  duration: number; spin: number; size: number; color: string; round: boolean;
};

function useConfetti(count: number): Piece[] {
  return useMemo(
    () => Array.from({ length: count }, (_, id) => ({
      id,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 160,
      delay: Math.random() * 0.45,
      duration: 2.1 + Math.random() * 1.4,
      spin: Math.random() * 720 - 360,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
      round: Math.random() > 0.65,
    })),
    [count],
  );
}

function Confetti({ count }: { count: number }) {
  const pieces = useConfetti(count);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? "9999px" : "1px",
          }}
          initial={{ y: "-12vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "112vh", x: p.drift, rotate: p.spin, opacity: [1, 1, 0.85, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

const TIER_STYLE: Record<CelebrationTier["key"], { ring: string; text: string; glow: string }> = {
  flawless: { ring: "border-amber-300/60", text: "text-amber-700 dark:text-amber-300", glow: "shadow-[0_0_80px_-10px_oklch(0.85_0.16_90/0.55)]" },
  strong:   { ring: "border-primary/60",   text: "text-primary",   glow: "shadow-[0_0_80px_-10px_oklch(0.74_0.14_180/0.5)]" },
  steady:   { ring: "border-border/60",    text: "text-foreground", glow: "" },
  // A failure has to look like one at a glance, before a word is read.
  failed:   { ring: "border-rose-500/70",  text: "text-rose-700 dark:text-rose-300",  glow: "shadow-[0_0_90px_-10px_oklch(0.62_0.22_20/0.6)]" },
};

export function CaseCelebration({
  score, xpGain, result, product, onDone,
}: {
  score: number;
  xpGain: number;
  /** What the case produced - decides whether this is a celebration at all. */
  result: CaseResult;
  /** What the run actually produced, where a mode makes something. */
  product?: { name: string; detail?: string };
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const tier = celebrationTier(result);
  const style = TIER_STYLE[tier.key];
  const [count, setCount] = useState(0);

  // Held in a ref so the timers below are set once. The parent re-renders while
  // its own score counts up, handing us a fresh onDone each frame; keying the
  // effect on that identity restarted the dismiss timer roughly sixty times a
  // second, so the celebration outstayed its welcome and the skip listeners
  // never armed.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Dismisses itself, but a click or any key skips it - a learner working
  // through a run of cases should never have to wait this out.
  useEffect(() => {
    const timer = setTimeout(() => doneRef.current(), reduced ? 900 : 2600);
    const skip = () => doneRef.current();
    // Armed slightly late on purpose. The case was finished by a click or a
    // keypress, and arming immediately lets that same interaction's trailing
    // event dismiss the celebration before it has been seen.
    const arm = setTimeout(() => {
      window.addEventListener("keydown", skip);
      window.addEventListener("pointerdown", skip);
    }, 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(arm);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [reduced]);

  useEffect(() => {
    if (reduced) { setCount(score); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      // Ease-out, so the number decelerates into its final value.
      setCount(Math.round(score * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, reduced]);

  const failed = tier.key === "failed";
  const Icon = failed ? ShieldAlert
    : tier.key === "flawless" ? Trophy
    : tier.key === "strong" ? Sparkles
    : CheckCircle2;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-0 z-[90] grid place-items-center backdrop-blur-md ${
        failed ? "bg-rose-950/55" : "bg-background/80"
      }`}
    >
      {!reduced && tier.confetti > 0 && <Confetti count={tier.confetti} />}

      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.86, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className={`relative mx-4 w-full max-w-sm rounded-3xl border bg-card/90 p-8 text-center backdrop-blur ${style.ring} ${style.glow}`}
      >
        <motion.span
          initial={reduced ? {} : { scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 14 }}
          className={`mx-auto grid size-16 place-items-center rounded-2xl border ${style.ring} bg-background/60`}
        >
          <Icon className={`size-8 ${style.text}`} />
        </motion.span>

        <p className={`mt-4 text-2xl font-black tracking-tight ${style.text}`}>{tier.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>

        {/* Manufacturing ends with a thing in your hands, so the celebration
            names it rather than showing a score alone. */}
        {product && (
          <div className="mt-4 rounded-xl border border-border/50 bg-background/50 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">You made</p>
            <p className="mt-0.5 font-bold leading-tight">{product.name}</p>
            {product.detail && <p className="text-xs text-muted-foreground">{product.detail}</p>}
          </div>
        )}

        <p className="mt-5 text-5xl font-black tabular-nums">{count}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">points</p>

        <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${
          failed
            ? "border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-200"
            : "border-primary/30 bg-primary/10 text-primary"
        }`}>
          +{xpGain} XP
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground">
          {failed ? "Tap anywhere to see what went wrong" : "Tap anywhere to see the breakdown"}
        </p>
      </motion.div>
    </motion.div>
  );
}
