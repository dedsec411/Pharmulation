import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useSittingLock } from "@/lib/educator/assessment";
import { useSettings } from "@/lib/settings-store";
import { PharmacistChat } from "@/components/PharmacistChat";
import { GUIDES, guideForPath, hasGuide } from "@/lib/tutorial";
import { binFor, hasSeenGuide, markGuideSeen, shouldAutoRunTour } from "@/lib/tutorial-seen";
import { guideLocked, useTutorialStore } from "@/lib/tutorial-store";
import {
  SPOTS, guideSteps, newHereSteps, sceneSeenKey, scenesCovered, scenesToIntroduce, screenSteps, spotStep,
  type TourStep,
} from "@/lib/tutorial-spots";
import { bubbleWidth, dockPoint, placeCallout, spotlightFrame, visiblePart, type Size } from "@/lib/guide-flight";
import { findAnchors, pageIsCovered, scenesOnPage } from "@/components/guide/dom";
import { useTrackedRect } from "@/components/guide/useTrackedRect";
import { FlyingHakim } from "@/components/guide/FlyingHakim";
import { Spotlight } from "@/components/guide/Spotlight";
import { GuideBubble } from "@/components/guide/GuideBubble";
import { GuideMenu } from "@/components/guide/GuideMenu";
import { PickLayer } from "@/components/guide/PickLayer";
import { GuideLibrary } from "@/components/guide/GuideLibrary";

/**
 * Dr. Hakim, the guide that flies.
 *
 * The guide used to be a panel on the right edge: a list of paragraphs about a
 * screen, read beside the screen. It explained where the temperature slider
 * was without ever showing it, and it was the same wall of text whether you
 * were looking at the slider or had not reached it yet.
 *
 * Now he waits in the bottom-left corner - where the mentor button always was
 * - and does three things there:
 *
 *  - The first time a screen appears, he flies over by himself, lands beside
 *    each of its controls in turn and says what it is for, with the rest of the
 *    page dimmed. Once per screen, per account; the guest account forgets with
 *    the tab, so every visitor at a stand gets him.
 *  - Tapped, he offers a tour of the screen you are on, a What's-this mode for
 *    pointing at one thing, the chat, and the written guides.
 *  - He never appears in a graded sitting or a live session, and the case
 *    clock stops for as long as he is covering the page.
 *
 * The decisions live in tested modules: where to land in guide-flight, what to
 * say in tutorial-spots, when to stop the clock in tutorial-store. This file
 * wires them to the page.
 */

