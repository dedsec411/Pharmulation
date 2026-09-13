import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LogoVideo } from "@/components/LogoVideo";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const role = String(profile?.role ?? "");
  const isAdmin = role === "admin";
  // Admins get the link too, so the faculty side can be supported without a
  // second account.
  const isFaculty = role === "educator" || isAdmin;

  /**
   * What goes in the bar, by who is looking at it.
   *
   * A student gets Class - joining one and the work set for it used to be
   * buried at the bottom of the profile page, which is not somewhere anybody
   * looks when a lecturer has just read a code out. Faculty get Faculty, which
   * was previously only reachable from inside the account dropdown.
   *
   * They are deliberately exclusive. A lecturer does not enrol in their own
   * class, and showing them a student page with nothing in it would be a dead
   * end rather than a feature.
   */
  // `tour` is what the guide flies to; see src/lib/tutorial-spots.ts.
  const links = [
    { to: "/dashboard", label: "Dashboard", tour: "nav-dashboard" },
    { to: "/modes", label: "Modes", tour: "nav-modes" },
    ...(isFaculty
      ? [{ to: "/educator/dashboard", label: "Faculty", tour: "nav-faculty" }]
      : [{ to: "/class", label: "Class", tour: "nav-class" }]),
    { to: "/drugs", label: "Drug DB", tour: "nav-drugs" },
    { to: "/leaderboard", label: "Leaderboard", tour: "nav-leaderboard" },
  ] as const;

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-24 sm:px-6">
        <Link to="/dashboard" className="flex h-12 w-36 shrink-0 items-center overflow-visible rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:drop-shadow-[0_16px_34px_oklch(0.74_0.14_180/0.28)] sm:h-20 sm:w-60">
          <LogoVideo className="aspect-video w-full" />
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm">
          {[...links, { to: "/profile", label: "Profile", tour: "nav-profile" } as const].map((l) => (
            <Link key={l.to} to={l.to} data-tour={l.tour}
              className="rounded-full border border-transparent px-4 py-2 text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]"
              activeProps={{ className: "rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-primary shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div data-tour="theme-toggle">
            <ThemeToggle />
          </div>

          <div className="relative">
          <button onClick={() => setOpen((o) => !o)} data-tour="account-menu"
            className="flex items-center gap-2 rounded-full glass px-3 py-1.5 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{initials}</div>
            <span className="hidden sm:block text-sm">{displayName}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 glass-card p-1 text-sm z-50 shadow-[0_22px_55px_-30px_oklch(0.74_0.14_180/0.8)]">
              {/* The bar's own links are hidden below md, so without these a
                  phone could reach Modes, the Drug DB and the Leaderboard only
                  by going via the dashboard cards. Hidden from md up, where
                  the bar shows them itself and repeating them would be noise. */}
              <div className="md:hidden">
                {/* The dropdown already carries its own Faculty entry below,
                    styled apart from the rest, so it is dropped from the shared
                    list here rather than appearing twice. */}
                {links.filter((l) => l.to !== "/educator/dashboard").map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-primary/10 hover:text-primary"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
              </div>
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg transition duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_28px_-22px_oklch(0.74_0.14_180/0.8)]">
                ⚙️ Settings
              </Link>
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
      </div>
    </nav>
  );
}
