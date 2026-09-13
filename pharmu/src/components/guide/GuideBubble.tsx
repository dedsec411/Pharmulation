import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Point } from "@/lib/guide-flight";
import type { TourStep } from "@/lib/tutorial-spots";

type Props = {
  at: Point;
  width: number;
  /** Which edge he is standing on, so the text leaves room for him. */
  perch: "top" | "bottom";
  step: TourStep;
  index: number;
  total: number;
  primaryLabel: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** Placement needs the real height, and the height depends on the words. */
  onHeight: (height: number) => void;
  reduced: boolean;
};

/**
 * What he says. It travels with him - a bubble that stayed put while he flew
 * would leave the words behind the thing they describe.
 */
export function GuideBubble({
  at, width, perch, step, index, total, primaryLabel, onNext, onBack, onSkip, onHeight, reduced,
}: Props) {
  const box = useRef<HTMLDivElement | null>(null);
  const primary = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const report = () => onHeight(el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeight]);

  // Keyboard users land on Next every step, so Enter walks the whole tour.
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [step.key]);

  const progress = total > 1 ? ((index + 1) / total) * 100 : 100;

  return (
    <motion.div
      ref={box}
      data-guide-layer=""
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-step-title"
      aria-describedby="guide-step-body"
      initial={{ opacity: 0, scale: 0.96, x: at.x, y: at.y }}
      animate={{ opacity: 1, scale: 1, x: at.x, y: at.y }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 30, opacity: { duration: 0.15 } }}
      style={{ width }}
      className={`fixed left-0 top-0 z-[94] overflow-hidden rounded-2xl border border-primary/30 bg-card text-card-foreground shadow-[0_28px_70px_-24px_rgb(2_6_23/0.6)] ${
        perch === "top" ? "pt-5" : "pb-5"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-primary/10" aria-hidden="true">
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduced ? 0 : 0.3 }}
        />
      </div>

      <div className="max-h-[min(62vh,520px,calc(100dvh_-_11rem))] overflow-y-auto px-4 pb-3 pt-2">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.2em] text-primary">{step.eyebrow}</p>
          {total > 1 && (
            <p className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {index + 1} of {total}
            </p>
          )}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
          >
            <h2 id="guide-step-title" className="mt-1.5 text-balance text-base font-bold leading-snug">{step.title}</h2>
            <p id="guide-step-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            {step.list && (
              <ol className="mt-3 grid gap-1.5">
                {step.list.map((item, i) => (
                  <li key={item} className="flex items-start gap-2 text-xs">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-black tabular-nums text-primary">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 font-medium leading-snug">{item}</span>
                  </li>
                ))}
              </ol>
            )}
            {step.action && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {step.action}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2.5">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Skip
        </button>
        <div className="flex items-center gap-1.5">
          {index > 0 && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Previous step"
              className="grid size-8 place-items-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            ref={primary}
            type="button"
            data-guide-focus=""
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {primaryLabel}
            {primaryLabel !== "Done" && <ChevronRight className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