function readViewport(): Size {
  if (typeof window === "undefined") return { width: 1280, height: 800 };
  // clientWidth leaves out the scrollbar, which a bubble placed hard against
  // the right edge would otherwise sit underneath.
  return { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
}

function useViewport(): Size {
  const [size, setSize] = useState(readViewport);
  useEffect(() => {
    const update = () => setSize(readViewport());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function countSpots(): number {
  return new Set(findAnchors().map((a) => a.id).filter((id) => SPOTS[id])).size;
}

export function TutorialBot() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, setProfile } = useAuthStore();
  const sitting = useSittingLock();
  const coaching = useSettings((state) => state.guideCoaching);
  const setCoaching = useSettings((state) => state.setGuideCoaching);
  const activity = useTutorialStore((state) => state.activity);
  const request = useTutorialStore((state) => state.request);
  const requestId = useTutorialStore((state) => state.requestId);
  const libraryKey = useTutorialStore((state) => state.libraryKey);
  const chatOpen = useTutorialStore((state) => state.chatOpen);
  const reduced = !!useReducedMotion();
  const viewport = useViewport();

  const [mounted, setMounted] = useState(false);
  const [tour, setTour] = useState<{ id: number; steps: TourStep[] }>({ id: -1, steps: [] });
  const [index, setIndex] = useState(0);
  const [bubbleHeight, setBubbleHeight] = useState(220);
  const [spotCount, setSpotCount] = useState(0);

  const userId = profile?.user_id ?? null;
  const pageGuide = useMemo(() => guideForPath(pathname), [pathname]);
  const locked = guideLocked({ pathname, sitting });
  const inApp = hasGuide(pathname);

  // Storage and the DOM are read after mount only. Touching either during
  // render would differ between the server pass and the browser.
  useEffect(() => {
    setMounted(true);
  }, []);

  const bin = useMemo(() => (mounted && userId ? binFor(userId) : null), [mounted, userId]);
  const seen = useCallback((key: string) => (userId ? hasSeenGuide(bin, userId, key) : false), [bin, userId]);

  // A tour is about the page it started on. Leaving the page leaves its
  // controls behind, and a promised introduction with them.
  useEffect(() => {
    const store = useTutorialStore.getState();
    store.hold(false);
    if (store.activity !== "docked") store.dock();
  }, [pathname]);

  useEffect(() => {
    if (!locked) return;
    const store = useTutorialStore.getState();
    store.dock();
    store.setChatOpen(false);
  }, [locked]);

  // Turn a request into stops, against the page as it is right now. Resolved
  // once per request on purpose: a tour whose stops reshuffled as the page
  // changed under it would skip steps or repeat them.
  useEffect(() => {
    if (activity !== "touring" || !request) return;
    const found = findAnchors().map(({ id, scene }) => ({ id, scene }));
    let steps: TourStep[] = [];
    if (request.kind === "guide") {
      steps = guideSteps(GUIDES[request.guideKey] ?? pageGuide);
    } else if (request.kind === "screen") {
      steps = screenSteps(found);
      // A page with nothing marked on it still has a guide worth hearing.
      if (!steps.length) steps = guideSteps(pageGuide);
    } else if (request.kind === "spot") {
      const one = spotStep(found.find((a) => a.id === request.spotId) ?? { id: request.spotId, scene: null });
      steps = one ? [one] : [];
    } else {
      const scenes = scenesToIntroduce(scenesOnPage(found), seen);
      steps = newHereSteps(request.guideKey ? (GUIDES[request.guideKey] ?? null) : null, found, scenes);
      // Screens with nothing to say would otherwise be offered again on every
      // change to the page, forever.
      if (!steps.length && userId) for (const scene of scenes) markGuideSeen(bin, userId, sceneSeenKey(scene));
    }
    if (!steps.length) {
      useTutorialStore.getState().dock();
      return;
    }
    setTour({ id: requestId, steps });
    setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, requestId]);

  const touring = activity === "touring" && tour.id === requestId && tour.steps.length > 0;
  const steps = touring ? tour.steps : [];
  const step = touring ? steps[Math.min(index, steps.length - 1)] : null;
  const targetRect = useTrackedRect(step?.target ?? null, reduced);

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

  /** Done and Skip end the same way: what was shown is remembered either way. */
  function finishTour() {
    const store = useTutorialStore.getState();
    const req = store.request;
    const keys = scenesCovered(steps).map(sceneSeenKey);
    if (req?.kind === "guide") keys.push(req.guideKey);
    if (req?.kind === "new" && req.guideKey) keys.push(req.guideKey);
    if (req?.kind === "guide" && req.guideKey === "tour") {
      // The tour walks the dashboard already; its own introduction would be
      // the same stops a second time.
      keys.push(sceneSeenKey("dashboard"));
      void completeOnboarding();
    }
    if (userId) for (const key of keys) markGuideSeen(bin, userId, key);
    setTour({ id: -1, steps: [] });
    if (req?.kind === "spot" && req.backToPicking) store.startPicking();
    else store.dock();
  }

  function next() {
    if (index < steps.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    // A mode's overview starts a beat after the difficulty is picked, which on
    // a slow load is before the case has arrived - so the controls it promises
    // may not have existed when the tour began. Look again before finishing,
    // and carry straight on into them rather than ending and starting a second
    // tour a moment later.
    if (useTutorialStore.getState().request?.kind === "new") {
      const found = findAnchors().map(({ id, scene }) => ({ id, scene }));
      const covered = new Set(scenesCovered(steps));
      const fresh = scenesToIntroduce(scenesOnPage(found), seen).filter((scene) => !covered.has(scene));
      const more = newHereSteps(null, found, fresh);
      if (more.length) {
        setTour((t) => ({ ...t, steps: [...t.steps, ...more] }));
        setIndex((i) => i + 1);
        return;
      }
    }
    finishTour();
  }

  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  // Escape leaves, the arrow keys walk. Re-bound every render so the handler
  // never acts on a stale step.
  useEffect(() => {
    if (activity === "docked") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (touring) finishTour();
        else useTutorialStore.getState().dock();
        return;
      }
      if (!touring) return;
      const el = event.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (activity === "menu") setSpotCount(countSpots());
  }, [activity]);

  /**
   * Coming over by himself.
   *
   * Watches the page for new screens rather than being told about them,
   * because screens change in ways no one component knows about: a phase
   * advancing, a modal closing, the room controls opening. Throttled rather
   * than debounced - the ambient animations never stop mutating the page, and
   * a debounce would wait for a quiet moment that never comes.
   *
   * Nothing starts over a modal, while a mode's own introduction is on its
   * way, or while the chat is open.
   */
  useEffect(() => {
    if (!mounted || !userId || !inApp || locked || !coaching) return;
    let timer = 0;
    const run = () => {
      timer = 0;
      const store = useTutorialStore.getState();
      if (store.activity !== "docked" || store.holding || store.chatOpen) return;
      if (document.visibilityState === "hidden" || pageIsCovered()) return;
      const onDashboard = pathname.includes("/dashboard") && !pathname.includes("/educator");
      if (onDashboard && shouldAutoRunTour({
        userId,
        seenLocally: seen("tour"),
        onboardingCompleted: !!profile?.onboarding_completed,
      })) {
        store.startTour({ kind: "guide", guideKey: "tour" });
        return;
      }
      if (scenesToIntroduce(scenesOnPage(findAnchors()), seen).length) {
        store.startTour({ kind: "new", guideKey: null });
      }
    };
    const schedule = () => {
      if (!timer) timer = window.setTimeout(run, 900);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const unsubscribe = useTutorialStore.subscribe((state, prev) => {
      if (state.activity === "docked" && prev.activity !== "docked") schedule();
      if (!state.holding && prev.holding) schedule();
    });
    schedule();
    return () => {
      observer.disconnect();
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [mounted, userId, inApp, locked, coaching, pathname, seen, profile?.onboarding_completed]);

  // The landing page sells the product and the auth pages are two fields.
  if (!mounted || !inApp || locked) return null;

  const store = useTutorialStore.getState();
  const home = dockPoint(viewport);
  const width = bubbleWidth(viewport);
  const onScreen = targetRect ? visiblePart(targetRect, viewport) : null;
  const callout = placeCallout({ target: onScreen, viewport, bubble: { width, height: bubbleHeight } });
  const frame = onScreen ? spotlightFrame(onScreen, viewport) : null;
  const isLast = index >= steps.length - 1;
  // The overview always offers to show the controls, even when none were on
  // the page yet: next() looks again when it is pressed.
  const primaryLabel = step?.list ? "Show me" : isLast ? "Done" : "Next";

  function onAvatar() {
    const s = useTutorialStore.getState();
    if (s.chatOpen) {
      s.setChatOpen(false);
      return;
    }
    if (s.activity === "docked") s.openMenu();
    else s.dock();
  }

  return (
    <>
      <PharmacistChat open={chatOpen} onClose={() => store.setChatOpen(false)} />

      <AnimatePresence>
        {step && <Spotlight key="guide-spotlight" frame={frame} reduced={reduced} />}
      </AnimatePresence>

      <AnimatePresence>
        {step && (
          <GuideBubble
            key="guide-bubble"
            at={callout.bubble}
            width={width}
            perch={callout.side === "above" ? "bottom" : "top"}
            step={step}
            index={index}
            total={steps.length}
            primaryLabel={primaryLabel}
            onNext={next}
            onBack={back}
            onSkip={finishTour}
            onHeight={setBubbleHeight}
            reduced={reduced}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activity === "menu" && (
          <GuideMenu
            key="guide-menu"
            home={home}
            viewport={viewport}
            guide={pageGuide}
            spotCount={spotCount}
            coaching={coaching}
            reduced={reduced}
            onScreen={() => store.startTour({ kind: "screen" })}
            onPick={store.startPicking}
            onGuide={() => store.startTour({ kind: "guide", guideKey: pageGuide.key })}
            onChat={() => store.setChatOpen(true)}
            onLibrary={() => store.openLibrary(pageGuide.key)}
            onCoaching={setCoaching}
            onClose={store.dock}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activity === "picking" && (
          <PickLayer
            key="guide-pick"
            home={home}
            viewport={viewport}
            reduced={reduced}
            onPick={(spotId) => store.startTour({ kind: "spot", spotId, backToPicking: true })}
            onCancel={store.dock}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activity === "library" && (
          <GuideLibrary
            key="guide-library"
            guideKey={libraryKey ?? pageGuide.key}
            onClose={store.dock}
            onWalk={(guideKey) => store.startTour({ kind: "guide", guideKey })}
            onOpen={(guideKey) => store.openLibrary(guideKey)}
          />
        )}
      </AnimatePresence>

      <FlyingHakim
        to={step ? callout.avatar : home}
        state={step ? "guiding" : activity === "menu" || activity === "picking" ? "attentive" : "docked"}
        reduced={reduced}
        interactive={!step && activity !== "library"}
        onClick={onAvatar}
        label={activity === "docked" ? "Dr. Hakim, your guide. Tap for help with this screen." : "Close Dr. Hakim's menu"}
        badge={activity === "docked" && !chatOpen && !seen(pageGuide.key)}
      />
    </>
  );
}
