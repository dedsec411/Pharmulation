import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LogOut, Moon, Sun, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LogoVideo } from "@/components/LogoVideo";

function cleanPlayerName(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Pharmacist";
  return raw
    .replace(/@.*/, "")
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Navbar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const displayName = cleanPlayerName(profile?.full_name ?? profile?.email);
  const initials = displayName
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const role = String(profile?.role ?? "");
  const isAdmin = role === "admin";
  // Admins get the link too, so the faculty side can be supported without a
  // second account.
  const isFaculty = role === "educator" || isAdmin;

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6">
        <Link to="/dashboard" className="flex h-20 w-60 items-center overflow-visible rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:drop-shadow-[0_16px_34px_oklch(0.74_0.14_180/0.28)]">
          <LogoVideo className="aspect-video w-full" />
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm">
          {[
            { to: "/dashboard", label: "Dashboard" },
            { to: "/modes", label: "Modes" },
            { to: "/drugs", label: "Drug DB" },
            { to: "/leaderboard", label: "Leaderboard" },
            { to: "/profile", label: "Profile" },
          ].map((l) => (
            <Link key={l.to} to={l.to}
              className="rounded-full border border-transparent px-4 py-2 text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]"
              activeProps={{ className: "rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-primary shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full glass px-3 py-1.5 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{initials}</div>
            <span className="hidden sm:block text-sm">{displayName}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 glass-card p-1 text-sm z-50 shadow-[0_22px_55px_-30px_oklch(0.74_0.14_180/0.8)]">
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]">
                ⚙️ Settings
              </Link>
              {/* Stays open: switching theme is something people try, look at,
                  and switch straight back. Closing the menu each time makes
                  comparing the two a chore. */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary text-left"
              >
                {theme === "dark"
                  ? <><Sun className="h-4 w-4" /> Light theme</>
                  : <><Moon className="h-4 w-4" /> Dark theme</>}
              </button>
              {isFaculty && (
                <Link to="/educator/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-sky-400/10 hover:text-sky-700 dark:text-sky-300 text-sky-400">
                  <GraduationCap className="h-4 w-4" /> Faculty
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)] text-primary">
                  🛡️ Admin
                </Link>
              )}
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)] text-left">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
