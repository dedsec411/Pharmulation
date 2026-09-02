import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2 } from "lucide-react";
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

  const problem = joinCodeProblem(code);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = normaliseJoinCode(code);
    if (!clean || problem || joining) return;

    setJoining(true);
    const result = await redeemJoinCode(clean);
    setJoining(false);

    if (!result.ok) {
      toast.error(
        result.reason === "unknown-code"
          ? "That code did not match a class"
          : "Could not join right now",
        {
          description: result.reason === "unknown-code"
            ? "Ask your lecturer for the current code - it may have been changed."
            : "Please try again in a moment.",
        }
      );
      return;
    }

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
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Join code"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full rounded-xl border bg-background/60 px-4 py-2.5 font-mono text-sm tracking-[0.25em] outline-none ${
              problem ? "border-rose-400/60" : "border-border/50 focus:border-primary"
            }`}
          />
          {problem && <p className="mt-1.5 px-1 text-xs text-rose-400">{problem}</p>}
        </div>
        <button
          type="submit"
          disabled={!normaliseJoinCode(code) || !!problem || joining}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          {joining && <Loader2 className="size-4 animate-spin" />}
          Join class
        </button>
      </form>
    </div>
  );
}
