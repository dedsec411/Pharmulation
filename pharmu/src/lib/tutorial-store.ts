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

type View = "walkthrough" | "contents";

type TutorialState = {
  open: boolean;
  /** Which guide to show, or null to follow whatever page is on screen. */
  requestedKey: string | null;
  view: View;
  /** Open a specific guide - used when a mode starts. */
  openGuide: (key: string, view?: View) => void;
  /** Open whatever belongs to the current page. */
  openForPage: (view?: View) => void;
  close: () => void;
  setView: (view: View) => void;
};

export const useTutorialStore = create<TutorialState>((set) => ({
  open: false,
  requestedKey: null,
  view: "contents",
  openGuide: (key, view = "walkthrough") => set({ open: true, requestedKey: key, view }),
  openForPage: (view = "contents") => set({ open: true, requestedKey: null, view }),
  close: () => set({ open: false, requestedKey: null }),
  setView: (view) => set({ view }),
}));
