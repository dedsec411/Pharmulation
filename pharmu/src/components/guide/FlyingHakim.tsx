import { useEffect, useRef, useState } from "react";
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

/**
 * He gets out of the way of whatever he has come to rest on.
 *
 * He waits in a fixed corner, so what is underneath him is whatever the reader
 * has scrolled to: measured across the app, that was the Save button on
 * Settings (56% of it at 390px), the certificate download on the profile, and
 * a different drug's Save button every screen of the database. A corner that
 * is empty on a wide screen is the middle of the content column on a phone.
 *
 * So the page decides, not the width: when an interactive control is actually
 * under his centre he fades back and stops taking taps, which hands the press
 * to the control he was sitting on. Nothing is under him on a desktop's left
 * margin, so nothing changes there. One hit test after scrolling stops - no
 * polling, no width, no layout written back.
 */
const TAPPABLE = "a[href], button, input, select, textarea, [role='switch'], [role='tab'], [role='checkbox']";
/**
 * Where he looks to see what he is standing on, in fractions of his own box.
 *
 * Centre, quarters, and the middle of each edge. The edges earn their place:
 * with the quarters alone he still sat on a 4% sliver of "View full
 * leaderboard" and 5% of "Delete account" at 360px, where the button clipped
 * his rim between the points he was testing.
 */
const CORNERS: Array<[number, number]> = [
  [0.5, 0.5],
  [0.22, 0.22], [0.78, 0.22], [0.22, 0.82], [0.78, 0.82],
  [0.5, 0.04], [0.5, 0.96], [0.04, 0.5], [0.96, 0.5],
];

function useYieldToContent(ref: React.RefObject<HTMLElement | null>, active: boolean): boolean {
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    if (!active) {
      setCovering(false);
      return;
    }
    let frame = 0;
    let idle = 0;
    const check = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      // Five points rather than his middle. Measured: his lower edge was
      // sitting on 59% of the Save button on Settings while his centre was
      // over the card above it, so a single reading called that clear.
      const onControl = CORNERS.some(([fx, fy]) =>
        document.elementsFromPoint(box.left + box.width * fx, box.top + box.height * fy)
          .some((node) => !node.closest("[data-guide-layer]") && node.closest(TAPPABLE)));
      setCovering(onControl);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    // After the movement stops rather than during it: mid-scroll he would
    // blink on and off past every card.
    const soon = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(schedule, 140);
    };
    /**
     * Scrolling is not the only way the page arrives under him.
     *
     * The first reading happens before his spring has landed and before the
     * page below has painted, so it finds nothing - and a page opened at the
     * top and never scrolled never asks again. Measured: he sat on 59% of the
     * Save button on Settings, having decided at mount that the corner was
     * empty. So the page changing counts too, and one late look catches the
     * paint that mount was too early for.
     */
    const observer = new MutationObserver(soon);
    observer.observe(document.body, { childList: true, subtree: true });
    const settle = window.setTimeout(schedule, 700);
    schedule();
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", soon);
      window.removeEventListener("resize", soon);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.clearTimeout(settle);
    };
  }, [ref, active]);
  return covering;
}

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
  // Only while he is parked: in flight he is the thing being watched, and the
  // spotlight has already taken the page's clicks.
  const self = useRef<HTMLButtonElement | null>(null);
  const yielding = useYieldToContent(self, docked && interactive && !hidden);

  return (
    <motion.button
      ref={self}
      type="button"
      data-guide-layer=""
      data-guide-yielding={yielding ? "" : undefined}
      onClick={onClick}
      /* Still reachable by keyboard while he is faded: a tap landing on the
         control underneath is the point, but Tab was never the problem. */
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={label}
      style={{ x, y: top, rotate: reduced ? 0 : lean, width: AVATAR, height: AVATAR }}
      className={`group fixed left-0 top-0 rounded-full outline-none transition-opacity duration-200 focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:!opacity-100 ${
        interactive && !yielding ? "cursor-pointer" : "pointer-events-none"
      } ${hidden ? "opacity-0" : yielding ? "opacity-20" : ""} ${docked ? "z-[55]" : "z-[96]"}`}
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
