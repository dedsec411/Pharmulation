import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, type LucideIcon } from "lucide-react";

export type ShellMenuItem = { to: LinkProps["to"]; label: string; icon: LucideIcon };

type Props = {
  /** The section you are in, shown on the button - the phone bar's one piece of wayfinding. */
  current: string;
  /** Leading mark inside the button: the account's initials, or the faculty cap. */
  badge?: ReactNode;
  /** Top of the panel: who is signed in, or which faculty this is. */
  heading?: ReactNode;
  /** The destinations. Laid out as large tiles, the current one marked. */
  items: ShellMenuItem[];
  /** Rows under the destinations - settings, theme, sign out. Given `close` for links. */
  footer?: (close: () => void) => ReactNode;
  /** Accessible name for the destination list. */
  label: string;
  /** What the guide flies to; see src/lib/tutorial-spots.ts. */
  tour?: string;
  /** Placement within the bar, e.g. ml-auto. */
  className?: string;
};

/**
 * The navigation on a phone: one control beside the logo, and a panel that
 * drops from the bar.
 *
 * Why not the other shapes. A bottom tab bar is the phone-native answer, but
 * this app already keeps its busiest fixed furniture at the bottom - Dr.
 * Hakim's corner, the chat, the page-end clearance - and game screens have no
 * navigation bar at all, so a tab bar would appear and vanish between pages
 * and fight the guide for the same thumb space. A second row of scrolling pills
 * under the bar would add sticky height to every page and a sideways scroller
 * inside it. What was here before was a 190px dropdown hanging off the initials,
 * with the destinations crammed into 36px rows and no mark of where you were.
 *
 * So: a panel under the bar, destinations as 56px tiles, the current one lit,
 * everything else a comfortable row below. It closes on a route change, on
 * Escape, on a tap outside, and when focus leaves it.
 *
 * Rendered below md only. The desktop bar is untouched by this component.
 */
export function ShellMenu({ current, badge, heading, items, footer, label, tour, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  // However the page changed - a tile, the logo, the browser's back button.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // Into the panel, so a keyboard or screen reader lands on the destinations
    // it just opened rather than being left on the button behind them.
    panel.current?.querySelector<HTMLElement>("a[href], button")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className={`md:hidden ${className}`}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : `Menu, ${current}`}
        data-tour={tour}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 max-w-[11.5rem] items-center gap-2 rounded-full border border-border/60 bg-foreground/[0.06] pl-1.5 pr-3.5 text-sm font-semibold text-foreground transition active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {badge}
        <span className="min-w-0 truncate">{current}</span>
        {open
          ? <X className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          : <Menu className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Starts under the bar, so the bar and its close button stay lit. */}
            <motion.div
              key="scrim"
              aria-hidden="true"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-x-0 top-full h-dvh bg-background/70"
            />
            <motion.div
              key="panel"
              ref={panel}
              id={panelId}
              data-app-menu=""
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-3 top-full mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card p-3 text-card-foreground shadow-[0_24px_60px_-24px_rgb(2_6_23/0.7)]"
            >
              {heading}
              <ul aria-label={label} className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={close}
                      className="flex min-h-14 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      activeProps={{ className: "border-primary/45 bg-primary/12 text-primary" }}
                      inactiveProps={{ className: "border-border/50 bg-foreground/[0.03] text-foreground/90" }}
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {footer && <div className="mt-2 border-t border-border/50 pt-2">{footer(close)}</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One full-width row in the panel's footer. Links and buttons share the look. */
export const shellRowClass =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-foreground/90 transition hover:bg-foreground/[0.05] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
