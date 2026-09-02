import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, Flame, Target, Clock, Download, Lock, Trophy, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { tierFor, xpProgress } from "@/lib/levels";
import { bandFor, examinerByKey } from "@/lib/game/examiner";
import { WeaknessHeatmap } from "@/components/game/WeaknessHeatmap";
import { PeerBenchmark } from "@/components/game/PeerBenchmark";
import { ClassMembership } from "@/components/game/ClassMembership";
import { useWeaknessMap } from "@/lib/game/useWeaknessMap";
import { hasEnoughHistory } from "@/lib/game/weakness";
import { cpdHoursFromCases, CPD_MILESTONES, generateCertificatePdf, nextCpdMilestone } from "@/lib/cpd";
import { PUBLIC_MODE_GROUPS, publicModeCount, publicModeLabel } from "@/lib/game/shared";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { unwrapList } from "@/lib/supabase-query";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile - Pharmulation" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuthStore();
  const userId = profile?.user_id;
  const [tab, setTab] = useState<"overview" | "badges" | "history" | "certificates">("overview");
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const { data: scores = [] } = useQuery({
    queryKey: ["my-scores", userId],
    queryFn: async () => {
      if (!userId) return [];
      return unwrapList(
        await supabase.from("scores").select("*")
          .eq("user_id", userId).order("completed_at", { ascending: false }),
        "your scores",
      );
    }, enabled: !!userId,
  });

  const { data: weaknessMap } = useWeaknessMap(userId);

  const { data: examinerSessions = [] } = useQuery({
    queryKey: ["examiner-sessions", userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("examiner_sessions")
        .select("cri, examiner, case_title, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as { cri: number; examiner: string; case_title: string | null; created_at: string }[];
    },
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ["all-badges"],
    queryFn: async () => unwrapList(
      await supabase.from("badges").select("*").order("name"),
      "badges",
    ),
  });

  const { data: earnedBadges = [] } = useQuery({
    queryKey: ["my-badges", userId],
    queryFn: async () => {
      if (!userId) return [];
      return unwrapList(
        await supabase.from("user_badges")
          .select("badge_id, earned_at").eq("user_id", userId),
        "your badges",
      );
    }, enabled: !!userId,
  });

  const { data: certs = [], refetch: refetchCerts } = useQuery({
    queryKey: ["certs", userId],
    queryFn: async () => {
      if (!userId) return [];
      return unwrapList(
        await supabase.from("cpd_certificates").select("*")
          .eq("user_id", userId).order("issued_at", { ascending: false }),
        "your certificates",
      );
    }, enabled: !!userId,
  });

  if (!profile) return null;

  const tier = tierFor(profile.xp);
  const prog = xpProgress(profile.xp);
  const cpdHours = cpdHoursFromCases(profile.total_cases_completed);
  const nextMs = nextCpdMilestone(cpdHours);
  // Track the top of the ladder rather than a hardcoded 100, so the bar stays
  // honest if the milestones are retuned.
  const cpdTarget = CPD_MILESTONES[CPD_MILESTONES.length - 1];

  const earnedMap = new Map(earnedBadges.map((b: any) => [b.badge_id, b.earned_at]));

  // Per-mode breakdown
  const byMode: Record<string, number> = {};
  scores.forEach((s: any) => { byMode[s.mode] = (byMode[s.mode] ?? 0) + 1; });
  const modeGroupCounts = PUBLIC_MODE_GROUPS.map((group) => ({
    ...group,
    count: publicModeCount(byMode, group.modes),
  }));
  const maxMode = Math.max(1, ...modeGroupCounts.map((group) => group.count));

  async function claimCertificate(hours: number) {
    if (!userId) return;
    const existing = certs.find((c: any) => c.hours_earned === hours);
    if (existing) { await downloadCert(profile!.full_name || "Pharmacist", hours, new Date(existing.issued_at), existing.id); return; }
    const { data, error } = await supabase.from("cpd_certificates").insert({
      user_id: userId, hours_earned: hours,
    }).select("id, issued_at").single();
    if (error) { toast.error(error.message); return; }
    toast.success(`🎓 You've earned a ${hours} hour CPD Certificate!`);
    refetchCerts();
    await downloadCert(profile!.full_name || "Pharmacist", hours, new Date(data.issued_at), data.id);
  }

  async function downloadCert(name: string, hours: number, issuedAt: Date, certId: string) {
    setDownloadingCertId(certId);
    try {
      const doc = await generateCertificatePdf({ fullName: name, hours, issuedAt, certId });
      doc.save(`pharmulation-cpd-${hours}h.pdf`);
    } finally {
      setDownloadingCertId(null);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        
       <div className="mb-6"><BackButton to="/dashboard" /></div>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex flex-col md:flex-row items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-3xl font-bold">
            {(profile.full_name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="text-xs rounded-full bg-primary/20 text-primary px-3 py-1 font-semibold">{tier.title}</span>
              <span className="text-xs rounded-full bg-foreground/10 px-3 py-1 capitalize">{profile.role}</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-3xl font-extrabold text-primary">{profile.xp.toLocaleString()} XP</div>
            <div className="text-xs text-muted-foreground">
              {prog.next ? `${prog.next.min - profile.xp} XP to ${prog.next.title}` : "Max tier reached"}
            </div>
            <div className="mt-2 h-2 w-48 rounded-full bg-foreground/10 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-primary to-cyan-400"
                initial={{ width: 0 }} animate={{ width: `${prog.pct}%` }} transition={{ duration: 1 }} />
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 glass rounded-full p-1 text-sm w-fit mx-auto">
          {(["overview", "badges", "history", "certificates"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-full capitalize transition ${
                tab === t ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
              }`}>{t}</button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Target, label: "Cases completed", value: profile.total_cases_completed },
                { icon: Award, label: "Accuracy", value: `${Math.round(profile.accuracy_rate)}%` },
                { icon: Clock, label: "Avg time / case", value: `${Math.round(profile.avg_time_per_case)}s` },
                { icon: Flame, label: "Streak", value: `${profile.streak_days} days` },
                ...(examinerSessions.length
                  ? [{
                      icon: GraduationCap,
                      label: "Clinical Reasoning",
                      value: `${Math.round(
                        examinerSessions.reduce((sum, x) => sum + (x.cri ?? 0), 0) / examinerSessions.length,
                      )}/100`,
                    }]
                  : []),
              ].map((s) => (
                <div key={s.label} className="glass-card p-5 text-center">
                  <s.icon className="mx-auto h-5 w-5 text-primary mb-2" />
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {examinerSessions.length > 0 && (
              <div className="mt-6 glass-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">Clinical reasoning</h3>
                  <span className="text-xs text-muted-foreground">
                    {examinerSessions.length} viva{examinerSessions.length === 1 ? "" : "s"}
                  </span>
                </div>
                {(() => {
                  const average = Math.round(
                    examinerSessions.reduce((sum, x) => sum + (x.cri ?? 0), 0) / examinerSessions.length,
                  );
                  const band = bandFor(average);
                  return (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <b className="text-primary">{band.label}.</b> {band.note}
                    </p>
                  );
                })()}
                <div className="mt-4 space-y-2">
                  {examinerSessions.slice(0, 6).map((session, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-40 truncate text-sm text-muted-foreground">
                        {session.case_title ?? "Case"}
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <div className="h-full bg-primary" style={{ width: `${session.cri}%` }} />
                      </div>
                      <div className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                        {examinerByKey(session.examiner).name.replace("Dr. ", "")}
                      </div>
                      <div className="w-8 text-right text-sm font-bold tabular-nums">{session.cri}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weaknessMap && hasEnoughHistory(weaknessMap) && (
              <div className="mt-6">
                <WeaknessHeatmap map={weaknessMap} />
              </div>
            )}

            <div className="mt-6">
              <PeerBenchmark userId={userId} />
            </div>

            <div className="mt-6">
              <ClassMembership userId={userId} />
            </div>

            <div className="mt-6 glass-card p-6">
              <h3 className="font-bold mb-4">Cases by mode</h3>
              <div className="space-y-2">
                {modeGroupCounts.map((group) => (
                  <div key={group.key} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-muted-foreground">{group.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(group.count / maxMode) * 100}%` }} />
                    </div>
                    <div className="w-8 text-right text-sm">{group.count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 glass-card p-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold">CPD Hours</h3>
                  <p className="text-xs text-muted-foreground">1 hour earned per 10 cases completed.</p>
                </div>
                <div className="text-3xl font-extrabold text-primary">{cpdHours} / {cpdTarget}</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-cyan-400" style={{ width: `${Math.min(100, (cpdHours / cpdTarget) * 100)}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CPD_MILESTONES.map((m) => {
                  const unlocked = cpdHours >= m;
                  const claimed = certs.some((c: any) => c.hours_earned === m);
                  return (
                    <button key={m} disabled={!unlocked} onClick={() => claimCertificate(m)}
                      className={`text-xs rounded-xl py-3 transition ${
                        unlocked ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-foreground/5 text-muted-foreground"
                      }`}>
                      <div className="font-bold text-base">{m}h</div>
                      <div>{claimed ? "📜 Download" : unlocked ? "🎓 Claim" : <Lock className="h-3 w-3 inline" />}</div>
                    </button>
                  );
                })}
              </div>
              {nextMs && <p className="mt-3 text-xs text-muted-foreground">Next milestone: {nextMs}h ({(nextMs - cpdHours) * 10} more cases)</p>}
            </div>
          </>
        )}

        {tab === "badges" && (
          <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allBadges.map((b: any) => {
              const earned = earnedMap.get(b.id);
              return (
                <motion.div key={b.id}
                  whileHover={{ scale: 1.02 }}
                  className={`glass-card p-5 text-center ${earned ? "border-primary/40" : "opacity-60"}`}>
                  <div className={`text-4xl mb-2 ${earned ? "" : "grayscale"}`}>{b.icon || "🏅"}</div>
                  <div className="font-bold">{b.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{b.description}</div>
                  {earned ? (
                    <div className="mt-2 text-[10px] text-primary uppercase">Earned {new Date(earned as string).toLocaleDateString()}</div>
                  ) : (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Lock className="h-3 w-3" /> Locked</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "history" && (
          <div className="mt-6 glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Mode</th><th className="text-right p-3">Score</th><th className="text-right p-3">Accuracy</th><th className="text-right p-3">Time</th></tr>
              </thead>
              <tbody>
                {scores.map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-foreground/5">
                    <td className="p-3">{new Date(s.completed_at).toLocaleDateString()}</td>
                    <td className="p-3">{publicModeLabel(s.mode)}</td>
                    <td className="p-3 text-right font-bold text-primary">{s.score}</td>
                    <td className="p-3 text-right">{Math.round(s.accuracy * 100)}%</td>
                    <td className="p-3 text-right">{s.time_taken}s</td>
                  </tr>
                ))}
                {scores.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No cases played yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "certificates" && (
          <div className="mt-6 space-y-3">
            {certs.length === 0 && (
              <div className="glass-card p-10 text-center text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                Complete more cases to earn your first CPD certificate.
              </div>
            )}
            {certs.map((c: any) => (
              <div key={c.id} className="glass-card p-5 flex items-center gap-4">
                <div className="text-4xl">🎓</div>
                <div className="flex-1">
                  <div className="font-bold">{c.hours_earned} CPD Credit Hours</div>
                  <div className="text-xs text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()} · ID {c.id.slice(0, 8)}</div>
                </div>
                <button disabled={downloadingCertId === c.id} onClick={() => downloadCert(profile.full_name || "Pharmacist", c.hours_earned, new Date(c.issued_at), c.id)}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2">
                  <Download className="h-4 w-4" /> PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
