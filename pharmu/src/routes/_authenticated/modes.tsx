import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Pill, Hospital, Microscope, Sparkles, Siren, Lock, Clock, Factory, Package } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BackButton } from "@/components/BackButton";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";
import { supabase } from "@/integrations/supabase/client";
import { MODE_TIMERS } from "@/lib/game/shared";
import { ModeAmbientLayer } from "@/components/game/ModeAmbientLayer";

export const Route = createFileRoute("/_authenticated/modes")({
  head: () => ({ meta: [{ title: "Training Modes - Pharmulation" }] }),
  component: Modes,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
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
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <BackButton to="/dashboard" />
        </div>
        <h1 className="text-3xl font-bold">Training Modes</h1>
        <p className="mt-2 text-muted-foreground">Pick a mode - each case has a timer and a mentor tip.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const locked = m.gated && count < 10;
            const inner = (
              <div
                className={`group relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br ${m.tint} p-5 transition hover:-translate-y-0.5`}
                style={{ borderColor: `color-mix(in oklab, ${m.accent} 38%, transparent)` } as React.CSSProperties}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 18px 40px -18px ${m.accent}99, 0 0 0 1px ${m.accent}55`; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              >
                <ModeAmbientLayer mode={m.slug} intensity="card" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5" style={{ color: theme === "light" ? m.ink : m.accent }} />
                  </div>
                  <span className="rounded-full bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{m.tag}</span>
                </div>
                <h3 className="relative mt-4 text-lg font-bold" style={{ color: theme === "light" ? m.ink : m.accent }}>{m.label}</h3>
                <p className="relative mt-1 text-sm text-muted-foreground">{m.desc}</p>
                <div className="relative mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {MODE_TIMERS[m.slug as keyof typeof MODE_TIMERS]}s</span>
                  {locked && <span className="inline-flex items-center gap-1 text-amber-500"><Lock className="size-3" /> {count}/10</span>}
                </div>
              </div>
            );
            return locked ? (
              <div key={m.slug} className="opacity-60">{inner}</div>
            ) : (
              <Link key={m.slug} to={m.to as any}>{inner}</Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
