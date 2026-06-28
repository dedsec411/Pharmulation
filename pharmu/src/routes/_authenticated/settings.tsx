import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BackButton } from "@/components/BackButton";
import { useSettings } from "@/lib/settings-store";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PharmaVerse" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSettings();
  const { profile } = useAuthStore();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [password, setPassword] = useState("");

  async function saveName() {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("user_id", profile.user_id);
    if (error) return toast.error(error.message);
    toast.success("Display name updated");
  }
  async function changePassword() {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setPassword("");
  }
  async function deleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    if (!profile) return;
    await supabase.from("profiles").delete().eq("user_id", profile.user_id);
    await supabase.auth.signOut();
    toast.success("Account deleted");
    window.location.href = "/";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <div><BackButton to="/profile" /></div>
        <h1 className="text-3xl font-bold">Settings</h1>

        <section className="glass-card p-6 space-y-4">
          <h2 className="font-bold">Preferences</h2>
          <Toggle label="Sound effects" desc="Chimes for answers, level-ups and timers" checked={s.soundEnabled} onChange={s.setSound} />
          <Toggle label="Mentor tips" desc="Show tip popups during gameplay" checked={s.mentorTipsEnabled} onChange={s.setMentorTips} />
          <Toggle label="Timer warnings" desc="Audible ticking in the last 30 seconds" checked={s.timerWarningsEnabled} onChange={s.setTimerWarnings} />
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="font-bold">Profile</h2>
          <label className="block text-xs text-muted-foreground">Display name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl glass px-4 py-2.5 outline-none" />
          <button onClick={saveName} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Save</button>
        </section>

        <section className="glass-card p-6 space-y-3">
          <h2 className="font-bold">Change password</h2>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="New password" className="w-full rounded-xl glass px-4 py-2.5 outline-none" />
          <button onClick={changePassword} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Update</button>
        </section>

        <section className="glass-card p-6">
          <h2 className="font-bold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all data.</p>
          <button onClick={deleteAccount} className="mt-3 rounded-full bg-destructive/20 text-destructive border border-destructive/40 px-5 py-2 text-sm font-semibold hover:bg-destructive/30">
            Delete account
          </button>
        </section>
      </main>
    </>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? "bg-primary" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
