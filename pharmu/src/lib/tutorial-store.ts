import { create } from "zustand";

/**
 * Opening the guide from somewhere other than its own tab.
 *
 * The guide panel is mounted once, at the root, so it is available on every
 * page. That makes it awkward to reach from inside a mode: the moment worth
 * opening a mode's tutorial is when the player has chosen a difficulty and
 * committed to playing, and that is known in the difficulty picker, several
 * routes away from the panel.
 *
 * A store rather than the alternatives on purpose. Passing a callback down
 * would mean threading it through four game routes, and watching the DOM for
 * the difficulty modal disappearing would break the first time that modal was
 * restyled. One explicit request, sent from the place that knows.
 */

/** What somebody asked the guide to show them. */
export type TourRequest =
  /** A guide's steps in order, flying to each step's control where it is on screen. */
  | { kind: "guide"; guideKey: string }
  /** Everything explained on the screen right now. */
  | { kind: "screen" }
  /** One control, picked with What's this. */
  | { kind: "spot"; spotId: string; backToPicking?: boolean }
  /** What is new here: a mode's overview if given, then screens not introduced before. */
  | { kind: "new"; guideKey: string | null };

export type GuideActivity = "docked" | "menu" | "touring" | "picking" | "library";

type TutorialState = {
  activity: GuideActivity;
  request: TourRequest | null;
  /** Bumped on every request, so asking for the same tour twice restarts it. */
  requestId: number;
  /** Which written guide the library is showing. */
  libraryKey: string | null;
  chatOpen: boolean;
  /**
   * A mode's introduction has been promised and is about to start. Holds the
   * page-watching introductions off meanwhile: the difficulty modal closing is
   * exactly when a new screen appears, and without this a smaller tour of that
   * screen would jump in ahead of the mode's own.
   */
  holding: boolean;
  startTour: (request: TourRequest) => void;
  openMenu: () => void;
  startPicking: () => void;
  openLibrary: (key?: string | null) => void;
  setChatOpen: (open: boolean) => void;
  hold: (on: boolean) => void;
  dock: () => void;
};

export const useTutorialStore = create<TutorialState>((set) => ({
  activity: "docked",
  request: null,
  requestId: 0,
  libraryKey: null,
  chatOpen: false,
  holding: false,
  startTour: (request) =>
    set((s) => ({ activity: "touring", request, requestId: s.requestId + 1, holding: false, chatOpen: false })),
  openMenu: () => set({ activity: "menu", chatOpen: false }),
  startPicking: () => set({ activity: "picking", request: null }),
  openLibrary: (key = null) => set({ activity: "library", libraryKey: key, request: null }),
  setChatOpen: (open) => set((s) => ({ chatOpen: open, activity: open ? "docked" : s.activity, request: open ? null : s.request })),
  hold: (on) => set({ holding: on }),
  dock: () => set({ activity: "docked", request: null }),
}));

/**
 * Whether the case clock should stop for what the guide is doing.
 *
 * A tour, the What's-this outlines and the written guides all cover the page,
 * so reading them must not cost the case time. The menu does not: it is one
 * tap from closing, and a menu somebody left open would be a free pause the
 * case bar charges points for.
 */
export function pausesClock(activity: GuideActivity): boolean {
  return activity === "touring" || activity === "picking" || activity === "library";
}

export const selectPausesClock = (state: TutorialState) => pausesClock(state.activity);

/**
 * Where the guide does not appear at all.
 *
 * A graded sitting withholds hints, and a guide that could stop the clock
 * would be a better hint than any of them. A live session is a race run on one
 * seed for the whole room: stopping the clock there would hand whoever opened
 * the guide time nobody else got, and on the host's projected board it is
 * clutter over the scores.
 */
export function guideLocked(input: { pathname: string; sitting: boolean }): boolean {
  if (input.sitting) return true;
  const path = input.pathname.toLowerCase();
  return path.startsWith("/live") || path.startsWith("/educator/live") || path.startsWith("/assessment");
}
