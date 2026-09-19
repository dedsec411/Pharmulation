import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Radio } from "lucide-react";
import { joinCodeProblem, normaliseJoinCode } from "@/lib/educator/codes";
import { joinLiveSession } from "@/lib/live/session";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Entering a live session code, from the class page.
 *
 * A student in a hall has been given a code thirty seconds ago and opens the
 * page about their class, because that is where the last code their lecturer
 * read out went. Sending them to a different page to type it is a step that
 * only makes sense to whoever drew the routes.
 *
 * It joins here rather than handing the code on, so it is one press. The seat
 * is taken by `joinLiveSession` - the same call the live page makes, not a
 * second copy of it - and the session id then travels in the hash, which is
 * where that page already looks to restore a room after a reload.
 */
export function LiveSessionJoin({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const problem = joinCodeProblem(code);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const tidy = normaliseJoinCode(code);
    if (!tidy || problem || joining) return;

    setJoining(true);
    try {
      const id = await joinLiveSession(tidy, profile?.full_name || "Guest");
      if (!id) {
        // A code for a session that has ended reads the same as a typo from
        // here, so the message covers both rather than guessing.
        toast.error("No live session with that code", {
          description: "Check the code on the screen - a session that has finished cannot be joined.",
        });
        return;
      }
      setCode("");
      await navigate({ to: "/live", hash: id });
    } catch (error) {
      console.error("[live] could not join from the class page", error);
      toast.error("Could not join right now", { description: "Please try again in a moment." });
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className={`glass-card p-5 ${className}`}>
      <h3 className="flex items-center gap-2 font-bold">
        <Radio className="size-4 text-primary" aria-hidden="true" /> In a live session?
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        If your lecturer has a code on the screen, enter it here. This is separate from your
        class code.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-start gap-2">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="live-session-code" className="sr-only">Live session code</label>
          <input
            id="live-session-code"
            name="liveSessionCode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Session code"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(problem)}
            aria-describedby={problem ? "live-session-code-problem" : undefined}
            className={`w-full rounded-xl border bg-background/60 px-4 py-2.5 font-mono text-sm tracking-[0.25em] outline-none ${
              problem ? "border-rose-400/60" : "border-border/50 focus:border-primary"
            }`}
          />
          {problem && (
            <p id="live-session-code-problem" role="alert" className="mt-1.5 px-1 text-xs text-rose-400">
              {problem}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!normaliseJoinCode(code) || !!problem || joining}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 max-sm:min-h-11 max-sm:w-full max-sm:justify-center"
        >
          {joining && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Join session
        </button>
      </form>
    </section>
  );
}
