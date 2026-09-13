import { useEffect, useState } from "react";
import { scrollDelta, type Rect } from "@/lib/guide-flight";
import { findAnchor, rectOf, stickyTop } from "./dom";

const same = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a && !!b &&
    Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

/**
 * Follows one control around the screen for as long as the guide points at it.
 *
 * Measured every frame rather than once, because the page does not hold
 * still: the scroll that brings a target into view is itself animated, cards
 * spring in, and a panel can grow while he is talking about it. Measuring once
 * left him pointing at where the slider used to be. State only changes when the
 * box actually moves, so a still page costs a rect read a frame and nothing else.
 */
export function useTrackedRect(id: string | null, reduced: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!id) {
      setRect(null);
      return;
    }
    let el = findAnchor(id);
    if (el) {
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      const delta = scrollDelta(rectOf(el), viewport, stickyTop());
      if (delta !== null) window.scrollBy({ top: delta, behavior: reduced ? "auto" : "smooth" });
    }

    let last: Rect | null = null;
    let frame = 0;
    const tick = () => {
      if (!el || !el.isConnected) el = findAnchor(id);
      const next = el ? rectOf(el) : null;
      if (!same(next, last)) {
        last = next;
        setRect(next);
      }
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(frame);
  }, [id, reduced]);

  return rect;
}
