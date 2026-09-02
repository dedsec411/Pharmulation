import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, Users, ClipboardList, BarChart3, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { useMyInstitution } from "@/lib/educator/queries";
import { useThemeStore } from "@/lib/theme-store";

/**
 * The faculty side of the product.
 *
 * A separate branch rather than a section of /_authenticated, for the same
 * reason the two have different navigation: an educator is not a student with
 * extra buttons. The guard checks the role server-side on every entry, and the
 * database enforces the same rule again - a student who guesses the URL gets
 * redirected, and would see nothing even if they did not.
 */
export const Route = createFileRoute("/educator")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", data.user.id).single();

    // `educator` is newer than the checked-in generated types, so the enum they
    // declare has no such member. Compared as a string until they regenerate.
    const role = String(profile?.role ?? "");

    // Admins are let in so the platform can be supported without a second
    // account; every other role goes back to the student dashboard.
    if (role !== "educator" && role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
    return { user: data.user, role };
  },
  component: EducatorShell,
});

const NAV = [
  { to: "/educator/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/educator/classes", label: "Classes", icon: Users },
  { to: "/educator/assign", label: "Assign", icon: ClipboardList },
  { to: "/educator/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/educator/assessment", label: "Assessments", icon: Timer },
];

function EducatorShell() {
  const { pathname } = useLocation();
  const { profile } = useAuthStore();
  const { data: institution } = useMyInstitution(profile?.user_id);
  const theme = useThemeStore((s) => s.theme);

  // The faculty blue is set for a near-black ground. At L=0.62 on white it
  // lands near 4:1, which is under the bar for the small labels this accent
  // is mostly used on, so light takes a deeper blue of the same hue.
  const accent = theme === "light" ? "oklch(0.45 0.15 250)" : "oklch(0.62 0.16 250)";

  return (
    // Faculty blue rather than the student teal. Same glass surfaces and
    // typography - only the accent token is overridden, so nothing about the
    // design system is forked to achieve it.
    <div
      className="min-h-screen"
      style={{
        ["--primary" as string]: accent,
        ["--accent" as string]: accent,
        ["--ring" as string]: accent,
        ["--border" as string]: theme === "light"
          ? "oklch(0.45 0.15 250 / 26%)"
          : "oklch(0.62 0.16 250 / 20%)",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
          <Link to="/educator/dashboard" className="flex items-center gap-2 font-extrabold">
            <span className="grid size-8 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary">
              <GraduationCap className="size-4" />
            </span>
            Pharmulation
            <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
              Faculty
            </span>
          </Link>

          {/* Named once on the Classes page. A university running a cohort
              sees itself here rather than a generic product. */}
          {institution && (
            <span className="hidden min-w-0 max-w-[22ch] truncate border-l border-border/40 pl-3 text-sm text-muted-foreground sm:block">
              {institution.name}
            </span>
          )}

          <nav className="ml-auto flex flex-wrap gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-primary/18 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-3.5" /> {item.label}
                </Link>
              );
            })}
            <Link
              to="/dashboard"
              className="ml-2 inline-flex items-center rounded-full border border-border/50 px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Student view
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
