import { useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { binFor, hasSeenGuide, initialView } from "@/lib/tutorial-seen";
import { useTutorialStore } from "@/lib/tutorial-store";

/**
 * Opens a mode's tutorial the first time somebody plays it.
 *
 * Called from the difficulty picker rather than from the modes themselves:
 * that is the one point where "this person has committed to playing this
 * mode" is known, and it fires as the difficulty modal closes, so the two
 * never fight for the screen.
 *
 * Its own file so the game routes can reach it without importing the guide
 * panel - which pulls in the mentor chat, and would make every mode wait on
 * code none of them render.
 */
export function useModeTutorialTrigger() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id ?? null;

  return useCallback((guideKey: string | null) => {
    if (!guideKey || !userId) return;
    const bin = binFor(userId);
    if (hasSeenGuide(bin, userId, guideKey)) return;
    // A beat, so the guide arrives after the case has painted rather than
    // over the top of a loading screen.
    window.setTimeout(() => {
      useTutorialStore.getState().openGuide(guideKey, initialView(false));
    }, 650);
  }, [userId]);
}
