import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A short settle on every route change.
 *
 * Navigation was instantaneous in the literal sense - one screen was replaced
 * by another with nothing in between - which reads as a page reload rather
 * than as movement through an app. A brief rise and fade gives the eye
 * something to follow to the new content.
 *
 * Keyed on the pathname, so it plays when the route actually changes and not
 * when a tab or filter inside a page re-renders it.
 *
 * Deliberately no exit animation and no AnimatePresence. Waiting for the old
 * screen to leave before the new one arrives would add its duration to every
 * navigation, and the point is to make the app feel quicker, not to put a
 * interstitial in front of it. 220ms and transform/opacity only, so it is one
 * composited frame sequence with no layout work - and MotionConfig at the root
 * drops it entirely for anyone who has asked for reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
