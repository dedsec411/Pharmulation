import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

/**
 * The theme switch, shaped as a capsule.
 *
 * A toggle is already a lozenge, so rather than bolt a pill icon onto a
 * generic switch the control is drawn as the capsule itself: one coloured
 * half, one white half, a seam down the middle, and the knob travelling
 * between them. It reads as a pharmacy object at a glance and as a switch on
 * second look, which is the right way round for something that lives in the
 * nav bar of a dispensing simulator.
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

  return (
    <button
      type="button"
      role="switch"
      data-theme-slot={slot}
      aria-checked={!dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      /* The capsule stays 32px tall - it is a drawn object, not a hit box - and
         a pseudo-element gives the finger the missing 12px on a phone. */
      className={`group relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-border/70 transition duration-300 hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:after:absolute max-sm:after:-inset-x-2 max-sm:after:-inset-y-1.5 max-sm:after:content-[''] ${className}`}
    >
      {/* The capsule body: coloured half, powder half, seam between. Clipped
          here rather than on the button, whose hit area now reaches past it. */}
      <span aria-hidden="true" className="absolute inset-0 flex overflow-hidden rounded-full">
        <span className="h-full w-1/2 bg-primary/85" />
        <span className="h-full w-1/2 bg-foreground/[0.09] dark:bg-white/85" />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/25 dark:bg-slate-900/25"
      />

      {/* Sits on the coloured half in dark, the powder half in light - the
          side you are switching away from stays visible as the destination. */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className="relative z-10 grid size-6 place-items-center rounded-full bg-background shadow-[0_2px_8px_-2px_rgb(0_0_0/0.45)]"
        style={{ marginLeft: dark ? "0.25rem" : "1.875rem" }}
      >
        {dark
          ? <Moon className="size-3.5 text-primary" />
          : <Sun className="size-3.5 text-primary" />}
      </motion.span>
    </button>
  );
}
