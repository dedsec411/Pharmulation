import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { PharmacistChat } from "@/components/PharmacistChat";
import {
  BookOpen, Bot, Camera, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Compass, FlaskConical, GraduationCap, HeartPulse, LifeBuoy, ListChecks,
  Package, Pill, PlayCircle, Search, Trophy, X, type LucideIcon,
} from "lucide-react";
import { MENTOR_IMAGE } from "@/lib/mentor";
import {
  GUIDES, guideForPath, hasGuide, type GuideIcon, type TutorialGuide,
} from "@/lib/tutorial";
import { binFor, hasSeenGuide, markGuideSeen, shouldAutoRunTour } from "@/lib/tutorial-seen";
import { useTutorialStore } from "@/lib/tutorial-store";
import { useSettings } from "@/lib/settings-store";
import { glossaryAlphabetical } from "@/lib/glossary";

/**
 * Everything the panel can be asked for, in the order somebody would want it.
 *
 * The tab opens whatever belongs to the page you are on, which is right for
 * "what is this screen" but wrong for "remind me how the whole thing works" -
 * after the tour is finished the dashboard tab offers the dashboard, and the
 * tour itself becomes unreachable. This list is the way back to any of them.
 */
const INDEX = ["tour", "dashboard", "modes", "community", "clinical", "industry", "warehousing", "class", "drugs"];

/**
 * The guide, and the tab that brings it back.
 *
 * What was here before ran once and then had nowhere to go: dismissing it
 * wrote a "done" flag that nothing ever read, and the only floating button on
 * screen opened the chat. Somebody who skipped the tour on their first
 * afternoon could not find it again at all.
 *
 * So the guide now lives on the right-hand edge and stays there. It opens two
 * ways depending on who is asking: a first-timer is walked through it a step
 * at a time, and somebody coming back for a reminder gets the whole thing
 * listed, because they are looking for one answer rather than a tour.
 */

const ICONS: Record<GuideIcon, LucideIcon> = {
  compass: Compass, trophy: Trophy, book: BookOpen, pill: Pill, heart: HeartPulse,
  flask: FlaskConical, package: Package, search: Search, cap: GraduationCap,
  camera: Camera, bot: Bot,
};

