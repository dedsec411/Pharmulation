import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { MENTOR_IMAGE } from "@/lib/mentor";
import { AVATAR, hopHeight, type Point } from "@/lib/guide-flight";

/**
 * Dr. Hakim himself.
 *
 * He is always on the page, and always the same element: waiting in the
 * corner, and flying to whatever he is explaining. One element rather than a
 * button that swaps for a tour overlay, because the flight *is* the
 * explanation of where to look - somebody watching him cross the screen to the
 * temperature slider has already found it before the bubble says a word.
 *
 * The motion is springs, not keyframes. A target that moves while he is on
 * his way (the page scrolling to reveal it) just moves the spring's end, and he
 * curves to follow instead of finishing a path to a spot that is now empty.
 */

export type HakimState = "docked" | "attentive" | "guiding";

const FLIGHT = { stiffness: 85, damping: 16, mass: 0.9 };

type Props = {
  to: Point;
  state: HakimState;
  reduced: boolean;
  interactive: boolean;
  onClick: () => void;
  label: string;
  badge: boolean;
  /** Stepped aside while a page modal is open; see TutorialBot. */
  hidden?: boolean;
};

export function FlyingHakim({ to, state, reduced, interactive, onClick, label, badge, hidden = false }: Props) {
  const x = useSpring(to.x, FLIGHT);
  const y = useSpring(to.y, FLIGHT);
  const hop = useMotionValue(0);
  const previous = useRef<Point>(to);

  useEffect(() => {
    const from = previous.current;
    previous.current = to;
    if (reduced) {
      x.jump(to.x);
      y.jump(to.y);
      hop.jump(0);
      return;
    }
    x.set(to.x);
    y.set(to.y);
    const height = hopHeight(from, to);
    // Only a real journey starts an arc. Following a target the page nudged
    // must not restart one already in the air, or he drops out of it mid-flight.
    if (height > 0) animate(hop, [hop.get(), -height, 0], { duration: 0.9, ease: "easeInOut" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to.x, to.y, reduced]);

  const vx = useVelocity(x);
  const vy = useVelocity(y);
  // He leans into the direction of travel, and the jet under him burns
  // brighter the faster he goes. At rest it is a faint glow: hovering, not parked.
  const lean = useTransform(vx, [-1500, 0, 1500], [-14, 0, 14]);
  const thrust = useTransform(() => Math.min(1, Math.hypot(vx.get(), vy.get()) / 900));
  const glow = useTransform(thrust, [0, 1], [0.28, 0.95]);
  const flame = useTransform(thrust, [0, 1], [0.6, 1.4]);
  const top = useTransform(() => y.get() + hop.get());

  const docked = state === "docked";

  return (
    <motion.button
      type="button"
      data-guide-layer=""
      onClick={onClick}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={label}
      style={{ x, y: top, rotate: reduced ? 0 : lean, width: AVATAR, height: AVATAR }}
      className={`group fixed left-0 top-0 rounded-full outline-none transition-opacity duration-200 focus-visible:ring-4 focus-visible:ring-primary/50 ${
        interactive ? "cursor-pointer" : "pointer-events-none"
      } ${hidden ? "opacity-0" : ""} ${docked ? "z-[55]" : "z-[96]"}`}
    >
      <motion.span
        aria-hidden="true"
        style={{ opacity: reduced ? 0.3 : glow, scaleX: reduced ? 1 : flame }}
        className="pointer-events-none absolute inset-x-0 -bottom-2.5 mx-auto h-4 w-10 rounded-full bg-primary blur-md"
      />
      <motion.span
        aria-hidden="true"
        className="relative block size-full"
        animate={reduced ? undefined : { y: [0, docked ? -3 : -5, 0] }}
        transition={{ duration: docked ? 3.4 : 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="absolute -inset-1.5 rounded-full border-2 border-dashed border-primary/50"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: docked ? 16 : 5, repeat: Infinity, ease: "linear" }}
        />
        <span
          className={`absolute inset-0 overflow-hidden rounded-full border-2 border-primary bg-gradient-to-b from-primary/35 via-card to-card shadow-[0_16px_36px_-14px_oklch(0.74_0.14_180/0.95)] transition-transform duration-300 ${
            interactive ? "group-hover:scale-105" : ""
          }`}
        >
          <img
            src={MENTOR_IMAGE}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-[8%] h-[150%] w-auto max-w-none -translate-x-1/2 select-none"
          />
        </span>
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-background bg-primary" />
        )}
      </motion.span>
      {docked && interactive && (
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full border border-primary/30 bg-card px-3 py-1 text-xs font-semibold text-foreground opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
          Dr. Hakim · tap for help
        </span>
      )}
    </motion.button>
  );
}
