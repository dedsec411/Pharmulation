import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Play, Radio, Square, Trophy, Users } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/game/shared";
import { SITE_URL } from "@/lib/site";
import {
  createLiveSession, sessionProgress, setSessionStatus,
  useLiveParticipants, useLiveSession, type LiveSession,
} from "@/lib/live/session";

/**
 * The host's console, meant to be on a projector.
 *
 * Everything on this page is sized to be read from the back of a room: the
 * join code is the largest thing on it, and the board underneath is the only
 * other thing competing for attention.
 *
 * The drill it runs is the look-alike one. It is the right fit for a room
 * because it needs no case row, generates from a seed, and takes a couple of
 * minutes - long enough to be a real exercise and short enough that a hall
 * full of people finishes together.
 */
export const Route = createFileRoute("/educator/live")({
  head: () => ({ meta: [{ title: "Live session - Pharmulation" }] }),
  component: LivePage,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
});

function LivePage() {
  const { profile } = useAuthStore();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [creating, setCreating] = useState(false);

  const { data: session } = useLiveSession(sessionId);
  const { data: participants = [] } = useLiveParticipants(sessionId);
  const progress = sessionProgress(participants);

  async function open() {
    if (!profile?.user_id || creating) return;
    setCreating(true);
    try {
      const created: LiveSession = await createLiveSession(profile.user_id, difficulty);
      setSessionId(created.id);
    } catch (error) {
      console.error("[live]", error);
      toast.error("Could not open a session. Has the live_sessions migration been applied?");
    } finally {
      setCreating(false);
    }
  }

  async function move(status: "running" | "ended") {
    if (!sessionId) return;
    try {
      await setSessionStatus(sessionId, status);
    } catch (error) {
      console.error("[live]", error);
      toast.error("Could not update the session.");
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight">
          <Radio className="size-7 text-primary" aria-hidden="true" /> Live session
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          Put a code on the screen, let the room join on their phones, and run the same drill for
          everybody at once. The board updates as people finish.
        </p>

        <div className="mt-8 rounded-2xl border border-border/40 bg-card/60 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty for the room</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                aria-pressed={difficulty === level}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  difficulty === level
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {DIFFICULTY_LABEL[level]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={open}
            disabled={creating}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {creating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            {creating ? "Opening..." : "Open a session"}
          </button>
        </div>
      </main>
    );
  }

  const joinUrl = `${SITE_URL.replace(/\/$/, "")}/live`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            {session.status === "lobby" ? "Waiting for the room" : session.status === "running" ? "Running" : "Finished"}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Look-alike names &middot; {DIFFICULTY_LABEL[session.difficulty]}</h1>
        </div>
        <div className="flex gap-2">
          {session.status === "lobby" && (
            <button
              type="button"
              onClick={() => move("running")}
              disabled={!participants.length}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
              <Play className="size-4" aria-hidden="true" /> Start for everyone
            </button>
          )}
          {session.status === "running" && (
            <button
              type="button"
              onClick={() => move("ended")}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
            >
              <Square className="size-4" aria-hidden="true" /> End session
            </button>
          )}
        </div>
      </div>

      {session.status !== "ended" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Go to {joinUrl} and enter
          </p>
          {/* The largest thing on the page, because it is read from the back
              of the room off a projector. */}
          <p className="mt-3 font-mono text-6xl font-black tracking-[0.3em] text-primary sm:text-8xl">
            {session.code}
          </p>
        </motion.section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { icon: Users, value: progress.joined, label: "joined" },
          { icon: Trophy, value: progress.finished, label: "finished" },
          { icon: Radio, value: progress.stillPlaying, label: "still playing" },
          { icon: Trophy, value: progress.averageScore ?? "-", label: "average score" },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/60 p-4">
            <stat.icon className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-3xl font-black tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">The room</p>
        {!participants.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nobody has joined yet. The code above is live.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {participants.map((person, i) => (
              <li
                key={person.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 p-3 text-sm"
              >
                <span className="w-7 shrink-0 text-center text-base font-black tabular-nums text-muted-foreground">
                  {person.finished_at ? i + 1 : "-"}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{person.display_name}</span>
                {person.finished_at ? (
                  <>
                    <span className="tabular-nums text-muted-foreground">{person.errors ?? 0} wrong</span>
                    <span className="w-16 text-right text-lg font-black tabular-nums text-primary">{person.score ?? 0}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {session.status === "lobby" ? "waiting" : "playing..."}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
