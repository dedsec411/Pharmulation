import { useState } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

/**
 * The theme switch, shaped as a capsule that opens.
 *
 * A toggle is already a lozenge, so rather than bolt a pill icon onto a
 * generic switch the control is drawn as the capsule itself: one coloured
 * half, one powder half, a seam down the middle, and the knob travelling
 * between them. It reads as a pharmacy object at a glance and as a switch on
 * second look, which is the right way round for something that lives in the
 * nav bar of a dispensing simulator.
 *
 * Pressing it pulls the capsule apart at the seam, scatters a little of what
 * was inside, and snaps it shut on the other side. Every part of that is a
 * transform or an absolutely positioned element, so the control occupies the
 * same 60x32 box at every frame and nothing around it moves.
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

/**
 * Where the granules go. Fixed, never random: a Math.random() in a render body
 * re-rolls on every re-render and mismatches between the server's HTML and the
 * client's, which is a documented trap in this codebase.
 */
const GRANULES = [
  { x: -17, y: -8, tone: "bg-primary" },
  { x: 16, y: -10, tone: "bg-foreground/80 dark:bg-white/90" },
  { x: -19, y: 6, tone: "bg-foreground/70 dark:bg-white/75" },
  { x: 18, y: 7, tone: "bg-primary/90" },
  { x: -3, y: -14, tone: "bg-primary/80" },
  { x: 4, y: 13, tone: "bg-foreground/60 dark:bg-white/65" },
] as const;

/**
 * One open-and-shut. The four stops matter: open by a third of the way in,
 * HELD open for the next fifth, then shut. Without that hold the halves turn
 * round at the peak and the whole thing reads as a wobble rather than as a
 * capsule being pulled apart and pushed back together.
 */
const PULL: Transition = { duration: 0.52, times: [0, 0.3, 0.5, 1], ease: "easeOut" };

export function ThemeToggle({
  className = "",
  slot = "always",
}: {
  className?: string;
  slot?: "always" | "desktop" | "menu" | "floating";
}) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const dark = theme === "dark";

  // MotionConfig reducedMotion="user" already flattens durations, but the
  // granules should not be there at all rather than be there instantly.
  const reduced = useReducedMotion();
  // Counts presses. Keying the moving parts on it replays the open, which an
  // animation driven by `dark` alone would not do on a double press back.
  const [presses, setPresses] = useState(0);
  const opening = presses > 0 && !reduced;

  return (
    <button
      type="button"
      role="switch"
      data-theme-slot={slot}
      aria-checked={!dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => { toggle(); setPresses((n) => n + 1); }}
      /* The capsule stays 32px tall - it is a drawn object, not a hit box - and
         a pseudo-element gives the finger the missing 12px on a phone. */
      className={`group relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-border/70 transition duration-300 hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:after:absolute max-sm:after:-inset-x-2 max-sm:after:-inset-y-1.5 max-sm:after:content-[''] ${className}`}
    >
      {/* The capsule body: coloured half, powder half, and the shell's inside
          showing through while the two are apart. Clipped here rather than on
          the button, whose hit area now reaches past it. */}
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full">
        {/* The shell's inside. Both halves are translucent, so a permanent
            colour behind them would tint the capsule shut as well as open -
            it is painted only while they are apart. */}
        <motion.span
          key={`i${presses}`}
          initial={{ opacity: 0 }}
          animate={opening ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={PULL}
          className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-foreground/45 dark:bg-slate-950/85"
        />
        <span className="absolute inset-0 flex">
          <motion.span
            key={`l${presses}`}
            animate={opening ? { x: [0, -6, -6, 0] } : undefined}
            transition={PULL}
            className="h-full w-1/2 rounded-l-full bg-primary/85"
          />
          <motion.span
            key={`r${presses}`}
            animate={opening ? { x: [0, 6, 6, 0] } : undefined}
            transition={PULL}
            className="h-full w-1/2 rounded-r-full bg-foreground/[0.09] dark:bg-white/85"
          />
        </span>
      </span>

      {/* The seam is only a seam while the halves are touching. */}
      <motion.span
        key={`s${presses}`}
        aria-hidden="true"
        animate={opening ? { opacity: [1, 0, 0, 1] } : undefined}
        transition={PULL}
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/25 dark:bg-slate-900/25"
      />

      {/* What was inside. Rendered only after a press, so nothing scatters on
          first paint, and never for a visitor who asked for less motion. */}
      {opening && (
        <span key={`g${presses}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {GRANULES.map((granule, i) => (
            <motion.span
              key={i}
              initial={{ x: -2, y: -2, opacity: 0.95, scale: 1 }}
              animate={{ x: granule.x, y: granule.y, opacity: 0, scale: 0.35 }}
              transition={{ duration: 0.52, ease: "easeOut", delay: i * 0.012 }}
              className={`absolute left-1/2 top-1/2 size-1 rounded-full ${granule.tone}`}
            />
          ))}
        </span>
      )}

      {/* Sits on the coloured half in dark, the powder half in light - the
          side you are switching away from stays visible as the destination.
          `layout` moves the knob; the pop lives on the inner span so the two
          are not both writing transform. */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className="relative z-10 grid size-6 place-items-center rounded-full bg-background shadow-[0_2px_8px_-2px_rgb(0_0_0/0.45)]"
        style={{ marginLeft: dark ? "0.25rem" : "1.875rem" }}
      >
        <motion.span
          key={`k${presses}`}
          animate={opening ? { scale: [1, 0.82, 1.06, 1] } : undefined}
          transition={{ duration: 0.46, ease: "easeOut" }}
          className="grid size-full place-items-center"
        >
          <motion.span
            key={dark ? "moon" : "sun"}
            initial={reduced ? false : { rotate: -110, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="grid place-items-center"
          >
            {dark
              ? <Moon className="size-3.5 text-primary" />
              : <Sun className="size-3.5 text-primary" />}
          </motion.span>
        </motion.span>
      </motion.span>
    </button>
  );
}
