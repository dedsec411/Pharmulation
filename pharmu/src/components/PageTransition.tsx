import { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A short settle on every route change.
 *
 * This used to be `key={pathname}` on a motion.div with `initial={{opacity: 0,
 * y: 8}}`. Keying on the path is what replayed the animation - but a changed
 * key destroys the subtree and builds a new one, so every navigation
 * remounted the entire page at opacity 0 and faded it back in. Measured on a
 * plain link click, the wrapper's computed opacity went
 *
 *     1.00 1.00 ... 0.00 0.65 0.88 0.96 1.00
 *
 * while the element was also translated. That is the page visibly blinking
 * before the next one arrives, which reads as the app loading twice. The
 * remount was the more expensive half: it threw away component state and
 * re-ran every effect underneath on each navigation.
 *
 * Now there is one motion.div that is never rebuilt, and the path change
 * replays an animation on it through controls instead. It starts at 0.92
 * rather than 0, so the page never goes blank - there is a settle, not a
 * blink - and nothing below it unmounts.
 *
 * MotionConfig at the root drops this entirely for anyone who has asked for
 * reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const controls = useAnimationControls();

  useEffect(() => {
    // Never below 0.92: enough for the eye to catch that something changed,
    // far short of the page disappearing.
    controls.set({ opacity: 0.92 });
    void controls.start({
      opacity: 1,
      transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
    });
  }, [pathname, controls]);

  return <motion.div animate={controls}>{children}</motion.div>;
}
