import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Copy, Check, RefreshCw, Archive, ArchiveRestore, ChevronDown, Loader2,
  Building2, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { generateJoinCode } from "@/lib/educator/codes";
import {
  educatorDb, saveInstitution, useClassRoster, useMyClasses, useMyInstitution,
  type ClassRow, type Institution,
} from "@/lib/educator/queries";

export const Route = createFileRoute("/educator/classes")({
  head: () => ({ meta: [{ title: "Classes - Pharmulation" }] }),
  component: ClassesPage,
});

/**
 * Insert a class, retrying on a code collision.
 *
 * Six characters from a 32-letter alphabet make a clash vanishingly unlikely,
 * but the column is UNIQUE, so the one time it happens should produce a new
 * code rather than an error in front of a lecturer. Postgres reports a unique
 * violation as 23505; anything else is a real failure and is rethrown.
 */
async function createClass(
  educatorId: string,
  name: string,
  institutionId: string | null
): Promise<ClassRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await educatorDb().from("classes")
      .insert({
        educator_id: educatorId,
        institution_id: institutionId,
        name: name.trim(),
        join_code: generateJoinCode(),
      })
      .select("id, name, join_code, archived, created_at")
      .single();
    if (!error) return data as ClassRow;
    if ((error as { code?: string }).code !== "23505") throw error;
  }
  throw new Error("Could not allocate a unique join code. Try again.");
}

function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-sm font-black tracking-[0.25em] text-primary transition hover:bg-primary/20"
      title="Copy join code"
    >
      {code}
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5 opacity-60" />}
    </button>
  );
}

function Roster({ classId }: { classId: string }) {
  const { data: students, isLoading } = useClassRoster(classId);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading roster
      </p>
    );
  }
  if (!students?.length) {
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground">
        Nobody has joined yet. Share the join code above.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-semibold">Student</th>
            <th className="px-4 py-2 text-right font-semibold">Cases</th>
            <th className="px-4 py-2 text-right font-semibold">Accuracy</th>
            <th className="px-4 py-2 text-right font-semibold">XP</th>
            <th className="px-4 py-2 text-right font-semibold">Joined</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.student_id} className="border-b border-border/20 last:border-0">
              <td className="px-4 py-2.5 font-semibold">{s.full_name ?? "Unnamed student"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.total_cases_completed}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {s.total_cases_completed ? `${Math.round(Number(s.accuracy_rate))}%` : "-"}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{s.xp}</td>
              <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                {new Date(s.enrolled_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The institution a lecturer teaches for.
 *
 * Asked for once and then out of the way: it names the classes created after
 * it and appears in the faculty header, so a university running a cohort sees
 * itself rather than a generic product. Optional - a class works without one.
 */
function InstitutionCard({
  educatorId, institution, onSaved,
}: {
  educatorId?: string;
  institution: Institution | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!educatorId || !name.trim() || saving) return;
    setSaving(true);
    try {
      await saveInstitution(educatorId, name, institution);
      setEditing(false);
      onSaved();
      toast.success(institution ? "Institution renamed" : `${name.trim()} added`);
    } catch {
      toast.error("Could not save the institution");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="glass-card mt-6 flex flex-wrap items-center gap-3 p-4">
        <Building2 className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm">
          {institution
            ? <><span className="text-muted-foreground">Institution: </span><b>{institution.name}</b></>
            : <span className="text-muted-foreground">
                No institution set. Classes still work without one.
              </span>}
        </span>
        <button
          type="button"
          onClick={() => { setName(institution?.name ?? ""); setEditing(true); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <Pencil className="size-3.5" /> {institution ? "Rename" : "Add institution"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="glass-card mt-6 flex flex-wrap items-end gap-3 p-4">
      <label className="min-w-[220px] flex-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Institution
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="University of Karachi, Faculty of Pharmacy"
          maxLength={120}
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        disabled={!name.trim() || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
      >
        {saving && <Loader2 className="size-4 animate-spin" />} Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-xl border border-border/50 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}

function ClassesPage() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: classes = [], isLoading } = useMyClasses(profile?.user_id);
  const { data: institution } = useMyInstitution(profile?.user_id);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["educator-classes"] });

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!profile?.user_id || !name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createClass(profile.user_id, name, institution?.id ?? null);
      setName("");
      setOpen(created.id);
      refresh();
      toast.success(`${created.name} created`, { description: `Join code ${created.join_code}` });
    } catch (error) {
      toast.error("Could not create the class", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setCreating(false);
    }
  }

  /**
   * A new code locks out anyone holding the old one, which is the point.
   *
   * Retries a collision the way creation does. The column is UNIQUE, and
   * without this the one time two codes clashed the lecturer was told the
   * change had failed when another press would have worked.
   */
  async function rotateCode(row: ClassRow) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await educatorDb().from("classes")
        .update({ join_code: generateJoinCode() }).eq("id", row.id);
      if (!error) {
        refresh();
        toast.success("New join code issued", { description: "The old code no longer works." });
        return;
      }
      if ((error as { code?: string }).code !== "23505") break;
    }
    toast.error("Could not change the code");
  }

  async function setArchived(row: ClassRow, archived: boolean) {
    const { error } = await educatorDb().from("classes")
      .update({ archived }).eq("id", row.id);
    if (error) toast.error("Could not update the class");
    else {
      refresh();
      toast.success(archived ? `${row.name} archived` : `${row.name} restored`);
    }
  }

  const visible = classes.filter((c) => showArchived || !c.archived);
  const archivedCount = classes.filter((c) => c.archived).length;

  return (
    <>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Faculty</p>
        <h1 className="mt-1 text-3xl font-extrabold">Classes</h1>
        <p className="text-sm text-muted-foreground">
          Each class has a join code. Students enter it at sign-up or from their dashboard.
        </p>
      </div>

      <InstitutionCard
        educatorId={profile?.user_id}
        institution={institution ?? null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-institution"] })}
      />

      <form onSubmit={onCreate} className="glass-card mt-4 flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-[240px] flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New class name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PharmD Year 3 - Clinical"
            maxLength={80}
            className="mt-1.5 w-full rounded-xl border border-border/50 bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create class
        </button>
      </form>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="mt-4 text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
        >
          {showArchived ? "Hide" : "Show"} {archivedCount} archived
        </button>
      )}

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading your classes...</p>}

        {!isLoading && visible.length === 0 && (
          <div className="glass-card p-6 sm:p-10 text-center">
            <Users className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">No classes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one above and share its code with your cohort.
            </p>
          </div>
        )}

        {visible.map((row) => (
          <div key={row.id} className={`glass-card overflow-hidden ${row.archived ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-3 p-5">
              <button
                type="button"
                onClick={() => setOpen(open === row.id ? null : row.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition ${open === row.id ? "rotate-180" : ""}`}
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{row.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Created {new Date(row.created_at).toLocaleDateString(undefined, {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {row.archived && " · archived"}
                  </span>
                </span>
              </button>

              <JoinCode code={row.join_code} />

              <button
                type="button"
                onClick={() => rotateCode(row)}
                title="Issue a new join code"
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:text-foreground"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setArchived(row, !row.archived)}
                title={row.archived ? "Restore class" : "Archive class"}
                className="rounded-lg border border-border/50 p-2 text-muted-foreground transition hover:text-foreground"
              >
                {row.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {open === row.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/30"
                >
                  <Roster classId={row.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </>
  );
}
