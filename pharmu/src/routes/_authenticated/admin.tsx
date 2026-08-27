import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { Users, FlaskConical, Pill, BarChart3 } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { promoteUserToAdmin, deleteCaseById } from "@/lib/api/admin.functions";
import { unwrapList } from "@/lib/supabase-query";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin - Pharmulation" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<"overview" | "users" | "cases" | "drugs">("overview");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (profile && (profile.role as string) !== "admin") {
    throw redirect({ to: "/dashboard" });
  }

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => unwrapList(
      await supabase.from("profiles").select("*").order("xp", { ascending: false }),
      "users",
    ),
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["admin-cases"],
    queryFn: async () => unwrapList(
      await supabase.from("cases").select("*").order("created_at", { ascending: false }),
      "cases",
    ),
  });
  const { data: drugs = [] } = useQuery({
    queryKey: ["admin-drugs"],
    queryFn: async () => unwrapList(
      await supabase.from("drugs").select("*").order("name"),
      "drugs",
    ),
  });
  const { data: scoresToday = [] } = useQuery({
    queryKey: ["admin-scores-today"],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      return unwrapList(
        await supabase.from("scores").select("mode, accuracy").gte("completed_at", since.toISOString()),
        "today's scores",
      );
    },
  });
  const { data: recentErrors = [] } = useQuery({
    queryKey: ["admin-recent-errors"],
    queryFn: async () => unwrapList(
      await supabase
        .from("scores")
        .select("mode, errors_detail")
        .order("completed_at", { ascending: false })
        .limit(500),
      "recent errors",
    ),
  });

  // Aggregate most common errors per mode
  const errorAgg: Record<string, Record<string, number>> = {};
  recentErrors.forEach((row: any) => {
    const list = Array.isArray(row.errors_detail) ? row.errors_detail : [];
    list.forEach((e: any) => {
      const m = e?.mode ?? row.mode ?? "unknown";
      const t = e?.errorType ?? "Unknown";
      errorAgg[m] = errorAgg[m] ?? {};
      errorAgg[m][t] = (errorAgg[m][t] ?? 0) + 1;
    });
  });

  const modeCounts: Record<string, number> = {};
  scoresToday.forEach((s: any) => { modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1; });
  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const avgAcc = scoresToday.length > 0
    ? Math.round((scoresToday.reduce((s: number, x: any) => s + x.accuracy, 0) / scoresToday.length) * 100)
    : 0;

  async function promoteUser(uid: string) {
    setPendingId(uid);
    try {
      const result = await promoteUserToAdmin({ data: { userId: uid } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("User promoted to admin.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error) {
      console.error(error);
      toast.error("Could not promote this user.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteCase(id: string) {
    if (!confirm("Delete this case?")) return;
    setPendingId(id);
    try {
      const result = await deleteCaseById({ data: { caseId: id } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Case deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-cases"] });
    } catch (error) {
      console.error(error);
      toast.error("Could not delete this case.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6"><BackButton to="/dashboard" /></div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground text-sm">Manage users, cases and drugs.</p>

        <div className="mt-6 flex gap-1 glass rounded-full p-1 text-sm w-fit">
          {(["overview", "users", "cases", "drugs"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-full capitalize transition ${
                tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
              }`}>{t}</button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat icon={Users} label="Total users" value={users.length} />
              <Stat icon={BarChart3} label="Cases today" value={scoresToday.length} />
              <Stat icon={FlaskConical} label="Top mode today" value={topMode} />
              <Stat icon={Pill} label="Avg accuracy today" value={`${avgAcc}%`} />
            </div>

            <div className="mt-6 glass-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Most common errors (last 500 cases)</p>
              {Object.keys(errorAgg).length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No errors logged yet.</p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {Object.entries(errorAgg).map(([mode, types]) => {
                    const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    const max = sorted[0]?.[1] ?? 1;
                    return (
                      <div key={mode} className="rounded-xl border border-border/40 bg-background/40 p-4">
                        <p className="text-sm font-semibold capitalize">{mode}</p>
                        <ul className="mt-2 space-y-2">
                          {sorted.map(([type, count]) => (
                            <li key={type}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="truncate">{type}</span>
                                <span className="tabular-nums text-muted-foreground">{count}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="mt-6 glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-right p-3">Level</th><th className="text-right p-3">Cases</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.user_id} className="border-b border-border/50">
                    <td className="p-3">{u.full_name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 capitalize">{u.role}</td>
                    <td className="p-3 text-right">{u.level}</td>
                    <td className="p-3 text-right">{u.total_cases_completed}</td>
                    <td className="p-3 text-right">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => promoteUser(u.user_id)}
                          disabled={pendingId === u.user_id}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {pendingId === u.user_id ? "Promoting..." : "Promote"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "cases" && (
          <div className="mt-6 glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left p-3">Title</th><th className="text-left p-3">Mode</th><th className="text-left p-3">Difficulty</th><th className="text-left p-3">Created</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {cases.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="p-3">{c.title ?? c.id.slice(0, 8)}</td>
                    <td className="p-3 capitalize">{c.mode}</td>
                    <td className="p-3 capitalize">{c.difficulty}</td>
                    <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteCase(c.id)}
                        disabled={pendingId === c.id}
                        className="text-xs text-rose-400 hover:underline disabled:opacity-50"
                      >
                        {pendingId === c.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "drugs" && (
          <div className="mt-6 glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Generic</th><th className="text-left p-3">Class</th><th className="text-left p-3">Category</th></tr>
              </thead>
              <tbody>
                {drugs.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="p-3 font-semibold">{d.name}</td>
                    <td className="p-3 text-muted-foreground">{d.generic_name}</td>
                    <td className="p-3">{d.drug_class}</td>
                    <td className="p-3">{d.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="glass-card p-5">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
