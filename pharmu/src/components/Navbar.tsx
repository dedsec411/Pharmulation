import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, Layers, LayoutDashboard, LogOut, Pill, Settings, ShieldCheck, Trophy, User, UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoVideo } from "@/components/LogoVideo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShellMenu, shellRowClass, type ShellMenuItem } from "@/components/ShellMenu";
import { studentSectionLabel } from "@/lib/shell-nav";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const account = useRef<HTMLDivElement | null>(null);

  // The account dropdown stayed open until its own button was pressed again,
  // so a click anywhere else on the page went straight through to whatever was
  // underneath it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!account.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  // The same destinations as the bar, plus Profile, as the phone menu's tiles.
  // Six, so they sit in three even rows of two.
  const phoneItems: ShellMenuItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/modes", label: "Modes", icon: Layers },
    isFaculty
      ? { to: "/educator/dashboard", label: "Faculty", icon: GraduationCap }
      : { to: "/class", label: "Class", icon: GraduationCap },
    { to: "/drugs", label: "Drug DB", icon: Pill },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  const avatar = (size: "sm" | "md") => (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground ${
        size === "sm" ? "size-8 text-xs" : "size-10 text-sm"
      }`}
    >
      {initials}
    </span>
  );

  return (
    <nav data-app-nav="" aria-label="Main" className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-24 sm:px-6">
        {/* Narrower between md and lg. The bar needs 998px to lay out: at 768,
            where the desktop links first appear, that let the page scroll 230px
            sideways with the account button off the right edge. The logo, the
            link padding and the account name each give some of it back, and
            every lg: value is what the desktop always had.

            Measured again on 2026-09-19: at 768 the link row still wanted 459px
            and was given 437, so "Drug DB" - the only two-word label - wrapped
            onto a second line. md:w-36 here and px-1.5 on the links give back
            16px and 24px, which leaves 18px spare rather than the 2px that
            trimming only the padding would have left. Deliberately no
            whitespace-nowrap: if a future label ever outgrows the row again it
            should wrap, which is ugly, rather than push the page sideways,
            which is the bug this comment already describes. */}
        <Link to="/dashboard" className="flex h-12 w-36 shrink-0 items-center overflow-visible rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:drop-shadow-[0_16px_34px_oklch(0.74_0.14_180/0.28)] sm:h-20 sm:w-60 md:w-36 lg:w-60">
          <LogoVideo className="aspect-video w-full" />
        </Link>
        <div className="hidden md:flex items-center gap-0.5 lg:gap-1 text-sm">
          {[...links, { to: "/profile", label: "Profile", tour: "nav-profile" } as const].map((l) => (
            <Link key={l.to} to={l.to} data-tour={l.tour}
              className="rounded-full border border-transparent px-1.5 py-2 lg:px-4 text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]"
              activeProps={{ className: "rounded-full border border-primary/35 bg-primary/10 px-1.5 py-2 lg:px-4 text-primary shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]" }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* Below md the theme switch and the account button would be two
              small controls side by side; both move into the phone menu. */}
          <div data-tour="theme-toggle" className="hidden md:block">
            <ThemeToggle />
          </div>

          <div ref={account} className="relative hidden md:block">
          <button onClick={() => setOpen((o) => !o)} data-tour="account-menu"
            aria-expanded={open} aria-haspopup="true" aria-controls="account-menu-panel"
            className="flex items-center gap-2 rounded-full glass px-2 py-1.5 lg:px-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-[0_14px_34px_-22px_oklch(0.74_0.14_180/0.85)]">
            <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{initials}</div>
            {/* The initials stand in for the name until there is room for both:
                the name is what the menu's own heading repeats anyway. */}
            <span className="hidden lg:block text-sm">{displayName}</span>
          </button>
          {open && (
            <div id="account-menu-panel" className="absolute right-0 mt-2 w-48 glass-card p-1 text-sm z-50 shadow-[0_22px_55px_-30px_oklch(0.74_0.14_180/0.8)]">
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

          <ShellMenu
            label="Main"
            tour="account-menu"
            current={studentSectionLabel(pathname)}
            badge={avatar("sm")}
            heading={
              <div className="mb-3 flex items-center gap-3 px-1">
                {avatar("md")}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {role || "student"}{profile?.level ? ` · Level ${profile.level}` : ""}
                  </p>
                </div>
              </div>
            }
            items={phoneItems}
            footer={(close) => (
              <>
                <Link to="/settings" onClick={close} className={shellRowClass}>
                  <Settings className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /> Settings
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={close} className={shellRowClass}>
                    <ShieldCheck className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /> Admin
                  </Link>
                )}
                {/* A labelled row rather than a bare capsule: on a phone the
                    switch needs its word beside it to read as a setting. */}
                <div className="flex min-h-12 items-center justify-between gap-3 px-3 text-sm font-semibold text-foreground/90">
                  <span>Theme</span>
                  <ThemeToggle />
                </div>
                <button type="button" onClick={() => { close(); void signOut(); }} className={shellRowClass}>
                  <LogOut className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /> Sign out
                </button>
              </>
            )}
          />
        </div>
      </div>
    </nav>
  );
}
