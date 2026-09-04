import { create } from "zustand";
import type { LensCase, LensSummary } from "./build-case";

/**
 * The case a scan produced, waiting for the game route to pick it up.
 *
 * In memory and nowhere else. Not persisted, not written to `cases`, not given
 * an id anything could fetch it by - the whole point of Prescription Lens is
 * that a document someone photographed leaves no trace, and a store that
 * survived a refresh would quietly break that.
 *
 * A refresh therefore loses the case, which is the correct trade: the
 * alternative is a scanned prescription sitting in localStorage.
 *
 * Handing it over through a store rather than a route param is what lets the
 * case be a full object. useCaseLoader checks here before it queries anything,
 * so a scanned case enters the game by exactly the same door a seeded one
 * does, and every mode plays it without knowing the difference.
 */

type ScannedCaseState = {
  pending: { case: LensCase; summary: LensSummary } | null;
  /** Set by the Lens modal when the learner presses Play. */
  arm: (payload: { case: LensCase; summary: LensSummary }) => void;
  /** Cleared by the loader once the mode has taken it. */
  take: () => { case: LensCase; summary: LensSummary } | null;
  clear: () => void;
};

export const useScannedCaseStore = create<ScannedCaseState>((set, get) => ({
  pending: null,
  arm: (payload) => set({ pending: payload }),
  take: () => {
    const held = get().pending;
    // Taken exactly once: pressing Next case after a scanned case should deal
    // a normal generated one, not replay the photograph forever.
    if (held) set({ pending: null });
    return held;
  },
  clear: () => set({ pending: null }),
}));

/** The mode a pending scan wants, for routing. */
export function pendingScanMode(): string | null {
  return (useScannedCaseStore.getState().pending?.case.mode as string) ?? null;
}
