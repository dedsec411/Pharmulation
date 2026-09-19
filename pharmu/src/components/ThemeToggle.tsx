import { motion, useReducedMotion } from "framer-motion";
import { flushSync } from "react-dom";
import { useRef } from "react";
import { applyTheme, useThemeStore, type Theme } from "@/lib/theme-store";

/**
 * The theme switch: a capsule holding a small sky.
 *
 * The capsule shape is the pharmacy object this product is named for and it
 * stays. What is inside it changed: pressing the switch runs the sky from day
 * to night, the sun's rays fold away as it becomes a crescent moon, stars come
 * up behind it, and the new theme is then wiped across the whole page in a
 * circle growing out of the button itself.
 *
 * The page wipe is the View Transitions API, which is the only way to animate
 * between two states of a document that has already re-rendered. It degrades
 * to an instant switch where the API is missing, and is skipped entirely for
 * anybody who has asked for less motion. `src/styles.css` holds the keyframes,
 * because the pseudo-elements it animates belong to the document, not here.
 *
 * role="switch" with aria-checked, so it is a switch to a screen reader
 * whatever it looks like.
 *
 * `slot` says WHEN this copy is actually on screen, which is what lets the
 * floating fallback in the root layout know whether it is needed:
 *
 *   always   - visible at every width (a landing page corner, the case header)
 *   desktop  - inside a `hidden md:flex` nav, so absent on a phone
 *   menu     - inside a menu that is shut until someone opens it
 *   floating - the fallback itself
 *
 * styles.css stands the fallback down only against a switch that is really
 * showing. Marking "desktop" as though it counted everywhere is what left a
 * phone with no switch at all on nav-bar screens.
 */

/** Eight rays, each its own rotation of the knob's box. */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Fixed star positions, never Math.random(): a random value in a render body
 * re-rolls on every re-render and mismatches between the server's HTML and the
 * client's, which is a trap this codebase has already been bitten by.
 */
const STARS = [
  { left: "60%", top: "26%", size: 2 },
  { left: "74%", top: "60%", size: 1.5 },
  { left: "86%", top: "34%", size: 1.5 },
  { left: "68%", top: "46%", size: 1 },
];

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

/**
 * Grow the new theme out of the button.
 *
 * The circle has to reach the corner furthest from the switch or the old theme
 * is left showing in a corner, which is why the radius is the longest diagonal
 * rather than a fixed size. The custom properties go on the document element
 * because ::view-transition pseudo-elements hang off the root, not off us.
 */
function wipeFrom(origin: HTMLElement | null, change: () => void, skip: boolean) {
  const doc = document as ViewTransitionDocument;
  if (skip || !origin || typeof doc.startViewTransition !== "function") {
    change();
    return;
  }
  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const root = document.documentElement;
  root.style.setProperty("--theme-reveal-x", `${Math.round(x)}px`);
  root.style.setProperty("--theme-reveal-y", `${Math.round(y)}px`);
  root.style.setProperty("--theme-reveal-r", `${Math.ceil(radius)}px`);
  doc.startViewTransition(change);
}

export function ThemeToggle({
  className = "",
  slot = "always",
}: {
  className?: string;
  slot?: "always" | "desktop" | "menu" | "floating";
}) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const dark = theme === "dark";
  const reduced = useReducedMotion();
  const button = useRef<HTMLButtonElement | null>(null);

  function press() {
    const next: Theme = dark ? "light" : "dark";
    wipeFrom(button.current, () => {
      // Both, and synchronously: the attribute is what the CSS selects on and
      // has to have changed before the transition takes its second snapshot,
      // while the store is what every other component reads.
      flushSync(() => setTheme(next));
      applyTheme(next);
    }, Boolean(reduced));
  }

  const ease = reduced ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <button
      ref={button}
      type="button"
      role="switch"
      data-theme-slot={slot}
      aria-checked={!dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={press}
      /* The capsule stays 32px tall - it is a drawn object, not a hit box - and
         a pseudo-element gives the finger the missing 12px on a phone. No
         overflow-hidden here: it would clip that pseudo-element away and take
         the phone's tap target with it. The sky below does its own clipping. */
      className={`group relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-border/70 transition duration-300 hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:after:absolute max-sm:after:-inset-x-2 max-sm:after:-inset-y-1.5 max-sm:after:content-[''] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
        {/* Two skies, cross-faded. One element whose colour changes cannot run
            a gradient from day to night; two stacked can. */}
        <motion.span
          animate={{ opacity: dark ? 0 : 1 }}
          transition={ease}
          className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-100"
        />
        <motion.span
          animate={{ opacity: dark ? 1 : 0 }}
          transition={ease}
          className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-900"
        />

        {STARS.map((star, i) => (
          <motion.span
            key={i}
            animate={{ opacity: dark ? 1 : 0, scale: dark ? 1 : 0.2 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, delay: dark ? 0.12 + i * 0.05 : 0 }}
            style={{ left: star.left, top: star.top, width: star.size * 2, height: star.size * 2 }}
            className="absolute rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]"
          />
        ))}

        {/* Clouds on the left, stars on the right: each sits opposite the
            body, which would otherwise be parked on top of them. */}
        {/* A lozenge alone reads as a dash, so each cloud is a base with a
            bump sitting on it - the least shape that still says "cloud". */}
        <motion.span
          animate={{ opacity: dark ? 0 : 1, x: dark ? -6 : 0 }}
          transition={ease}
          className="absolute left-[11%] top-[34%]"
        >
          <span className="block h-[7px] w-[17px] rounded-full bg-white" />
          <span className="absolute -top-[4px] left-[3px] size-[9px] rounded-full bg-white" />
          <span className="absolute -top-[2px] left-[10px] size-[7px] rounded-full bg-white" />
        </motion.span>
        <motion.span
          animate={{ opacity: dark ? 0 : 0.8, x: dark ? -4 : 0 }}
          transition={ease}
          className="absolute left-[30%] top-[62%]"
        >
          <span className="block h-[5px] w-[11px] rounded-full bg-white" />
          <span className="absolute -top-[3px] left-[2px] size-[6px] rounded-full bg-white" />
        </motion.span>
      </span>

      {/* The sun, which becomes the moon. `layout` carries it across; the
          morph below is all inside it. */}
      <motion.span
        layout
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
        className="relative z-10 grid size-6 place-items-center"
        style={{ marginLeft: dark ? "0.25rem" : "1.875rem" }}
      >
        {RAYS.map((deg) => (
          <span key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
            <motion.span
              animate={{ scaleY: dark ? 0 : 1, opacity: dark ? 0 : 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.3, delay: dark ? 0 : 0.14 }}
              className="absolute left-1/2 top-0 h-[3px] w-[1.5px] origin-top -translate-x-1/2 rounded-full bg-amber-300"
            />
          </span>
        ))}

        {/* One circle for both bodies. A filled inset ring is the sun; an
            offset one leaves exactly the crescent of a moon, so the two are
            the same property and the shape can actually animate between them
            rather than cross-fading two icons. */}
        <motion.span
          animate={{
            boxShadow: dark
              ? "inset -5px -2px 0 0 #e2e8f0, 0 0 7px 0 rgba(226,232,240,0.45)"
              : "inset 0 0 0 9px #fbbf24, 0 0 8px 0 rgba(251,191,36,0.65)",
            rotate: dark ? -22 : 0,
          }}
          transition={ease}
          className="size-[18px] rounded-full"
        />
      </motion.span>
    </button>
  );
}
