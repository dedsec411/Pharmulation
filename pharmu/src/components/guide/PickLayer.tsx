import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MousePointerClick } from "lucide-react";
import { EDGE, PERCH, bubbleWidth, visiblePart, type Point, type Rect, type Size } from "@/lib/guide-flight";
import { SPOTS } from "@/lib/tutorial-spots";
import { findAnchors, rectOf } from "./dom";

type Box = { id: string; rect: Rect };

function measure(viewport: Size): Box[] {
  const seen = new Set<string>();
  const out: Box[] = [];
  for (const anchor of findAnchors()) {
    if (!SPOTS[anchor.id] || seen.has(anchor.id)) continue;
    const rect = visiblePart(rectOf(anchor.el), viewport);
    if (!rect) continue;
    seen.add(anchor.id);
    out.push({ id: anchor.id, rect });
  }
  return out;
}

type Props = {
  home: Point;
  viewport: Size;
  reduced: boolean;
  onPick: (id: string) => void;
  onCancel: () => void;
};

/**
 * What's this: everything he can explain, outlined, so a question can be
 * asked by pointing.
 *
 * The outlines are the answer to "what is this tab" for somebody who does not
 * know what the thing is called - which is everybody who needs to ask. They
 * sit over the page rather than on the controls themselves, so tapping one
 * asks about the button instead of pressing it.
 */
export function PickLayer({ home, viewport, reduced, onPick, onCancel }: Props) {
  const [boxes, setBoxes] = useState<Box[]>(() => measure(viewport));

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setBoxes(measure(viewport));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [viewport]);

  const width = Math.min(340, bubbleWidth(viewport));
  const bottom = viewport.height - (home.y + PERCH);

  return (
    <>
      <motion.div
        data-guide-layer=""
        className="fixed inset-0 z-[90] bg-slate-950/35"
        onClick={onCancel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
      >
        {boxes.map((box, i) => (
          <motion.button
            key={box.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPick(box.id);
            }}
            aria-label={`What is ${SPOTS[box.id].title}?`}
            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduced ? 0 : Math.min(i * 0.03, 0.3) }}
            style={{ left: box.rect.left, top: box.rect.top, width: box.rect.width, height: box.rect.height }}
            className="absolute rounded-xl border-2 border-dashed border-primary/85 bg-primary/5 transition-colors hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
          >
            <span className="absolute left-2 top-0 max-w-[12rem] -translate-y-1/2 truncate rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
              {SPOTS[box.id].title}
            </span>
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        data-guide-layer=""
        role="dialog"
        aria-label="What's this?"
        style={{ left: EDGE, bottom, width }}
        className="fixed z-[94] rounded-2xl border border-primary/30 bg-card px-4 pb-11 pt-3 text-card-foreground shadow-[0_28px_70px_-24px_rgb(2_6_23/0.6)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          <MousePointerClick className="size-3.5" aria-hidden="true" /> What's this?
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug">
          {boxes.length
            ? "Tap anything outlined and I will fly over and explain it."
            : "Nothing I can explain is in view. Scroll, and the outlines appear as things come into view."}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="absolute bottom-2.5 right-3 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Done
        </button>
      </motion.div>
    </>
  );
}
