import { useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useSittingLock } from "@/lib/educator/assessment";
import { useSettings } from "@/lib/settings-store";
import { binFor, hasSeenGuide } from "@/lib/tutorial-seen";
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
  const sitting = useSittingLock();
  const coaching = useSettings((state) => state.guideCoaching);

  return useCallback((guideKey: string | null) => {
    if (!guideKey || !userId || sitting || !coaching) return;
    const bin = binFor(userId);
    if (hasSeenGuide(bin, userId, guideKey)) return;
    // Claimed now, started in a beat - so the guide arrives after the case has
    // painted, and nothing smaller starts in the gap.
    useTutorialStore.getState().hold(true);
    window.setTimeout(() => {
      const store = useTutorialStore.getState();
      // Released already means the page changed underneath the promise.
      if (!store.holding) return;
      store.startTour({ kind: "new", guideKey });
    }, 650);
  }, [userId, sitting, coaching]);
}
