import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { joinCodeProblem, normaliseJoinCode } from "@/lib/educator/codes";
import { redeemJoinCode, useMyEnrollments } from "@/lib/educator/join";

/**
 * Join a class, and see which ones you are in.
 *
 * Lives on the profile rather than the dashboard because the dashboard should
 * be unchanged for a learner with no institution behind them, and this is the
 * one place a student who signed up before their lecturer set up a class can
 * still enter the code.
 */
export function ClassMembership({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const { data: classes = [] } = useMyEnrollments(userId);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  /** A code that matched no class, kept so it can be tried as a session code. */
  const [rejected, setRejected] = useState<string | null>(null);

  const problem = joinCodeProblem(code);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = normaliseJoinCode(code);
    if (!clean || problem || joining) return;

    setJoining(true);
    const result = await redeemJoinCode(clean);
    setJoining(false);

    if (!result.ok) {
      // A session code is six characters from the same alphabet as a class
      // code, so the two are indistinguishable to whoever was given one out
      // loud. Keep it and offer the other door rather than just saying no.
      setRejected(result.reason === "unknown-code" ? clean : null);
      toast.error(
        result.reason === "unknown-code"
          ? "That code did not match a class"
          : "Could not join right now",
        {
          description: result.reason === "unknown-code"
            ? "If it was for a live session, use the link below. Otherwise ask your lecturer for the current code."
            : "Please try again in a moment.",
        }
      );
      return;
    }

    setRejected(null);
    setCode("");
    queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    queryClient.invalidateQueries({ queryKey: ["my-assignments"] });
    toast.success(`You joined ${result.className}`);
  }

  return (
    <div className="glass-card p-6">
      <h3 className="flex items-center gap-2 font-bold">
        <GraduationCap className="size-4 text-primary" /> Your classes
      </h3>

      {classes.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {classes.map((c) => (
            <li
              key={c.id}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
            >
              {c.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          You are not in a class. If your university uses Pharmulation, enter the code your
          lecturer gave you.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-start gap-2">
        <div className="min-w-[180px] flex-1">
          {/* A placeholder is not a label: it disappears the moment somebody
              types, and a screen reader announces the field as nothing. */}
          <label htmlFor="class-join-code" className="sr-only">Class join code</label>
          <input
            id="class-join-code"
            name="joinCode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Join code"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(problem)}
            aria-describedby={problem ? "class-join-code-problem" : undefined}
            className={`w-full rounded-xl border bg-background/60 px-4 py-2.5 font-mono text-sm tracking-[0.25em] outline-none ${
              problem ? "border-rose-400/60" : "border-border/50 focus:border-primary"
            }`}
          />
          {problem && (
            <p id="class-join-code-problem" role="alert" className="mt-1.5 px-1 text-xs text-rose-400">
              {problem}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!normaliseJoinCode(code) || !!problem || joining}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 max-sm:min-h-11 max-sm:w-full max-sm:justify-center"
        >
          {joining && <Loader2 className="size-4 animate-spin" />}
          Join class
        </button>
      </form>

      {/* Always here, not only after a code is refused. A live session is the
          other thing a lecturer reads a six-character code out for, and this
          is where a student holding one comes looking - the join page had no
          link to it anywhere, so the only way in was typing the address. */}
      <p
        role={rejected ? "status" : undefined}
        className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${
          rejected
            ? "border border-primary/30 bg-primary/10 text-foreground/90"
            : "text-muted-foreground"
        }`}
      >
        <Radio className="mr-1.5 inline size-4 align-text-bottom text-primary" aria-hidden="true" />
        {rejected ? (
          <>
            Was <span className="font-mono font-bold tracking-[0.12em]">{rejected}</span> read out for a
            live session? Those use a separate code.{" "}
          </>
        ) : (
          <>Given a code for a live session? Those are separate from class codes.{" "}</>
        )}
        <Link
          to="/live"
          search={rejected ? { code: rejected } : {}}
          className="font-semibold text-primary underline underline-offset-2"
        >
          {rejected ? "Join the live session instead" : "Join a live session"}
        </Link>
        .
      </p>
    </div>
  );
}
