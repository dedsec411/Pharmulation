import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Pill, Hospital,
  TrendingUp, Database, Trophy, GraduationCap, Star,
  Boxes,
  Factory,
} from "lucide-react";
import { PillBackground } from "@/components/PillBackground";
import { LogoVideo } from "@/components/LogoVideo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pharmulation - Train Like a Real Pharmacist" },
      { name: "description", content: "Interactive web-based pharmacy training simulator with real-world cases across community pharmacy, clinical, industry, and warehousing." },
      { property: "og:title", content: "Pharmulation" },
      { property: "og:description", content: "Train Like a Real Pharmacist. Anywhere. Anytime." },
    ],
  }),
  component: Landing,
});

const modes = [
  {
    icon: Pill,
    name: "Community Pharmacy",
    desc: "Prescriptions, OTC guidance & medication counseling."
  },
  {
    icon: Hospital,
    name: "Clinical",
    desc: "Hospital orders, patient files, labs & interaction review."
  },
  {
    icon: Factory,
    name: "Industry",
    desc: "Drug manufacturing, quality control & regulatory compliance."
  },
  {
    icon: Boxes,
    name: "Warehousing",
    desc: "Inventory management, cold chain & medicine distribution."
  },
];

const stats = [
  { icon: GraduationCap, value: "70,000+", label: "Pharmacists Trained" },
  { icon: Database, value: "500+", label: "Drug Database" },
  { icon: Trophy, value: "4", label: "Training Modes" },
  { icon: TrendingUp, value: "100", label: "CPD Credit Hours" },
];

const testimonials = [
  { name: "Dr. Layla H.", role: "PharmD, Cairo", quote: "Pharmulation is the closest thing to real pharmacy I've found online. The clinical cases are brilliant." },
  { name: "Omar K.", role: "Pharmacy student, Year 4", quote: "I went from terrified of prescriptions to confident in 3 weeks. The mentor tips are gold." },
  { name: "Sara M.", role: "Clinical pharmacist", quote: "Finally a CE platform that doesn't put me to sleep. The streaks keep me coming back daily." },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* HERO */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[92vh] sm:px-6 sm:py-0">
        <PillBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-4xl"
        >
          <div className="mb-3 inline-flex max-w-[92vw] items-center gap-2 rounded-full glass px-3 py-1.5 text-[10px] font-medium text-primary sm:mb-6 sm:px-4 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Built by pharmacists, for pharmacists
          </div>
          <h1 className="relative z-10 mx-auto -mt-2 -mb-8 flex justify-center sm:-mt-10 sm:-mb-28 md:-mb-36">
            <LogoVideo className="aspect-video w-[min(116vw,420px)] sm:w-[min(98vw,860px)]" />
          </h1>
          <div className="hero-copy-layer relative z-30 mx-auto max-w-3xl pt-2 sm:pt-0">
            <div className="hero-dust-field" aria-hidden="true" />
            <p className="relative z-10 mx-auto mt-0 max-w-[19rem] text-[1.05rem] font-medium leading-snug text-foreground/90 sm:max-w-none sm:text-xl md:text-2xl">
              Train Like a Real Pharmacist. <span className="text-primary">Anywhere.</span> Anytime.
            </p>
            <p className="relative z-10 mx-auto mt-3 max-w-[21rem] text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:max-w-2xl sm:text-base">
              Four immersive training modes. 500+ drug entries. Real prescriptions, real patients, real consequences - without the risk.
            </p>
            <div className="relative z-10 mt-7 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
              <Link to="/login" className="w-44 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.74_0.14_180/0.6)] transition hover:scale-[1.03] sm:w-auto sm:px-8 sm:py-3.5 sm:text-base">
                Start Training
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass-card p-6 text-center"
            >
              <s.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <div className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* MODES */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Four worlds. One pharmacist.</h2>
            <p className="mt-3 text-muted-foreground">Every mode is built around real-world clinical situations.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modes.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="glass-card p-6 group hover:border-primary/40 transition"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary group-hover:scale-110 transition">
                  <m.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{m.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">Loved by pharmacists worldwide</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 italic">"{t.quote}"</p>
                <div className="mt-4 text-sm">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-muted-foreground text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl glass-card p-10 text-center">
          <h2 className="text-3xl font-bold">Your first case is waiting.</h2>
          <p className="mt-3 text-muted-foreground">Free to start. No credit card. Earn CPD as you play.</p>
          <Link to="/login" className="mt-6 inline-block rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:scale-[1.03] transition">
            Create my account
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="font-bold text-foreground">Pharmulation</div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-primary">Sign in</Link>
            <Link to="/leaderboard" className="hover:text-primary">Leaderboard</Link>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Contact</a>
          </div>
          <div>© {new Date().getFullYear()} Pharmulation</div>
        </div>
      </footer>
    </main>
  );
}
