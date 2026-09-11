import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap } from "lucide-react";
import { useMyEnrollments } from "@/lib/educator/join";

/**
 * A pointer to the class page, from the profile.
 *
 * The join form itself used to live here, below the badges, where a student
 * who had just been read a code out loud had no reason to look. The form now
 * has a page of its own with the work on it, so what belongs on the profile is
 * a line saying where that is - not a second copy of the same input, which
 * would leave two places to keep in step.
 */
export function ClassSignpost({ userId }: { userId?: string }) {
  const { data: classes = [] } = useMyEnrollments(userId);

  return (
    <Link
      to="/class"
      className="glass-card flex items-center justify-between gap-4 p-6 transition hover:border-primary/40"
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-bold">
          <GraduationCap className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Your class
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {classes.length
            ? `${classes.map((c) => c.name).join(", ")} - see the work set for you.`
            : "Not in a class. Enter the code your lecturer gave you."}
        </p>
      </div>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
