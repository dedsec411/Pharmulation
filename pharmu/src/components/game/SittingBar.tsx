import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import {
  submitSitting, useSittingProgress, useSittingStore,
} from "@/lib/educator/assessment";

/**
 * The bar that says a timed sitting is running.
 *
 * Mounted for the whole authenticated area rather than inside a game route,
 * because the clock is the point: it keeps running while the student is on the
 * dashboard, the drug database, or anywhere else, and there is nowhere to
 * navigate to that pauses it.
 *
 * Renders nothing when no sitting is open, which is almost always.
 */

function clock(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SittingBar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const active = useSittingStore((s) => s.active);
  const clear = useSittingStore((s) => s.clear);

  const [now, setNow] = useState(() => Date.now());
  const { data: done = 0 } = useSittingProgress(active, profile?.user_id);

  // One interval for the whole bar. The deadline is an absolute time, so a
  // dropped tick or a backgrounded tab cannot make the clock drift slow.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Submitting is guarded by a ref rather than state: the timer fires every
  // second, and without it an expiry would post the same session repeatedly.
  const submitting = useRef(false);

  /**
   * When the last automatic attempt failed, and how many have failed.
   *
   * Without these, a submit that keeps failing retried once a second for as
   * long as the tab stayed open: the expiry condition stays true, so clearing
   * the guard in the catch handed the effect straight back to itself. Now a
   * failure backs off, and after three the automatic attempts stop and leave
   * it to the button - a student watching a toast appear every second learns
   * nothing except that the app is broken.
   */
  const failedAt = useRef(0);
  const failures = useRef(0);
  const AUTO_RETRY_MS = 20_000;
  const MAX_AUTO_ATTEMPTS = 3;

  async function finish(reason: "time" | "done" | "manual") {
    if (!active || !profile?.user_id || submitting.current) return;
    submitting.current = true;
    try {
      const result = await submitSitting(active);
      clear();
      failures.current = 0;
      queryClient.invalidateQueries({ queryKey: ["my-assessments"] });
      toast[reason === "time" ? "warning" : "success"](
        reason === "time" ? "Time is up - your work was submitted" : "Assessment submitted",
        {
          description: `${result.cases} of ${active.caseCount} cases · ${Math.round(result.accuracy * 100)}% accuracy`,
        }
      );
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Could not submit the sitting", error);
      failedAt.current = Date.now();
      failures.current += 1;
      toast.error("Could not submit your assessment", {
        description: "Your cases are saved. Use Submit now to try again.",
      });
      submitting.current = false;
    }
  }

  useEffect(() => {
    if (!active) return;
    // A manual press always tries; only the automatic path backs off.
    if (failures.current >= MAX_AUTO_ATTEMPTS) return;
    if (failedAt.current && Date.now() - failedAt.current < AUTO_RETRY_MS) return;

    if (now >= active.endsAt) finish("time");
    else if (done >= active.caseCount) finish("done");
    // finish is stable enough for this: it early-returns unless a sitting is
    // open and nothing else is already submitting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, done, active]);

  if (!active) return null;

  const left = active.endsAt - now;
  const urgent = left < 120_000;

  return (
    // Deliberately one look in both themes. An exam banner is an interruption,
    // not part of the page, and a saturated ground with its own light text is
    // legible whichever theme the rest of the app is wearing.
    <div
      className={`sticky top-0 z-50 text-white ${urgent ? "bg-rose-700" : "bg-sky-800"}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
        <span className="inline-flex items-center gap-2 font-bold">
          <Lock className="size-4" /> {active.title}
        </span>
        <span className="text-white/75">
          Assessment in progress · no hints · {done} of {active.caseCount} cases
        </span>

        <span className="ml-auto inline-flex items-center gap-2 font-mono text-base font-black tabular-nums">
          <Timer className="size-4" /> {clock(left)}
        </span>

        <button
          type="button"
          onClick={() => finish("manual")}
          className="rounded-full border border-white/35 px-3.5 py-1 text-xs font-semibold transition hover:bg-white/15"
        >
          Submit now
        </button>
      </div>
    </div>
  );
}
