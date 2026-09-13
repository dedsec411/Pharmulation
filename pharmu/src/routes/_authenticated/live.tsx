import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Radio, Trophy, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LookalikeDrill } from "@/components/game/LookalikeDrill";
import { useAuthStore } from "@/lib/auth-store";
import { joinCodeProblem, normaliseJoinCode } from "@/lib/educator/codes";
import { DIFFICULTY_LABEL } from "@/lib/game/shared";
import {
  joinLiveSession, rankParticipants, reportResult,
  useLiveParticipants, useLiveSession,
} from "@/lib/live/session";

/**
 * The other side of a live session: a phone in a room.
 *
 * Deliberately one field and one button. Somebody joining this has been given
 * a code out loud thirty seconds ago and is holding a phone above their head
 * to see the projector, so anything else on the screen is in the way.
 *
 * The session id is kept in the URL hash rather than in state alone, so a
 * phone that locks and wakes up, or a browser that reloads the tab, comes back
 * into the same session instead of the code screen.
 */
export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({ meta: [{ title: "Join a live session - Pharmulation" }] }),
  component: LiveJoinPage,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
});

function LiveJoinPage() {
  const { profile } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [reported, setReported] = useState(false);

  // Restore on reload. A locked phone waking up mid-session is the normal case
  // in a hall, not an edge one.
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    if (fromHash) setSessionId(fromHash);
  }, []);

  const { data: session } = useLiveSession(sessionId);
  const { data: participants = [] } = useLiveParticipants(sessionId);

  async function join() {
    const problem = joinCodeProblem(code);
    if (problem) { toast.error(problem); return; }
    const tidy = normaliseJoinCode(code);
    if (!tidy) { toast.error("Enter the code from the screen."); return; }
    setJoining(true);
    try {
      const id = await joinLiveSession(tidy, profile?.full_name || "Guest");
      if (!id) { toast.error("No live session with that code."); return; }
      setSessionId(id);
      window.location.hash = id;
    } catch (error) {
      console.error("[live]", error);
      toast.error("Could not join. Check the code and try again.");
    } finally {
      setJoining(false);
    }
  }

  async function finished({ score, errors }: { score: number; errors: number }) {
    if (!sessionId || !profile?.user_id || reported) return;
    setReported(true);
    try {
      await reportResult(sessionId, profile.user_id, score, errors);
    } catch (error) {
      // The drill is over and scored on the player's own record either way;
      // failing to reach the board is not worth blocking them on.
      console.error("[live] could not report result", error);
    }
  }

  function leave() {
    setSessionId(null);
    setReported(false);
    window.location.hash = "";
  }

  if (sessionId && session?.status === "running") {
    return (
      <LookalikeDrill
        onBack={leave}
        sharedSeed={session.seed}
        fixedDifficulty={session.difficulty}
        onFinished={finished}
        skipBriefing
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight sm:text-3xl">
          <Radio className="size-6 text-primary" aria-hidden="true" /> Live session
        </h1>

        {!sessionId && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Enter the code on the screen to join the room.
            </p>
            <div className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-5">
              <label htmlFor="live-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Session code
              </label>
              <input
                id="live-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void join(); }}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                placeholder="ABC234"
                className="mt-2 w-full rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-center font-mono text-3xl font-black tracking-[0.3em] outline-none focus:border-primary/60"
              />
              <button
                type="button"
                onClick={join}
                disabled={joining}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-60"
              >
                {joining && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {joining ? "Joining..." : "Join"}
              </button>
            </div>
          </>
        )}

        {sessionId && session?.status === "lobby" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-6 text-center">
            <Users className="mx-auto size-7 text-primary" aria-hidden="true" />
            <p className="mt-3 text-lg font-bold">You are in</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {participants.length} {participants.length === 1 ? "person" : "people"} waiting.
              It starts when the host starts it.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {DIFFICULTY_LABEL[session.difficulty]} &middot; look-alike brand names
            </p>
            <button type="button" onClick={leave} className="mt-5 text-xs font-semibold text-muted-foreground underline">
              Leave
            </button>
          </motion.div>
        )}

        {sessionId && (session?.status === "ended" || reported) && (
          <section className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Trophy className="size-3.5 text-primary" aria-hidden="true" /> The room
            </p>
            <ol className="mt-4 space-y-2">
              {rankParticipants(participants).map((person, i) => (
                <li
                  key={person.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                    person.user_id === profile?.user_id ? "border-primary/50 bg-primary/5" : "border-border/40"
                  }`}
                >
                  <span className="w-6 text-center font-black tabular-nums text-muted-foreground">
                    {person.finished_at ? i + 1 : "-"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{person.display_name}</span>
                  <span className="font-black tabular-nums text-primary">
                    {person.finished_at ? person.score ?? 0 : "..."}
                  </span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={leave} className="mt-5 text-xs font-semibold text-muted-foreground underline">
              Leave the session
            </button>
          </section>
        )}

        {sessionId && !session && (
          <p className="mt-6 text-sm text-muted-foreground">Finding the session...</p>
        )}
      </main>
    </div>
  );
}
