import { Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LogoVideo } from "@/components/LogoVideo";

export function Navbar() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const isAdmin = (profile?.role as string) === "admin";

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        <Link to="/dashboard" className="flex h-12 w-28 items-center">
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
              className="rounded-full px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
              activeProps={{ className: "rounded-full px-4 py-2 text-primary bg-primary/10" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full glass px-3 py-1.5 hover:border-primary/40 transition">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{initials}</div>
            <span className="hidden sm:block text-sm">{profile?.full_name || "Pharmacist"}</span>
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 glass-card p-1 text-sm z-50">
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5">
                ⚙️ Settings
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-primary">
                  🛡️ Admin
                </Link>
              )}
              <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
