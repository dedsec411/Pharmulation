import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, Compass, MessageCircle, MousePointerClick, PlayCircle, type LucideIcon } from "lucide-react";
import { EDGE, PERCH, bubbleWidth, type Point, type Size } from "@/lib/guide-flight";
import type { TutorialGuide } from "@/lib/tutorial";

type Props = {
  home: Point;
  viewport: Size;
  guide: TutorialGuide;
  spotCount: number;
  coaching: boolean;
  reduced: boolean;
  onScreen: () => void;
  onPick: () => void;
  onGuide: () => void;
  onChat: () => void;
  onLibrary: () => void;
  onCoaching: (on: boolean) => void;
  onClose: () => void;
};

type Item = { icon: LucideIcon; title: string; hint: string; onClick: () => void; disabled?: boolean };

/**
 * What tapping him offers, in the order people reach for it.
 *
 * "Show me around" first because it answers the question most people are
 * actually asking - what is all this - without them having to name anything.
 * The written guides come last: they are for looking something up, and the
 * glossary the demo jury asked for lives there.
 */
export function GuideMenu(p: Props) {
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
  }, []);

  const width = Math.min(340, bubbleWidth(p.viewport));
  // Sits above him, with him standing on its bottom-left corner.
  const bottom = p.viewport.height - (p.home.y + PERCH);
  const things = `${p.spotCount} ${p.spotCount === 1 ? "thing" : "things"} on this screen to point at`;

  const items: Item[] = [
    {
      icon: Compass,
      title: "Show me around this screen",
      hint: p.spotCount ? things : "Nothing to point at here, so I will talk you through the page",
      onClick: p.onScreen,
    },
    {
      icon: MousePointerClick,
      title: "What's this?",
      hint: "Tap anything outlined and I will fly over and explain it",
      onClick: p.onPick,
      disabled: p.spotCount === 0,
    },
    {
      icon: PlayCircle,
      title: "Walk me through it",
      hint: `${p.guide.label}, ${p.guide.steps.length} steps start to finish`,
      onClick: p.onGuide,
    },
    { icon: MessageCircle, title: "Ask me a question", hint: "Anything the tour does not cover", onClick: p.onChat },
    { icon: BookOpen, title: "Guides and short forms", hint: "Every written guide, and what the abbreviations stand for", onClick: p.onLibrary },
  ];

  return (
    <>
      <div data-guide-layer="" className="fixed inset-0 z-[93]" onClick={p.onClose} aria-hidden="true" />
      <motion.div
        data-guide-layer=""
        role="dialog"
        aria-label="Dr. Hakim"
        style={{ left: EDGE, bottom, width }}
        className="fixed z-[94] origin-bottom-left rounded-2xl border border-primary/30 bg-card p-2 pb-9 text-card-foreground shadow-[0_28px_70px_-24px_rgb(2_6_23/0.6)]"
        initial={{ opacity: 0, y: 14, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={p.reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
      >
        <div className="px-3 pb-1.5 pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Dr. Hakim</p>
          <p className="mt-0.5 text-sm font-semibold">How can I help?</p>
        </div>
        <ul className="grid gap-0.5">
          {items.map((item, i) => (
            <li key={item.title}>
              <button
                ref={i === 0 ? first : undefined}
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{item.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/50 px-3 pt-2.5">
          <span id="guide-coaching-label" className="text-xs text-muted-foreground">
            Come over when something is new
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={p.coaching}
            aria-labelledby="guide-coaching-label"
            onClick={() => p.onCoaching(!p.coaching)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              p.coaching ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-background shadow transition-all ${
                p.coaching ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <p className="pointer-events-none absolute bottom-2.5 right-4 text-[10px] text-muted-foreground" aria-hidden="true">
          Esc to close
        </p>
      </motion.div>
    </>
  );
}
