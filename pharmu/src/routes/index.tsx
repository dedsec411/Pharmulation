import { canonical } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Pill, Hospital,
  TrendingUp, Database, Trophy, GraduationCap,
  Boxes,
  Factory,
} from "lucide-react";
import { PillBackground } from "@/components/PillBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoVideo } from "@/components/LogoVideo";
import { useThemeStore } from "@/lib/theme-store";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pharmulation - Train Like a Real Pharmacist" },
      { name: "description", content: "Interactive web-based pharmacy training simulator with real-world cases across community pharmacy, clinical, industry, and warehousing." },
      { property: "og:title", content: "Pharmulation" },
      { property: "og:description", content: "Train Like a Real Pharmacist. Anywhere. Anytime." },
    ],
    links: [{ rel: "canonical", href: canonical("/") }]
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

/**
 * Every figure here is countable in the database, on purpose.
 *
 * This block previously claimed seventy thousand pharmacists trained and a
 * hundred CPD credit hours. Neither was true, and the first question a judge
 * or a pharmacist asks about a number like that is where it came from. What
 * the product genuinely has is more persuasive anyway: nine hundred medicines
 * and thirteen hundred Pakistani brand names is a real catalogue, and nobody
 * else demonstrating here will have one.
 */
const stats = [
  { icon: Database, value: "896", label: "Medicines in the catalogue" },
  { icon: Pill, value: "1,286", label: "Pakistani brand names" },
  { icon: Trophy, value: "4", label: "Training modes" },
  { icon: GraduationCap, value: "65", label: "Written case files" },
];

/**
 * What makes it different, rather than invented praise.
 *
 * This section used to carry three testimonials from people who do not exist,
 * under a heading saying the product was loved worldwide. A fabricated
 * endorsement is the weakest thing on a page: it adds nothing to a reader who
 * discounts it and costs everything with a reader who checks.
 */
const differences = [
  {
    icon: Pill,
    title: "It knows what prescribers here actually write",
    body: "A script in Karachi says Risek, not omeprazole. The catalogue carries 1,286 Pakistani brand names alongside the generics, so the medicine you are handed is the one you would really be handed.",
  },
  {
    icon: Database,
    title: "Photograph a real prescription and play it",
    body: "The Prescription Lens reads a handwritten script and builds a case from it in seconds. The photograph is never stored anywhere, and the patient's real name is discarded before you ever see the case.",
  },
  {
    icon: TrendingUp,
    title: "It tells you what you are bad at, not just your average",
    body: "Every error is filed by drug class and by skill. After a dozen cases it can say your problem is renal dosing in antibiotics - which is a thing you can go and fix.",
  },
];

const faqs = [
  {
    q: "What is Pharmulation?",
    a: "A pharmacy simulator you play in a browser. You are handed a prescription, a patient or a delivery and you have to work it: pick the right medicine, get the dose and the label right, spot what is wrong before it reaches the patient. Nothing you do here can hurt anyone, which is the whole point of practising it here first.",
  },
  {
    q: "Who is it for?",
    a: "Pharmacy students, technicians and practising pharmacists. Educators can create a class, hand out a join code, set assessments and see where a cohort is actually going wrong rather than where they assume it is.",
  },
  {
    q: "How does the scoring work?",
    a: "Every case scores what a pharmacist is judged on: choosing the right medicine, the dose, the label, and the checks you made before dispensing. Getting it wrong costs more than getting it slowly, and a hint costs a little. Each error is filed by type, which is what builds your weakness map - so after a dozen cases the app can tell you that your problem is renal dosing rather than just that your average is 71%.",
  },
  {
    q: "Do I earn CPD hours?",
    a: "Pharmulation records the time you spend training and will produce a certificate summarising it. That is a record of practice, not accreditation - whether your regulator counts self-directed learning of this kind is for you to check against their own rules.",
  },
  {
    q: "Can it really read a handwritten prescription?",
    a: "Yes. Photograph one and the Prescription Lens reads it and builds a playable case from it. The photograph is never stored anywhere, and a real patient name is discarded before you ever see the case - it comes back with an invented one.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. It is free to use and there is no card to enter.",
  },
];

export default function Landing() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
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
          {/* The negative margins tuck the copy under the video's fading
              bottom edge. The light wordmark has no such edge - applying them
              to it would pull the copy straight through the name. */}
          <h1
            className={`relative z-10 mx-auto flex justify-center ${
              theme === "light"
                ? "mb-5 sm:mb-8"
                : "-mt-2 -mb-8 sm:-mt-10 sm:-mb-28 md:-mb-36"
            }`}
          >
            {/* Never wider than the viewport it sits in. At 116vw the capsule
                was cut off at both edges with the wordmark unreadable in the
                middle - and because the oversized mark still widened the layout
                box, everything centred beneath it (headline, paragraph, button)
                was pushed off to the right and clipped with it. */}
            <LogoVideo
              size="hero"
              className="aspect-video w-[min(92vw,420px)] sm:w-[min(98vw,860px)]"
            />
          </h1>
          <div className="hero-copy-layer relative z-30 mx-auto max-w-3xl pt-2 sm:pt-0">
            <div className="hero-dust-field" aria-hidden="true" />
            <p className="relative z-10 mx-auto mt-0 max-w-[19rem] text-[1.05rem] font-medium leading-snug text-foreground/90 sm:max-w-none sm:text-xl md:text-2xl">
              Train Like a Real Pharmacist. <span className="text-primary">Anywhere.</span> Anytime.
            </p>
            <p className="relative z-10 mx-auto mt-3 max-w-[21rem] text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:max-w-2xl sm:text-base">
              Four training modes. 896 medicines. Real prescriptions, real decisions, real consequences - without the risk.
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
      <section className="px-4 py-10 sm:px-6 sm:py-12">
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
      <section className="px-4 py-12 sm:px-6 sm:py-20">
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
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-center text-3xl font-bold md:text-4xl">
            Built for the pharmacy you will actually work in
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            Three things a generic quiz app does not do.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {differences.map((d) => (
              <div key={d.title} className="glass-card p-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <d.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold leading-snug">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl glass-card p-6 sm:p-10 text-center">
          <h2 className="text-3xl font-bold">Your first case is waiting.</h2>
          <p className="mt-3 text-muted-foreground">Free to start. No card. Your training time is tracked as you go.</p>
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
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
            <a href="mailto:wasiqahmed411@gmail.com" className="hover:text-primary">Contact</a>
          </div>
          <div>© {new Date().getFullYear()} Pharmulation</div>
        </div>
      </footer>
    </main>
  );
}
