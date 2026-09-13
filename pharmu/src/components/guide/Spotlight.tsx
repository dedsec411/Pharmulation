import { motion } from "framer-motion";
import type { Rect } from "@/lib/guide-flight";

/**
 * The page dimmed, with a lit hole around the one thing being explained.
 *
 * It also takes the page's clicks for the length of the tour. The case clock
 * is stopped while he talks, and a page that stayed playable underneath would
 * be a pause that let you keep working.
 */
export function Spotlight({ frame, reduced }: { frame: (Rect & { radius: number }) | null; reduced: boolean }) {
  const move = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 190, damping: 28 };

  return (
    <motion.div
      data-guide-layer=""
      aria-hidden="true"
      className="fixed inset-0 z-[90]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      <svg className="absolute inset-0 size-full">
        <defs>
          <mask id="guide-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {frame && (
              <motion.rect
                fill="black"
                initial={false}
                animate={{ attrX: frame.left, attrY: frame.top, width: frame.width, height: frame.height, rx: frame.radius }}
                transition={move}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(2 6 23 / 0.58)" mask="url(#guide-spotlight)" />
      </svg>
      {frame && (
        <motion.div
          className="absolute left-0 top-0 border-2 border-primary shadow-[0_0_0_4px_oklch(0.74_0.14_180/0.22),0_0_40px_-6px_oklch(0.74_0.14_180/0.85)]"
          initial={false}
          animate={{ x: frame.left, y: frame.top, width: frame.width, height: frame.height, borderRadius: frame.radius }}
          transition={move}
        >
          {!reduced && (
            <motion.span
              className="absolute -inset-2 rounded-[inherit] border-2 border-primary/70"
              animate={{ opacity: [0.8, 0], scale: [1, 1.05] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
