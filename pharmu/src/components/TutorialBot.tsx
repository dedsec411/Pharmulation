import { useEffect, useMemo, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/auth-store";
import { PharmacistChat } from "@/components/PharmacistChat";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  HeartPulse,
  Package,
  Pill,
  Stethoscope,
  Trophy,
  X,
} from "lucide-react";

type TutorialStep = {
  title: string;
  body: string;
};

type TutorialGuide = {
  key: string;
  label: string;
  role: string;
  icon: typeof Stethoscope;
  steps: TutorialStep[];
};

const STORAGE_PREFIX = "pharmulation_tutorial_";
const FIRST_RUN_KEY = "pharmulation_tutorial_first_run_done";
const DOCTOR_IMAGE = "/dr-hakim-clean.png";

const GUIDES: Record<string, TutorialGuide> = {
  home: {
    key: "home",
    label: "Website tour",
    role: "Pharmacist mentor",
    icon: Stethoscope,
    steps: [
      { title: "Welcome to Pharmulation", body: "This is your pharmacy training simulator. Start training, check the leaderboard, or sign in to save progress." },
      { title: "Training modes", body: "Each mode is built around a real workflow: Rx cases, OTC consultation, clinical orders, industry, and warehousing." },
      { title: "Your mentor", body: "I will appear throughout the site. You can skip a guide, finish it, or reopen it from the floating help button." },
    ],
  },
  dashboard: {
    key: "dashboard",
    label: "Dashboard tour",
    role: "Pharmacist mentor",
    icon: Trophy,
    steps: [
      { title: "Your command center", body: "The dashboard shows XP, streaks, daily challenges, recent scores, and quick access to the main training modes." },
      { title: "Daily challenge", body: "Use the daily challenge for quick XP. It points you toward a focused case for the day." },
      { title: "Mode cards", body: "Pick a training card to jump directly into a mode. Your completed case count appears under each one." },
    ],
  },
  modes: {
    key: "modes",
    label: "Modes tour",
    role: "Pharmacist mentor",
    icon: BookOpen,
    steps: [
      { title: "Choose a mode", body: "Each card opens a different pharmacy skill area. Start with Community Pharmacy if you want the broadest beginner flow." },
      { title: "Timers and difficulty", body: "Cases are timed. When a mode opens, choose difficulty to control scoring pressure and challenge level." },
      { title: "Progression", body: "Harder modes and cleaner performance earn better scores. Read mentor tips before rushing decisions." },
    ],
  },
  community: {
    key: "community",
    label: "Community tutorial",
    role: "Community pharmacist",
    icon: Pill,
    steps: [
      { title: "Pick RX or OTC", body: "Community starts by asking whether you want Rx Cases or OTC Consultation. Choose the workflow you want to practice." },
      { title: "Rx Cases", body: "Read the prescription sheet, collect the correct medicines, then review info and labels before finishing." },
      { title: "OTC Consultation", body: "Ask the right follow-up questions, recommend a medicine, choose the dose, and counsel the patient." },
      { title: "Watch the timer", body: "Leaving while the timer runs can lose progress. Finish the case or confirm before exiting." },
    ],
  },
  clinical: {
    key: "clinical",
    label: "Clinical tutorial",
    role: "Clinical pharmacist",
    icon: HeartPulse,
    steps: [
      { title: "Review the patient file", body: "Check diagnosis, allergies, current medicines, labs, and the physician order before adding anything." },
      { title: "Build medication orders", body: "Search for medicines, add correct drug orders, and set dose, route, and frequency." },
      { title: "Watch interactions", body: "Interaction and renal alerts matter. Use them to correct unsafe plans before submitting." },
    ],
  },
  industry: {
    key: "industry",
    label: "Industry tutorial",
    role: "Industrial pharmacist",
    icon: FlaskConical,
    steps: [
      { title: "Choose what to manufacture", body: "First pick a dosage form such as tablet, syrup, capsule, or semi-solid. Then select its product type." },
      { title: "Master formula", body: "Read the formula carefully. Ingredients, target weights, process conditions, and QC expectations guide the whole batch." },
      { title: "Manufacture step by step", body: "Weigh ingredients, control the environment, complete process stages, judge QC, then release or reject the batch." },
    ],
  },
  warehousing: {
    key: "warehousing",
    label: "Warehousing tutorial",
    role: "Warehouse pharmacist",
    icon: Package,
    steps: [
      { title: "Inspect stock", body: "Check deliveries, expiry dates, batch details, and storage requirements before accepting or placing items." },
      { title: "Use FEFO", body: "First expired, first out keeps stock safe and reduces waste." },
      { title: "Cold chain matters", body: "Temperature-sensitive products need correct storage. Quarantine stock when conditions are unsafe." },
    ],
  },
  generic: {
    key: "generic",
    label: "Page tutorial",
    role: "Pharmacist mentor",
    icon: Bot,
    steps: [
      { title: "Need a hand?", body: "I can guide you around this page. Use Next to continue, Finish to mark it done, or Skip to hide this guide." },
      { title: "Look for actions", body: "Primary buttons start tasks, cards open workflows, and mentor tips explain what matters clinically." },
    ],
  },
};

