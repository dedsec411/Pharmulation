import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Bot, Camera, Check, Compass, FlaskConical, GraduationCap, HeartPulse, Package, Pill,
  PlayCircle, Search, Trophy, X, type LucideIcon,
} from "lucide-react";
import { MENTOR_IMAGE } from "@/lib/mentor";
import { GUIDES, type GuideIcon } from "@/lib/tutorial";
import { glossaryAlphabetical } from "@/lib/glossary";
import { useSettings } from "@/lib/settings-store";

const ICONS: Record<GuideIcon, LucideIcon> = {
  compass: Compass, trophy: Trophy, book: BookOpen, pill: Pill, heart: HeartPulse,
  flask: FlaskConical, package: Package, search: Search, cap: GraduationCap,
  camera: Camera, bot: Bot,
};

/**
 * Every guide the library can open, in the order somebody would want it.
 *
 * Opening the library shows the guide for the page you are on, which is right
 * for "what is this screen" but leaves the full tour unreachable once it has
 * been finished. This list is the way back to any of them.
 */
const INDEX = ["tour", "dashboard", "modes", "community", "clinical", "industry", "warehousing", "class", "drugs"];

type Props = {
  guideKey: string;
  onClose: () => void;
  onWalk: (guideKey: string) => void;
  onOpen: (guideKey: string) => void;
};

/**
 * The written guides, kept for looking something up.
 *
 * The flying guide replaced the side panel as the way to *learn* a screen, not
 * as the way to find one answer fast: somebody who wants to know what GRN
 * stands for does not want a tour. So the reading view survives here - every
 * step of a guide, the short forms the demo jury asked for, and an index of
 * every other guide - with a button that hands any of them to the flying guide.
 */
export function GuideLibrary({ guideKey, onClose, onWalk, onOpen }: Props) {
  const guide = GUIDES[guideKey] ?? GUIDES.generic;
  const Icon = ICONS[guide.icon] ?? Bot;
  const plainEnglish = useSettings((state) => state.plainEnglish);
  const setPlainEnglish = useSettings((state) => state.setPlainEnglish);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [guide.key]);

  return (
    <>
      <motion.div
        data-guide-layer=""
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-[93] bg-background/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.aside
        data-guide-layer=""
        role="dialog"
        aria-modal="true"
        aria-label={`${guide.label} guide`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed inset-y-0 right-0 z-[95] flex w-full max-w-md flex-col border-l border-border/50 bg-card text-card-foreground shadow-2xl"
      >
        <header className="shrink-0 border-b border-border/40 bg-primary/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-gradient-to-b from-primary/30 to-card">
                <img src={MENTOR_IMAGE} alt="" className="absolute left-1/2 top-[8%] h-[150%] w-auto max-w-none -translate-x-1/2" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Dr. Hakim</p>
                <h2 className="truncate text-lg font-black leading-tight">{guide.label}</h2>
                <p className="truncate text-xs text-muted-foreground">{guide.role}</p>
              </div>
            </div>
            <button
              ref={closeButton}
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close the guide"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div ref={body} className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {guide.blurb}
          </p>
          <button
            type="button"
            onClick={() => onWalk(guide.key)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.99]"
          >
            <PlayCircle className="size-4" aria-hidden="true" /> Walk me through it
          </button>

          <ol className="mt-6 space-y-4">
            {guide.steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-black tabular-nums text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  {s.action && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-primary">
                      <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {s.action}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* The demo jury could not read the screens because the short forms
              assume you already know them. This is the one place somebody
              looking for help will already be. */}
          <div className="mt-7 border-t border-border/40 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Short forms</p>
              <button
                type="button"
                onClick={() => setPlainEnglish(!plainEnglish)}
                aria-pressed={plainEnglish}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-[0.97] ${
                  plainEnglish
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {plainEnglish ? "Plain English is on" : "Write them out in full"}
              </button>
            </div>
            <dl className="mt-3 space-y-2.5">
              {glossaryAlphabetical().map((entry) => (
                <div key={entry.term} className="flex gap-3">
                  <dt className="w-14 shrink-0 text-sm font-black tabular-nums text-primary">{entry.term}</dt>
                  <dd className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{entry.full}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.plain}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-7 border-t border-border/40 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Other guides</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INDEX.filter((key) => key !== guide.key && GUIDES[key]).map((key) => {
                const other = GUIDES[key];
                const OtherIcon = ICONS[other.icon] ?? Bot;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onOpen(key)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1.5 text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/10"
                  >
                    <OtherIcon className="size-3.5 text-primary" aria-hidden="true" />
                    {other.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border/40 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-border/60 py-2.5 text-sm font-semibold transition hover:bg-muted"
          >
            Close the guide
          </button>
        </footer>
      </motion.aside>
    </>
  );
}
