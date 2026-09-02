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
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className={`group relative inline-flex h-8 w-[3.75rem] shrink-0 items-center overflow-hidden rounded-full border border-border/70 transition duration-300 hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      {/* The capsule body: coloured half, powder half, seam between. */}
      <span aria-hidden="true" className="absolute inset-0 flex">
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