function guideForPath(pathname: string): TutorialGuide {
  if (pathname === "/") return GUIDES.home;
  if (pathname.includes("/dashboard")) return GUIDES.dashboard;
  if (pathname.includes("/modes")) return GUIDES.modes;
  if (pathname.includes("/game/community")) return GUIDES.community;
  if (pathname.includes("/game/hospital")) return GUIDES.clinical;
  if (pathname.includes("/game/industry")) return GUIDES.industry;
  if (pathname.includes("/game/warehousing")) return GUIDES.warehousing;
  return GUIDES.generic;
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

export function TutorialBot() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, setProfile } = useAuthStore();
  const guide = useMemo(() => guideForPath(pathname), [pathname]);
  const [step, setStep] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStep(0);
  }, [guide.key, ready]);

  useEffect(() => {
    if (!ready || !profile || profile.onboarding_completed || pathname !== "/dashboard") return;
    const alreadyRan = localStorage.getItem(`${FIRST_RUN_KEY}_${profile.user_id}`) === "done";
    if (alreadyRan) return;

    const timer = window.setTimeout(() => {
      setStep(0);
      setTutorialOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname, profile, ready]);

  if (!ready) return null;
  if (pathname === "/" || pathname.includes("/login") || pathname.includes("/signup")) return null;

  const current = guide.steps[step];
  const isLast = step === guide.steps.length - 1;

  async function completeFirstRunIfNeeded() {
    if (!profile || profile.onboarding_completed) return;
    localStorage.setItem(`${FIRST_RUN_KEY}_${profile.user_id}`, "done");
    const { data } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", profile.user_id)
      .select("*")
      .maybeSingle();
    if (data) setProfile(data as typeof profile);
  }

  async function markDone() {
    localStorage.setItem(storageKey(guide.key), "done");
    await completeFirstRunIfNeeded();
    setTutorialOpen(false);
    setStep(0);
  }

  async function skipAll() {
    Object.keys(GUIDES).forEach((key) => localStorage.setItem(storageKey(key), "done"));
    await completeFirstRunIfNeeded();
    setTutorialOpen(false);
    setStep(0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setChatOpen((open) => !open)}
        className="group fixed bottom-5 left-5 z-50 grid size-16 place-items-center rounded-2xl border border-primary/35 bg-card/80 text-primary shadow-[0_18px_45px_-18px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-primary/15"
        aria-label="Open pharmacist chat"
      >
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-background bg-primary text-[9px] font-black text-primary-foreground shadow-lg">
          Hi
        </span>
        <img
          src={DOCTOR_IMAGE}
          alt=""
          className="h-14 w-14 object-contain object-top drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)] transition duration-300 group-hover:scale-110"
        />
      </button>

      <PharmacistChat open={chatOpen} onClose={() => setChatOpen(false)} />

      <AnimatePresence>
        {tutorialOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-background/35 p-4 backdrop-blur-[2px] sm:place-items-end"
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="relative overflow-hidden border-b border-border/40 bg-primary/10 p-4">
                <motion.img
                  src={DOCTOR_IMAGE}
                  alt=""
                  aria-hidden="true"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.28 }}
                  className="pointer-events-none absolute -bottom-8 right-10 hidden h-40 w-32 object-contain object-bottom opacity-90 drop-shadow-[0_18px_28px_rgba(0,0,0,0.25)] sm:block"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative grid size-14 place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-background/45 text-primary shadow-inner">
                      <img src={DOCTOR_IMAGE} alt="" className="h-16 w-14 object-contain object-top" />
                      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-[9px] font-black text-primary">Rx</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Dr. Hakim</p>
                      <h2 className="text-lg font-black leading-tight">{guide.label}</h2>
                      <p className="text-xs text-muted-foreground">{guide.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTutorialOpen(false)}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Close tutorial"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${guide.key}-${step}`}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">Step {step + 1}/{guide.steps.length}</span>
                      <span>Guided tutorial</span>
                    </div>
                    <h3 className="text-xl font-bold">{current.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 flex gap-1.5">
                  {guide.steps.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-border"}`} />
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={markDone}
                      className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={skipAll}
                      className="rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Skip all
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={step === 0}
                      onClick={() => setStep((n) => Math.max(0, n - 1))}
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" /> Back
                    </button>
                    {isLast ? (
                      <button
                        type="button"
                        onClick={markDone}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                      >
                        <CheckCircle2 className="size-4" /> Finish
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStep((n) => Math.min(guide.steps.length - 1, n + 1))}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                      >
                        Next <ChevronRight className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
