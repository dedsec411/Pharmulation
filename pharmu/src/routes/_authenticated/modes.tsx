import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pill, Hospital, Microscope, Sparkles, Siren, Lock, Clock, Factory, Package, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BackButton } from "@/components/BackButton";
import { LensEntry } from "@/components/lens/LensEntry";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";
import { supabase } from "@/integrations/supabase/client";
import { MODE_TIMERS, isTimedMode } from "@/lib/game/shared";
import { ModeAmbientLayer } from "@/components/game/ModeAmbientLayer";

export const Route = createFileRoute("/_authenticated/modes")({
  head: () => ({ meta: [{ title: "Training Modes - Pharmulation" }] }),
  component: Modes,
  errorComponent: ({ error }) => <div className="p-5 sm:p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-5 sm:p-8">Not found</div>,
});

type ModeCard = {
  slug: string; to: string; label: string; desc: string;
  icon: any; emoji: string; tag: string;
  accent: string; ink: string; tint: string;
  gated?: boolean;
};
const MODES: ModeCard[] = [
{
  slug: "rx",
  to: "/game/community",
  label: "Community Pharmacy",
  desc: "Prescriptions & OTC consultations - the full dispensary experience.",
  icon: Pill,
  emoji: "💊🏪",
  tag: "Beginner",
  accent: "#00BFA5", ink: "#0A7A6B",
  tint: "from-teal-500/25 to-cyan-500/10",
},
  { slug: "hospital", to: "/game/hospital", label: "Clinical", desc: "Build medication orders, check interactions.", icon: Hospital, emoji: "🏥", tag: "Medium", accent: "#6366F1", ink: "#4038B8", tint: "from-[#6366F1]/25 to-[#A78BFA]/10" },
  { slug: "industry", to: "/game/industry", label: "Industry", desc: "Run a tablet batch from formula to release.", icon: Factory, emoji: "🏭", tag: "Medium", accent: "#F59E0B", ink: "#9A5B06", tint: "from-[#F59E0B]/25 to-[#FBBF24]/10" },
  { slug: "warehousing", to: "/game/warehousing", label: "Warehousing", desc: "Receive stock, FEFO, cold chain & reconciliation.", icon: Package, emoji: "📦", tag: "Medium", accent: "#0EA5E9", ink: "#0A6C99", tint: "from-[#0EA5E9]/25 to-[#38BDF8]/10" },
];