export function TutorialBot() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, setProfile } = useAuthStore();
  const { open, requestedKey, view, openForPage, openGuide, close, setView } = useTutorialStore();

  const plainEnglish = useSettings((state) => state.plainEnglish);
  const setPlainEnglish = useSettings((state) => state.setPlainEnglish);
  const [step, setStep] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const userId = profile?.user_id ?? null;
  const pageGuide = useMemo(() => guideForPath(pathname), [pathname]);
  const guide: TutorialGuide = requestedKey ? (GUIDES[requestedKey] ?? pageGuide) : pageGuide;

  // Storage is read after mount only. Touching it during render would differ
  // between the server pass and the browser and tear the page on hydration.
  useEffect(() => { setMounted(true); }, []);

  const bin = useMemo(() => (mounted && userId ? binFor(userId) : null), [mounted, userId]);

  useEffect(() => { setStep(0); }, [guide.key, view]);

  const remember = useCallback((key: string) => {
    if (userId) markGuideSeen(bin, userId, key);
  }, [bin, userId]);

  /**
   * The first sight of the app.
   *
   * Held to the dashboard because that is the first signed-in page anybody
   * lands on, and delayed a beat so the tour does not race the page it is
   * describing onto the screen.
   */
  useEffect(() => {
    if (!mounted || !userId || !pathname.includes("/dashboard") || pathname.includes("/educator")) return;
    if (!shouldAutoRunTour({
      userId,
      seenLocally: hasSeenGuide(bin, userId, "tour"),
      onboardingCompleted: !!profile?.onboarding_completed,
    })) return;
    const timer = window.setTimeout(() => {
      useTutorialStore.getState().openGuide("tour", "walkthrough");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [mounted, userId, bin, pathname, profile?.onboarding_completed]);

  // The landing page sells the product and the auth pages are two fields.
  // Neither wants a mentor hovering over it, which is how it was before.
  const inApp = hasGuide(pathname);
  if (!mounted || !inApp) return null;

  const seen = userId ? hasSeenGuide(bin, userId, guide.key) : false;

  function finish() {
    remember(guide.key);
    // Written so a second device does not repeat it; read back by
    // shouldAutoRunTour, which ignores it for the shared demo account.
    if (guide.key === "tour") void completeOnboarding();
    close();
  }

  /**
   * Kept in step with the database for a real account so a second device does
   * not repeat the tour. The demo account writes nothing: it is shared, and
   * marking it complete would take the tour away from the next visitor.
   */
  async function completeOnboarding() {
    if (!profile || profile.onboarding_completed) return;
    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", profile.user_id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[supabase] failed to mark onboarding complete:", error);
      return;
    }
    if (data) setProfile(data as typeof profile);
  }

  const Icon = ICONS[guide.icon] ?? Bot;
  const current = guide.steps[Math.min(step, guide.steps.length - 1)];
  const isLast = step === guide.steps.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setChatOpen((o) => !o)}
        className="group fixed bottom-5 left-5 z-50 grid size-16 place-items-center rounded-2xl border border-primary/35 bg-card/80 text-primary shadow-[0_18px_45px_-18px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-primary/15"
        aria-label="Ask the pharmacist mentor a question"
      >
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-background bg-primary text-[9px] font-black text-primary-foreground shadow-lg">
          Hi
        </span>
        <img
          src={MENTOR_IMAGE}
          alt=""
          className="h-14 w-14 object-contain object-top drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)] transition duration-300 group-hover:scale-110"
        />
      </button>

      <PharmacistChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* The permanent way back in. Vertical so it costs almost no width on a
          phone, and hidden while the panel it opens is already open. */}
      {!open && (
        <button
          type="button"
          onClick={() => openForPage(seen ? "contents" : "walkthrough")}
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-xl border border-r-0 border-primary/35 bg-card/90 py-3 pl-2.5 pr-2 text-primary shadow-[0_12px_36px_-18px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl transition hover:bg-primary/15"
          aria-label={`Open the guide for ${guide.label}`}
        >
          <LifeBuoy className="size-4" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] [writing-mode:vertical-rl]">
            Guide
          </span>
          {!seen && (
            <span className="absolute -left-1 top-2 size-2 rounded-full bg-primary" aria-hidden="true" />
          )}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px]"
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={`${guide.label} guide`}
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl"
            >
              <header className="relative shrink-0 overflow-hidden border-b border-border/40 bg-primary/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-background/45 text-primary">
                      <img src={MENTOR_IMAGE} alt="" className="h-14 w-12 object-contain object-top" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Dr. Hakim</p>
                      <h2 className="truncate text-lg font-black leading-tight">{guide.label}</h2>
                      <p className="truncate text-xs text-muted-foreground">{guide.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Close the guide"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Both ways of reading it stay reachable, whichever it opened
                    in - somebody part-way through a walkthrough often wants to
                    see how much is left. */}
                <div className="mt-3 flex gap-1 rounded-full bg-background/50 p-1 text-xs font-semibold">
                  {([
                    { id: "walkthrough" as const, label: "Walk me through", icon: PlayCircle },
                    { id: "contents" as const, label: "All steps", icon: ListChecks },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setView(tab.id)}
                      aria-pressed={view === tab.id}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                        view === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="size-3.5" aria-hidden="true" /> {tab.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {view === "contents" ? (
                  <div>
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {guide.blurb}
                    </p>
                    <ol className="mt-5 space-y-4">
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

                    {/* The demo jury could not read the screens because the
                        short forms assume you already know them. This is the
                        one place somebody looking for help will already be. */}
                    <div className="mt-7 border-t border-border/40 pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          Short forms
                        </p>
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
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Other guides
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {INDEX.filter((key) => key !== guide.key && GUIDES[key]).map((key) => {
                          const other = GUIDES[key];
                          const OtherIcon = ICONS[other.icon] ?? Bot;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => openGuide(key, "contents")}
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
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${guide.key}-${step}`}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 tabular-nums text-primary">
                          Step {step + 1} of {guide.steps.length}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold leading-snug">{current.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
                      {current.action && (
                        <p className="mt-4 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm font-medium text-primary">
                          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          {current.action}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <footer className="shrink-0 border-t border-border/40 p-4">
                {view === "contents" ? (
                  <button
                    type="button"
                    onClick={finish}
                    className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.99]"
                  >
                    Close the guide
                  </button>
                ) : (
                  <>
                    <div className="mb-3 flex gap-1.5" aria-hidden="true">
                      {guide.steps.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-border"}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={finish}
                        className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        Skip
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={step === 0}
                          onClick={() => setStep((n) => Math.max(0, n - 1))}
                          className="inline-flex items-center gap-1 rounded-full border border-border/50 px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-40"
                        >
                          <ChevronLeft className="size-4" aria-hidden="true" /> Back
                        </button>
                        {isLast ? (
                          <button
                            type="button"
                            onClick={finish}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                          >
                            <CheckCircle2 className="size-4" aria-hidden="true" /> Done
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStep((n) => Math.min(guide.steps.length - 1, n + 1))}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                          >
                            Next <ChevronRight className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
