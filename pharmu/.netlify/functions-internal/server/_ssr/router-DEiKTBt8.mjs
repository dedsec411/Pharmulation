import { b as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { Q as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { c as createRouter, a as createRootRouteWithContext, u as useRouter, L as Link, O as Outlet, H as HeadContent, S as Scripts, b as createFileRoute, l as lazyRouteComponent, d as useRouterState } from "../_libs/tanstack__react-router.mjs";
import { S as redirect } from "../_libs/tanstack__router-core.mjs";
import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { T as Toaster$1 } from "../_libs/sonner.mjs";
import { s as supabase } from "./client-CGYRwklv.mjs";
import { c as createServerFn, a as createSsrRpc } from "./vendor-tanstack-Z7Fi8gb-.mjs";
import { S as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { c as cva } from "../_libs/class-variance-authority.mjs";
import { c as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { A as AnimatePresence, m as motion } from "../_libs/framer-motion.mjs";
import { X, C as ChevronLeft, a as CircleCheck, b as ChevronRight, G as GraduationCap, D as Database, T as Trophy, c as TrendingUp, P as Pill, B as Boxes, S as Siren, F as Factory, d as Star, e as Stethoscope, f as BookOpen, g as ClipboardList, h as CircleQuestionMark, H as HeartPulse, i as FlaskConical, j as Package, k as Syringe, l as Bot, m as Send } from "../_libs/lucide-react.mjs";
import { c as create } from "../_libs/zustand.mjs";
import { o as objectType, l as literalType, a as arrayType, s as stringType, u as unionType, n as numberType, e as enumType } from "../_libs/zod.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "node:stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/motion-dom.mjs";
import "../_libs/motion-utils.mjs";
const appCss = "/assets/styles-CjEcD428.css";
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
const useAuthStore = create((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, session: null, profile: null, loading: false })
}));
const ChatMessageSchema = objectType({
  role: enumType(["user", "assistant"]),
  content: stringType().min(1).max(2e3)
});
const PatientInfoSchema = objectType({
  name: stringType().optional().nullable(),
  age: unionType([stringType(), numberType()]).optional().nullable(),
  symptoms: stringType().optional().nullable(),
  allergies: stringType().optional().nullable(),
  current_meds: stringType().optional().nullable()
}).optional();
const sendChatMessage = createServerFn({
  method: "POST"
}).validator(objectType({
  messages: arrayType(ChatMessageSchema).min(1).max(30),
  context: literalType("patient"),
  patientInfo: PatientInfoSchema
})).handler(createSsrRpc("6998d5bda3c8f203fdc10234018043ebcfba19eaea0dab1a9b324f1a8d498e87"));
const useActiveCaseStore = create((set) => ({
  caseData: null,
  setActiveCase: (caseData) => set({ caseData })
}));
const MAX_EXCHANGES = 15;
const PRACTICE_PATIENT = {
  name: "Ayesha Khan",
  age: 32,
  symptoms: "blocked nose, sore throat, dry cough, and feeling tired for the last 2 days",
  allergies: "penicillin caused a rash once",
  current_meds: "metformin 500 mg twice daily and occasional paracetamol"
};
function PharmacistChat({ open, onClose }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeCase = useActiveCaseStore((state) => state.caseData);
  const [messages, setMessages] = reactExports.useState([]);
  const [input, setInput] = reactExports.useState("");
  const [waiting, setWaiting] = reactExports.useState(false);
  const endRef = reactExports.useRef(null);
  const isGame = pathname.includes("/game/");
  const patientInfo = reactExports.useMemo(() => extractPatientInfo(activeCase), [activeCase]);
  const conversationKey = `${pathname}:${activeCase?.id ?? "practice"}`;
  const context = "patient";
  const title = patientInfo.name || "Patient";
  const subtitle = isGame && activeCase ? "Case patient" : "Practice patient";
  const exchangeCount = messages.filter((message) => message.role === "user").length;
  const limitReached = exchangeCount >= MAX_EXCHANGES;
  reactExports.useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setWaiting(false);
    }
  }, [open]);
  reactExports.useEffect(() => {
    setMessages([]);
    setInput("");
    setWaiting(false);
  }, [conversationKey]);
  reactExports.useEffect(() => {
    if (!open) return;
    setMessages((current) => current.length ? current : [{ role: "assistant", content: openingLine(patientInfo) }]);
  }, [open, conversationKey, patientInfo]);
  reactExports.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting, open]);
  async function submit(event) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || waiting || limitReached) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setWaiting(true);
    try {
      const result = await sendChatMessage({
        data: {
          messages: messagesForApi(nextMessages),
          context,
          patientInfo
        }
      });
      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Sorry, I could not respond right now." }]);
    } finally {
      setWaiting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: open && /* @__PURE__ */ jsxRuntimeExports.jsxs(
    motion.section,
    {
      initial: { opacity: 0, y: 26, scale: 0.96 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 18, scale: 0.97 },
      transition: { duration: 0.2 },
      className: "glass-card fixed bottom-24 left-5 z-[60] flex h-[min(620px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden border-primary/35 bg-background/90 shadow-[0_24px_70px_-26px_oklch(0.74_0.14_180/0.95)]",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex items-center justify-between gap-3 border-b border-border/40 bg-primary/10 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] font-black uppercase tracking-[0.24em] text-primary", children: "Patient chat" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-lg font-black leading-none", children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: subtitle })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onClose,
              className: "rounded-full border border-border/50 p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary",
              "aria-label": "Close chat",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 space-y-3 overflow-y-auto p-4", children: [
          messages.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/35 bg-card/45 p-4 text-sm text-muted-foreground", children: "Ask the patient focused questions about symptoms, allergies, current medicines, red flags, and expectations." }),
          messages.map((message, index) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `flex ${message.role === "user" ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_oklch(0.74_0.14_180/0.95)]" : "glass-card border-border/40 bg-card/65 text-foreground"}`,
              children: message.content
            }
          ) }, `${message.role}-${index}`)),
          waiting && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-start", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card flex items-center gap-1.5 border-border/40 bg-card/65 px-4 py-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "size-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "border-t border-border/40 bg-background/70 p-3", children: [
          limitReached && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary", children: "Conversation limit reached, refresh to start a new chat" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                value: input,
                onChange: (event) => setInput(event.target.value),
                disabled: waiting || limitReached,
                placeholder: "Ask the patient...",
                className: "min-w-0 flex-1 rounded-full border border-border/45 bg-card/70 px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/20 disabled:opacity-55"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "submit",
                disabled: waiting || limitReached || !input.trim(),
                className: "grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_oklch(0.74_0.14_180/0.95)] transition hover:brightness-110 disabled:opacity-45",
                "aria-label": "Send message",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "size-4" })
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}
function extractPatientInfo(caseData) {
  if (!caseData) return PRACTICE_PATIENT;
  const patient = caseData?.patient_info_json ?? {};
  const symptoms = patient.symptoms ?? patient.complaint ?? patient.presenting_complaint ?? patient.diagnosis ?? caseData?.title ?? "";
  const meds = patient.current_meds ?? patient.currentMeds ?? patient.medications ?? patient.home_meds ?? "";
  return {
    name: patient.name ?? caseData?.electronic_prescription_json?.patient ?? "Patient",
    age: patient.age ?? "",
    symptoms: stringifyInfo(symptoms),
    allergies: stringifyInfo(patient.allergies ?? patient.allergy ?? "none"),
    current_meds: stringifyInfo(meds || "none")
  };
}
function openingLine(patientInfo) {
  const symptomText = patientInfo.symptoms || "a problem I wanted to ask about";
  return `Hi, I wanted to ask about ${symptomText}. Can you help me?`;
}
function messagesForApi(messages) {
  const firstQuestionIndex = messages.findIndex((message) => message.role === "user");
  return firstQuestionIndex === -1 ? messages : messages.slice(firstQuestionIndex);
}
function stringifyInfo(value) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return Object.values(value).map(String).join(", ");
  return String(value ?? "");
}
const STORAGE_PREFIX = "pharmulation_tutorial_";
const FIRST_RUN_KEY = "pharmulation_tutorial_first_run_done";
const DOCTOR_IMAGE = "/doctor-mentor.png";
const GUIDES = {
  home: {
    key: "home",
    label: "Website tour",
    role: "Pharmacist mentor",
    icon: Stethoscope,
    steps: [
      { title: "Welcome to Pharmulation", body: "This is your pharmacy training simulator. Start training, check the leaderboard, or sign in to save progress." },
      { title: "Training modes", body: "Each mode is built around a real workflow: Rx cases, OTC consultation, clinical orders, industry, emergency, and warehousing." },
      { title: "Your mentor", body: "I will appear throughout the site. You can skip a guide, finish it, or reopen it from the floating help button." }
    ]
  },
  dashboard: {
    key: "dashboard",
    label: "Dashboard tour",
    role: "Pharmacist mentor",
    icon: Trophy,
    steps: [
      { title: "Your command center", body: "The dashboard shows XP, streaks, daily challenges, recent scores, and quick access to the main training modes." },
      { title: "Daily challenge", body: "Use the daily challenge for quick XP. It points you toward a focused case for the day." },
      { title: "Mode cards", body: "Pick a training card to jump directly into a mode. Your completed case count appears under each one." }
    ]
  },
  modes: {
    key: "modes",
    label: "Modes tour",
    role: "Pharmacist mentor",
    icon: BookOpen,
    steps: [
      { title: "Choose a mode", body: "Each card opens a different pharmacy skill area. Start with Community Pharmacy if you want the broadest beginner flow." },
      { title: "Timers and difficulty", body: "Cases are timed. When a mode opens, choose difficulty to control scoring pressure and challenge level." },
      { title: "Progression", body: "Harder modes and cleaner performance earn better scores. Read mentor tips before rushing decisions." }
    ]
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
      { title: "Watch the timer", body: "Leaving while the timer runs can lose progress. Finish the case or confirm before exiting." }
    ]
  },
  rx: {
    key: "rx",
    label: "Rx Cases tutorial",
    role: "Dispensing pharmacist",
    icon: ClipboardList,
    steps: [
      { title: "Read before tapping", body: "Check patient details, allergies, diagnosis, and prescribed medicines before collecting anything." },
      { title: "Collect accurately", body: "Tap only the required drugs. Wrong selections reduce score and trigger mentor feedback." },
      { title: "Finish labels", body: "After collection, confirm drug information and choose correct label instructions for each medicine." }
    ]
  },
  otc: {
    key: "otc",
    label: "OTC tutorial",
    role: "OTC pharmacist",
    icon: CircleQuestionMark,
    steps: [
      { title: "Start with questions", body: "Good OTC care begins by asking about duration, severity, red flags, allergies, pregnancy, and current medicines." },
      { title: "Recommend safely", body: "Choose the drug that best matches symptoms and patient risk factors." },
      { title: "Counsel clearly", body: "Finish with dose, how to take it, side effects, and when the patient should seek medical help." }
    ]
  },
  clinical: {
    key: "clinical",
    label: "Clinical tutorial",
    role: "Clinical pharmacist",
    icon: HeartPulse,
    steps: [
      { title: "Review the patient file", body: "Check diagnosis, allergies, current medicines, labs, and the physician order before adding anything." },
      { title: "Build medication orders", body: "Search for medicines, add correct drug orders, and set dose, route, and frequency." },
      { title: "Watch interactions", body: "Interaction and renal alerts matter. Use them to correct unsafe plans before submitting." }
    ]
  },
  industry: {
    key: "industry",
    label: "Industry tutorial",
    role: "Industrial pharmacist",
    icon: FlaskConical,
    steps: [
      { title: "Choose what to manufacture", body: "First pick a dosage form such as tablet, syrup, capsule, or semi-solid. Then select its product type." },
      { title: "Master formula", body: "Read the formula carefully. Ingredients, target weights, process conditions, and QC expectations guide the whole batch." },
      { title: "Manufacture step by step", body: "Weigh ingredients, control the environment, complete process stages, judge QC, then release or reject the batch." }
    ]
  },
  warehousing: {
    key: "warehousing",
    label: "Warehousing tutorial",
    role: "Warehouse pharmacist",
    icon: Package,
    steps: [
      { title: "Inspect stock", body: "Check deliveries, expiry dates, batch details, and storage requirements before accepting or placing items." },
      { title: "Use FEFO", body: "First expired, first out keeps stock safe and reduces waste." },
      { title: "Cold chain matters", body: "Temperature-sensitive products need correct storage. Quarantine stock when conditions are unsafe." }
    ]
  },
  emergency: {
    key: "emergency",
    label: "Emergency tutorial",
    role: "Emergency pharmacist",
    icon: Syringe,
    steps: [
      { title: "Move fast", body: "Emergency mode is high pressure. Read the scenario, identify the risk, and act quickly." },
      { title: "Pick critical interventions", body: "Choose medicines and actions that address immediate danger first." },
      { title: "Accuracy still counts", body: "Speed helps, but unsafe choices can cost heavily. Use hints when stuck." }
    ]
  },
  generic: {
    key: "generic",
    label: "Page tutorial",
    role: "Pharmacist mentor",
    icon: Bot,
    steps: [
      { title: "Need a hand?", body: "I can guide you around this page. Use Next to continue, Finish to mark it done, or Skip to hide this guide." },
      { title: "Look for actions", body: "Primary buttons start tasks, cards open workflows, and mentor tips explain what matters clinically." }
    ]
  }
};
function guideForPath(pathname) {
  if (pathname === "/") return GUIDES.home;
  if (pathname.includes("/dashboard")) return GUIDES.dashboard;
  if (pathname.includes("/modes")) return GUIDES.modes;
  if (pathname.includes("/game/community")) return GUIDES.community;
  if (pathname.includes("/game/rx")) return GUIDES.rx;
  if (pathname.includes("/game/otc")) return GUIDES.otc;
  if (pathname.includes("/game/hospital")) return GUIDES.clinical;
  if (pathname.includes("/game/industry")) return GUIDES.industry;
  if (pathname.includes("/game/warehousing")) return GUIDES.warehousing;
  if (pathname.includes("/game/emergency")) return GUIDES.emergency;
  return GUIDES.generic;
}
function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}
function TutorialBot() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { profile, setProfile } = useAuthStore();
  const guide = reactExports.useMemo(() => guideForPath(pathname), [pathname]);
  const [step, setStep] = reactExports.useState(0);
  const [tutorialOpen, setTutorialOpen] = reactExports.useState(false);
  const [chatOpen, setChatOpen] = reactExports.useState(false);
  const [ready, setReady] = reactExports.useState(false);
  reactExports.useEffect(() => {
    setReady(true);
  }, []);
  reactExports.useEffect(() => {
    if (!ready) return;
    setStep(0);
  }, [guide.key, ready]);
  reactExports.useEffect(() => {
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
    const { data } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("user_id", profile.user_id).select("*").maybeSingle();
    if (data) setProfile(data);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setChatOpen((open) => !open),
        className: "group fixed bottom-5 left-5 z-50 grid size-16 place-items-center rounded-2xl border border-primary/35 bg-card/80 text-primary shadow-[0_18px_45px_-18px_oklch(0.74_0.14_180/0.9)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-primary/15",
        "aria-label": "Open pharmacist chat",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-background bg-primary text-[9px] font-black text-primary-foreground shadow-lg", children: "Hi" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: DOCTOR_IMAGE,
              alt: "",
              className: "h-14 w-14 object-contain object-top drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)] transition duration-300 group-hover:scale-110"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PharmacistChat, { open: chatOpen, onClose: () => setChatOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: tutorialOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-50 grid place-items-end bg-background/35 p-4 backdrop-blur-[2px] sm:place-items-end",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          motion.section,
          {
            initial: { opacity: 0, y: 24, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 24, scale: 0.98 },
            transition: { duration: 0.2 },
            className: "w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-xl",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative overflow-hidden border-b border-border/40 bg-primary/10 p-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.img,
                  {
                    src: DOCTOR_IMAGE,
                    alt: "",
                    "aria-hidden": "true",
                    initial: { y: 10, opacity: 0 },
                    animate: { y: 0, opacity: 1 },
                    transition: { duration: 0.28 },
                    className: "pointer-events-none absolute -bottom-8 right-10 hidden h-40 w-32 object-contain object-bottom opacity-90 drop-shadow-[0_18px_28px_rgba(0,0,0,0.25)] sm:block"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative grid size-14 place-items-center overflow-hidden rounded-2xl border border-primary/25 bg-background/45 text-primary shadow-inner", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: DOCTOR_IMAGE, alt: "", className: "h-16 w-14 object-contain object-top" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-[9px] font-black text-primary", children: "Rx" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold uppercase tracking-[0.2em] text-primary", children: "Dr. Hakim" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-black leading-tight", children: guide.label }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: guide.role })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: () => setTutorialOpen(false),
                      className: "rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      "aria-label": "Close tutorial",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "size-4" })
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  motion.div,
                  {
                    initial: { opacity: 0, x: 14 },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: -14 },
                    transition: { duration: 0.18 },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "rounded-full bg-primary/15 px-2 py-0.5 text-primary", children: [
                          "Step ",
                          step + 1,
                          "/",
                          guide.steps.length
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Guided tutorial" })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-xl font-bold", children: current.title }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm leading-relaxed text-muted-foreground", children: current.body })
                    ]
                  },
                  `${guide.key}-${step}`
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 flex gap-1.5", children: guide.steps.map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-2 bg-border"}` }, i)) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: markDone,
                        className: "rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
                        children: "Skip"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: skipAll,
                        className: "rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
                        children: "Skip all"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        disabled: step === 0,
                        onClick: () => setStep((n) => Math.max(0, n - 1)),
                        className: "inline-flex items-center gap-1 rounded-full border border-border/50 px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-40",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "size-4" }),
                          " Back"
                        ]
                      }
                    ),
                    isLast ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: markDone,
                        className: "inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "size-4" }),
                          " Finish"
                        ]
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => setStep((n) => Math.min(guide.steps.length - 1, n + 1)),
                        className: "inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110",
                        children: [
                          "Next ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "size-4" })
                        ]
                      }
                    )
                  ] })
                ] })
              ] })
            ]
          }
        )
      }
    ) })
  ] });
}
async function loadProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}
async function bumpStreak(profile) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (profile.last_active === today) return profile;
  const last = profile.last_active ? new Date(profile.last_active) : null;
  const yesterday = /* @__PURE__ */ new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const newStreak = last && profile.last_active === yStr ? profile.streak_days + 1 : 1;
  const { data } = await supabase.from("profiles").update({ streak_days: newStreak, last_active: today }).eq("user_id", profile.user_id).select("*").maybeSingle();
  return data ?? profile;
}
function useInitAuth() {
  const { setSession, setProfile, setLoading } = useAuthStore();
  reactExports.useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        setTimeout(async () => {
          const p = await loadProfile(session.user.id);
          if (!mounted) return;
          if (p) {
            const bumped = await bumpStreak(p);
            if (mounted) setProfile(bumped);
          } else {
            setProfile(null);
          }
        }, 0);
      } else {
        setProfile(null);
      }
      if (event === "INITIAL_SESSION") setLoading(false);
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const p = await loadProfile(session.user.id);
        if (!mounted) return;
        if (p) {
          const bumped = await bumpStreak(p);
          if (mounted) setProfile(bumped);
        }
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setLoading]);
}
function NotFoundComponent() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-7xl font-bold text-gradient-teal", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  reactExports.useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold tracking-tight text-foreground", children: "Something went wrong" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Try refreshing or head back home." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/10",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const Route$j = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pharmulation - Train Like a Real Pharmacist" },
      { name: "description", content: "Browser-based pharmacy training simulator. Real prescriptions, OTC, clinical, oncology, cosmetics and emergency cases." },
      { property: "og:title", content: "Pharmulation - Train Like a Real Pharmacist" },
      { property: "og:description", content: "Browser-based pharmacy training simulator. Real prescriptions, OTC, clinical, oncology, cosmetics and emergency cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Pharmulation - Train Like a Real Pharmacist" },
      { name: "twitter:description", content: "Browser-based pharmacy training simulator. Real prescriptions, OTC, clinical, oncology, cosmetics and emergency cases." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ad21e273-1c51-419d-9dc8-989c38b350ef/id-preview-308e8334--a89de76e-398b-4993-be82-7ff82fc0f1af.lovable.app-1781339392769.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ad21e273-1c51-419d-9dc8-989c38b350ef/id-preview-308e8334--a89de76e-398b-4993-be82-7ff82fc0f1af.lovable.app-1781339392769.png" }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { lang: "en", className: "dark", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
function AuthBootstrap() {
  useInitAuth();
  return null;
}
function RootComponent() {
  const { queryClient } = Route$j.useRouteContext();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AuthBootstrap, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TutorialBot, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toaster, { position: "top-right", theme: "dark", richColors: true })
  ] });
}
const $$splitComponentImporter$h = () => import("./signup-_bmOtXaL.mjs");
const Route$i = createFileRoute("/signup")({
  head: () => ({
    meta: [{
      title: "Sign up - Pharmulation"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("./login-DZ_WPfJ6.mjs");
const Route$h = createFileRoute("/login")({
  head: () => ({
    meta: [{
      title: "Sign in - Pharmulation"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./leaderboard-5MEKBgc3.mjs");
const Route$g = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [{
      title: "Leaderboard - PharmaVerse"
    }, {
      name: "description",
      content: "Top pharmacists on PharmaVerse."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./route-BFsOu0JM.mjs");
const Route$f = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const {
      data,
      error
    } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login"
      });
    }
    return {
      user: data.user
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
function PillBackground() {
  const pills = Array.from({ length: 14 });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pointer-events-none absolute inset-0 overflow-hidden", children: pills.map((_, i) => {
    const left = i * 73 % 100;
    const top = i * 41 % 100;
    const delay = i % 7 * 0.8;
    const size = 18 + i % 5 * 6;
    const hue = i % 3 === 0 ? "180" : i % 3 === 1 ? "190" : "200";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "floating-pill absolute rounded-full",
        style: {
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size / 2,
          background: `linear-gradient(90deg, oklch(0.75 0.14 ${hue}) 50%, oklch(0.95 0.02 240) 50%)`,
          boxShadow: `0 0 20px oklch(0.74 0.14 ${hue} / 0.4)`,
          animationDelay: `${delay}s`
        }
      },
      i
    );
  }) });
}
function LogoVideo({ className = "" }) {
  const [isLooping, setIsLooping] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `inline-flex items-center ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "video",
      {
        "aria-hidden": "true",
        autoPlay: true,
        loop: isLooping,
        muted: true,
        playsInline: true,
        poster: "/logo-poster.png",
        preload: "auto",
        onEnded: () => setIsLooping(true),
        className: "h-full w-full object-contain",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("source", { src: isLooping ? "/logo-loop.webm" : "/logo.webm", type: "video/webm" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("source", { src: "/logo.mp4", type: "video/mp4" })
        ]
      },
      isLooping ? "logo-loop" : "logo-reveal"
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Pharmulation" })
  ] });
}
const Route$e = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pharmulation — Train Like a Real Pharmacist" },
      { name: "description", content: "Interactive web-based pharmacy training simulator with real-world cases across Community, clinical, oncology, and emergencies." },
      { property: "og:title", content: "Pharmulation" },
      { property: "og:description", content: "Train Like a Real Pharmacist. Anywhere. Anytime." }
    ]
  }),
  component: Landing
});
const modes = [
  {
    icon: Pill,
    name: "Community",
    desc: "Minor ailments, OTC guidance & medication counseling."
  },
  {
    icon: Boxes,
    name: "Warehousing",
    desc: "Inventory management, cold chain & medicine distribution."
  },
  {
    icon: Siren,
    name: "Emergency",
    desc: "Anaphylaxis, overdose & life-or-death decisions."
  },
  {
    icon: Factory,
    name: "Industry",
    desc: "Drug manufacturing, quality control & regulatory compliance."
  }
];
const stats = [
  { icon: GraduationCap, value: "70,000+", label: "Pharmacists Trained" },
  { icon: Database, value: "500+", label: "Drug Database" },
  { icon: Trophy, value: "4", label: "Training Modes" },
  { icon: TrendingUp, value: "100", label: "CPD Credit Hours" }
];
const testimonials = [
  { name: "Dr. Layla H.", role: "PharmD, Cairo", quote: "Pharmulation is the closest thing to real pharmacy I've found online. The oncology cases are brilliant." },
  { name: "Omar K.", role: "Pharmacy student, Year 4", quote: "I went from terrified of prescriptions to confident in 3 weeks. The mentor tips are gold." },
  { name: "Sara M.", role: "Clinical pharmacist", quote: "Finally a CE platform that doesn't put me to sleep. The streaks keep me coming back daily." }
];
function Landing() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "relative min-h-screen overflow-x-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[92vh] sm:px-6 sm:py-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PillBackground, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6 },
          className: "relative z-10 w-full max-w-4xl",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-3 inline-flex max-w-[92vw] items-center gap-2 rounded-full glass px-3 py-1.5 text-[10px] font-medium text-primary sm:mb-6 sm:px-4 sm:text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary animate-pulse" }),
              "Built by pharmacists, for pharmacists"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "relative z-10 mx-auto -mt-2 -mb-8 flex justify-center sm:-mt-10 sm:-mb-28 md:-mb-36", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogoVideo, { className: "aspect-video w-[min(116vw,420px)] sm:w-[min(98vw,860px)]" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hero-copy-layer relative z-30 mx-auto max-w-3xl pt-2 sm:pt-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hero-dust-field", "aria-hidden": "true" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "relative z-10 mx-auto mt-0 max-w-[19rem] text-[1.05rem] font-medium leading-snug text-foreground/90 sm:max-w-none sm:text-xl md:text-2xl", children: [
                "Train Like a Real Pharmacist. ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: "Anywhere." }),
                " Anytime."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "relative z-10 mx-auto mt-3 max-w-[21rem] text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:max-w-2xl sm:text-base", children: "Four immersive training modes. 500+ drug entries. Real prescriptions, real patients, real consequences - without the risk." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative z-10 mt-7 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "w-44 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.74_0.14_180/0.6)] transition hover:scale-[1.03] sm:w-auto sm:px-8 sm:py-3.5 sm:text-base", children: "Start Training" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/leaderboard", className: "w-44 rounded-full border border-border glass px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base", children: "View Leaderboard" })
              ] })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-6 py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4", children: stats.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { delay: i * 0.08 },
        className: "glass-card p-6 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(s.icon, { className: "mx-auto mb-2 h-6 w-6 text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl md:text-3xl font-bold text-foreground", children: s.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xs text-muted-foreground", children: s.label })
        ]
      },
      s.label
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-6 py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl md:text-4xl font-bold", children: "Four worlds. One pharmacist." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-muted-foreground", children: "Every mode is built around real-world clinical situations." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-5", children: modes.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { delay: i * 0.06 },
          className: "glass-card p-6 group hover:border-primary/40 transition",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary group-hover:scale-110 transition", children: /* @__PURE__ */ jsxRuntimeExports.jsx(m.icon, { className: "h-6 w-6" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold", children: m.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: m.desc })
          ]
        },
        m.name
      )) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-6 py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-center text-3xl md:text-4xl font-bold mb-12", children: "Loved by pharmacists worldwide" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid md:grid-cols-3 gap-5", children: testimonials.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "glass-card p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 mb-3", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: "h-4 w-4 fill-primary text-primary" }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-foreground/90 italic", children: [
          '"',
          t.quote,
          '"'
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: t.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground text-xs", children: t.role })
        ] })
      ] }, t.name)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "px-6 py-20", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl glass-card p-10 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold", children: "Your first case is waiting." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-muted-foreground", children: "Free to start. No credit card. Earn CPD as you play." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "mt-6 inline-block rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground hover:scale-[1.03] transition", children: "Create my account" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "border-t border-border px-6 py-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-foreground", children: "Pharmulation" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/login", className: "hover:text-primary", children: "Sign in" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/leaderboard", className: "hover:text-primary", children: "Leaderboard" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "hover:text-primary", children: "Privacy" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "hover:text-primary", children: "Contact" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Pharmulation"
      ] })
    ] }) })
  ] });
}
const $$splitComponentImporter$d = () => import("./auth.callback-BFwnNBjM.mjs");
const Route$d = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{
      title: "Signing in - Pharmulation"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./settings-DruD6FCZ.mjs");
const Route$c = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{
      title: "Settings — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./profile-C8f5tcOZ.mjs");
const Route$b = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{
      title: "Profile — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitNotFoundComponentImporter$8 = () => import("./modes-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$8 = () => import("./modes-CqlNFt5g.mjs");
const $$splitComponentImporter$a = () => import("./modes-CdV4Le3N.mjs");
const Route$a = createFileRoute("/_authenticated/modes")({
  head: () => ({
    meta: [{
      title: "Training Modes - PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$a, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$8, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$8, "notFoundComponent")
});
const $$splitComponentImporter$9 = () => import("./drugs-3wpLcc9h.mjs");
const Route$9 = createFileRoute("/_authenticated/drugs")({
  head: () => ({
    meta: [{
      title: "Drug Database — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitNotFoundComponentImporter$7 = () => import("./dashboard-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$7 = () => import("./dashboard-CqlNFt5g.mjs");
const $$splitComponentImporter$8 = () => import("./dashboard-D7xZJiPp.mjs");
const Route$8 = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{
      title: "Dashboard - Pharmulation"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$7, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$7, "notFoundComponent")
});
const $$splitComponentImporter$7 = () => import("./admin-BrMq1tBu.mjs");
const Route$7 = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{
      title: "Admin — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitNotFoundComponentImporter$6 = () => import("./game.warehousing-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$6 = () => import("./game.warehousing-CqlNFt5g.mjs");
const $$splitComponentImporter$6 = () => import("./game.warehousing-D60I0xfA.mjs");
const Route$6 = createFileRoute("/_authenticated/game/warehousing")({
  head: () => ({
    meta: [{
      title: "Warehousing — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$6, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$6, "notFoundComponent")
});
const $$splitNotFoundComponentImporter$5 = () => import("./game.rx-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$5 = () => import("./game.rx-CqlNFt5g.mjs");
const $$splitComponentImporter$5 = () => import("./game.rx-CsFHcqaB.mjs");
const Route$5 = createFileRoute("/_authenticated/game/rx")({
  head: () => ({
    meta: [{
      title: "Rx Cases — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$5, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$5, "notFoundComponent")
});
const $$splitNotFoundComponentImporter$4 = () => import("./game.otc-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$4 = () => import("./game.otc-CqlNFt5g.mjs");
const $$splitComponentImporter$4 = () => import("./game.otc-BL5W7vf_.mjs");
const Route$4 = createFileRoute("/_authenticated/game/otc")({
  head: () => ({
    meta: [{
      title: "OTC Consultation — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$4, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$4, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$4, "notFoundComponent")
});
const $$splitNotFoundComponentImporter$3 = () => import("./game.industry-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$3 = () => import("./game.industry-CqlNFt5g.mjs");
const $$splitComponentImporter$3 = () => import("./game.industry-fweQI5zg.mjs");
const Route$3 = createFileRoute("/_authenticated/game/industry")({
  head: () => ({
    meta: [{
      title: "Industry - PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$3, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$3, "notFoundComponent")
});
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = reactExports.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const $$splitNotFoundComponentImporter$2 = () => import("./game.hospital-BR9PDLuy.mjs");
const $$splitErrorComponentImporter$2 = () => import("./game.hospital-CFGVukUT.mjs");
const $$splitComponentImporter$2 = () => import("./game.hospital-DaYML1yZ.mjs");
const Route$2 = createFileRoute("/_authenticated/game/hospital")({
  head: () => ({
    meta: [{
      title: "Clinical - PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$2, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$2, "notFoundComponent")
});
const $$splitNotFoundComponentImporter$1 = () => import("./game.emergency-cKqJa9j4.mjs");
const $$splitErrorComponentImporter$1 = () => import("./game.emergency-CqlNFt5g.mjs");
const $$splitComponentImporter$1 = () => import("./game.emergency-A4KmJ15W.mjs");
const Route$1 = createFileRoute("/_authenticated/game/emergency")({
  head: () => ({
    meta: [{
      title: "Emergency — PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter$1, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter$1, "notFoundComponent")
});
const $$splitNotFoundComponentImporter = () => import("./game.community-cKqJa9j4.mjs");
const $$splitErrorComponentImporter = () => import("./game.community-CqlNFt5g.mjs");
const $$splitComponentImporter = () => import("./game.community-Bv7pWUSW.mjs");
const Route = createFileRoute("/_authenticated/game/community")({
  head: () => ({
    meta: [{
      title: "Community Pharmacy - PharmaVerse"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component"),
  errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
  notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
const SignupRoute = Route$i.update({
  id: "/signup",
  path: "/signup",
  getParentRoute: () => Route$j
});
const LoginRoute = Route$h.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$j
});
const LeaderboardRoute = Route$g.update({
  id: "/leaderboard",
  path: "/leaderboard",
  getParentRoute: () => Route$j
});
const AuthenticatedRouteRoute = Route$f.update({
  id: "/_authenticated",
  getParentRoute: () => Route$j
});
const IndexRoute = Route$e.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$j
});
const AuthCallbackRoute = Route$d.update({
  id: "/auth/callback",
  path: "/auth/callback",
  getParentRoute: () => Route$j
});
const AuthenticatedSettingsRoute = Route$c.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedProfileRoute = Route$b.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedModesRoute = Route$a.update({
  id: "/modes",
  path: "/modes",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedDrugsRoute = Route$9.update({
  id: "/drugs",
  path: "/drugs",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedDashboardRoute = Route$8.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedAdminRoute = Route$7.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameWarehousingRoute = Route$6.update({
  id: "/game/warehousing",
  path: "/game/warehousing",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameRxRoute = Route$5.update({
  id: "/game/rx",
  path: "/game/rx",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameOtcRoute = Route$4.update({
  id: "/game/otc",
  path: "/game/otc",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameIndustryRoute = Route$3.update({
  id: "/game/industry",
  path: "/game/industry",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameHospitalRoute = Route$2.update({
  id: "/game/hospital",
  path: "/game/hospital",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameEmergencyRoute = Route$1.update({
  id: "/game/emergency",
  path: "/game/emergency",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedGameCommunityRoute = Route.update({
  id: "/game/community",
  path: "/game/community",
  getParentRoute: () => AuthenticatedRouteRoute
});
const AuthenticatedRouteRouteChildren = {
  AuthenticatedAdminRoute,
  AuthenticatedDashboardRoute,
  AuthenticatedDrugsRoute,
  AuthenticatedModesRoute,
  AuthenticatedProfileRoute,
  AuthenticatedSettingsRoute,
  AuthenticatedGameCommunityRoute,
  AuthenticatedGameEmergencyRoute,
  AuthenticatedGameHospitalRoute,
  AuthenticatedGameIndustryRoute,
  AuthenticatedGameOtcRoute,
  AuthenticatedGameRxRoute,
  AuthenticatedGameWarehousingRoute
};
const AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  LeaderboardRoute,
  LoginRoute,
  SignupRoute,
  AuthCallbackRoute
};
const routeTree = Route$j._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Button as B,
  LogoVideo as L,
  useActiveCaseStore as a,
  router as r,
  useAuthStore as u
};