function Modes() {
  const { profile } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const { data: count = 0 } = useQuery({
    queryKey: ["all-cases-count", profile?.user_id],
    queryFn: async () => {
      if (!profile) return 0;
      const { count } = await supabase.from("scores").select("*", { count: "exact", head: true }).eq("user_id", profile.user_id);
      return count ?? 0;
    },
    enabled: !!profile,
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-10" data-tour-scene="modes">
        <div className="mb-6 max-sm:mb-4">
          <BackButton to="/dashboard" />
        </div>
        <h1 className="text-3xl font-bold">Training Modes</h1>
        <p className="mt-2 text-muted-foreground">Pick a mode - each case has a timer and a mentor tip.</p>

        {/* On a phone the four modes come straight after the heading and Lens
            follows them: above the grid it pushed two of the four below the
            first screen of a page whose whole job is choosing one. Only the
            painted order changes; from sm up this wrapper is a plain block and
            the page is as it was. */}
        <div className="max-sm:mt-5 max-sm:flex max-sm:flex-col-reverse max-sm:gap-6">
        {/* Above the grid for the same reason it is on the dashboard: it is not
            a fifth mode, it is a way of bringing your own case. */}
        <LensEntry className="mt-6 max-sm:mt-0" />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-sm:mt-0 max-sm:gap-3" data-tour="modes-grid">
          {MODES.map((m) => {
            const Icon = m.icon;
            const locked = m.gated && count < 10;
            // On a phone each card is a row: an icon tile, the name and what
            // the mode is across the full width, then the time and difficulty
            // beside a Play mark. Below sm the card is a grid and the top and
            // footer rows dissolve (contents) so their pieces can be placed on
            // it; from sm up every class is as it was. The whole card is still
            // the one link - Play is a mark on it, not a second control, so it
            // is hidden from assistive tech and never shown on a locked card.
            const inner = (
              <div
                className={`group relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br ${m.tint} p-5 transition hover:-translate-y-0.5 max-sm:grid max-sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-3 max-sm:p-4`}
                style={{ borderColor: `color-mix(in oklab, ${m.accent} 38%, transparent)`, "--mode-accent": m.accent } as React.CSSProperties}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 18px 40px -18px ${m.accent}99, 0 0 0 1px ${m.accent}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Not on a phone: in a row this short the trace, gears and
                    conveyor run through the name and the description. */}
                <div className="pointer-events-none absolute inset-0 max-sm:hidden">
                  <ModeAmbientLayer mode={m.slug} intensity="card" />
                </div>
                <div className="relative flex items-start justify-between max-sm:contents">
                  <div className="flex items-center gap-2 max-sm:col-start-1 max-sm:row-span-2 max-sm:row-start-1 max-sm:size-10 max-sm:justify-center max-sm:self-center max-sm:rounded-xl max-sm:bg-[color-mix(in_oklab,var(--mode-accent)_16%,transparent)]">
                    <Icon className="size-5" style={{ color: theme === "light" ? m.ink : m.accent }} />
                  </div>
                  {/* A phone shows the difficulty as words beside the time, not
                      a 10px capitals badge. */}
                  <span className="rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur max-sm:col-start-3 max-sm:row-start-3 max-sm:mt-3 max-sm:justify-self-start max-sm:rounded-none max-sm:border-l max-sm:border-foreground/15 max-sm:bg-transparent max-sm:py-0 max-sm:pl-3 max-sm:pr-0 max-sm:text-xs max-sm:font-medium max-sm:normal-case max-sm:tracking-normal">{m.tag}</span>
                </div>
                <h3 className="relative mt-4 text-lg font-bold max-sm:col-span-3 max-sm:col-start-2 max-sm:row-start-1 max-sm:mt-0 max-sm:leading-snug" style={{ color: theme === "light" ? m.ink : m.accent }}>{m.label}</h3>
                <p className="relative mt-1 text-sm text-muted-foreground max-sm:col-span-3 max-sm:col-start-2 max-sm:row-start-2 max-sm:mt-0.5">{m.desc}</p>
                <div className="relative mt-4 flex items-center justify-between text-xs text-muted-foreground max-sm:contents">
                  {isTimedMode(m.slug)
                    ? <span className="inline-flex items-center gap-1 max-sm:col-start-2 max-sm:row-start-3 max-sm:mt-3"><Clock className="size-3" /> {MODE_TIMERS[m.slug]}s</span>
                    : <span className="inline-flex items-center gap-1 max-sm:col-start-2 max-sm:row-start-3 max-sm:mt-3"><Clock className="size-3" /> no time limit</span>}
                  {locked && <span className="inline-flex items-center gap-1 text-amber-500 max-sm:col-start-4 max-sm:row-start-3 max-sm:mt-3 max-sm:justify-self-end"><Lock className="size-3" /> {count}/10</span>}
                </div>
                {/* Lightened a touch on the dark theme so the dark label keeps
                    its contrast on the indigo of Clinical. */}
                {!locked && (
                  <span
                    aria-hidden="true"
                    className="hidden items-center gap-1 rounded-full px-4 text-sm font-semibold text-background max-sm:col-start-4 max-sm:row-start-3 max-sm:mt-3 max-sm:inline-flex max-sm:h-9"
                    style={{ backgroundColor: theme === "light" ? m.ink : `color-mix(in oklab, ${m.accent} 80%, white)` }}
                  >
                    Play <ChevronRight className="size-3.5" />
                  </span>
                )}
              </div>
            );
            return locked ? (
              <div key={m.slug} className="opacity-60">{inner}</div>
            ) : (
              <Link key={m.slug} to={m.to as any}>{inner}</Link>
            );
          })}
        </div>
        </div>
      </main>
    </>
  );
}
